-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 007: Ensure all reputation columns exist on profiles
-- Safe to re-run (all idempotent)
-- ═══════════════════════════════════════════════════════════════════════════

-- Core reputation columns (from migration 001)
alter table public.profiles
  add column if not exists rating          numeric(3,2) default 0 check (rating >= 0 and rating <= 5),
  add column if not exists total_reviews   integer default 0,
  add column if not exists bio             text,
  add column if not exists skills          text[],
  add column if not exists is_admin        boolean default false,
  add column if not exists is_suspended    boolean default false;

-- Extended reputation columns (from migration 004)
alter table public.profiles
  add column if not exists university       text,
  add column if not exists department       text,
  add column if not exists level_name       text default 'Newbie',
  add column if not exists trust_score      numeric(5,2) default 0,
  add column if not exists completed_jobs   integer default 0,
  add column if not exists completion_rate  numeric(5,2) default 0,
  add column if not exists total_earnings   numeric(10,2) default 0,
  add column if not exists badges           text[] default '{}',
  add column if not exists is_verified      boolean default false,
  add column if not exists response_time_avg integer default 0,
  add column if not exists last_active_at   timestamptz default now();

-- Ensure reviews table exists with correct structure
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.work_sessions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating      integer not null check (rating >= 1 and rating <= 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (session_id, reviewer_id)
);

-- RLS on reviews
alter table public.reviews enable row level security;

-- Drop and recreate to ensure correct policies
drop policy if exists "reviews_select" on public.reviews;
drop policy if exists "reviews_insert" on public.reviews;

create policy "reviews_select" on public.reviews
  for select using (auth.role() = 'authenticated');

create policy "reviews_insert" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id and
    exists (
      select 1 from public.work_sessions
      where id = reviews.session_id
        and (owner_id = auth.uid() or helper_id = auth.uid())
    )
  );

-- Indexes
create index if not exists reviews_reviewee_id_idx on public.reviews(reviewee_id);
create index if not exists reviews_session_id_idx  on public.reviews(session_id);
create index if not exists profiles_rating_idx     on public.profiles(rating desc);
create index if not exists profiles_level_idx      on public.profiles(level_name);
create index if not exists profiles_trust_idx      on public.profiles(trust_score desc);

-- Ensure recalculate_reputation function exists (idempotent)
create or replace function public.recalculate_reputation(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed_jobs    integer;
  v_total_jobs        integer;
  v_completion_rate   numeric;
  v_avg_rating        numeric;
  v_total_earnings    numeric;
  v_trust_score       numeric;
  v_level             text;
  v_badges            text[];
begin
  select count(*) into v_completed_jobs
  from public.work_sessions
  where helper_id = p_user_id and status = 'completed';

  select count(*) into v_total_jobs
  from public.work_sessions
  where helper_id = p_user_id;

  v_completion_rate := case
    when v_total_jobs > 0 then (v_completed_jobs::numeric / v_total_jobs) * 100
    else 0
  end;

  select coalesce(avg(rating), 0) into v_avg_rating
  from public.reviews
  where reviewee_id = p_user_id;

  select coalesce(sum(withdrawable_amount), 0) into v_total_earnings
  from public.payments
  where helper_id = p_user_id and status = 'available_for_withdrawal';

  v_trust_score := (
    (v_avg_rating * 20) +
    (least(v_completed_jobs, 50) * 0.6) +
    (v_completion_rate * 0.2) +
    (least(v_total_earnings / 10000, 10) * 1.0)
  );
  v_trust_score := least(v_trust_score, 100);

  v_level := case
    when v_completed_jobs >= 50 and v_avg_rating >= 4.5 and v_completion_rate >= 90 then 'Elite Tutor'
    when v_completed_jobs >= 20 and v_avg_rating >= 4.0 and v_completion_rate >= 80 then 'Top Helper'
    when v_completed_jobs >= 5  and v_avg_rating >= 3.5 then 'Verified Helper'
    else 'Newbie'
  end;

  v_badges := '{}';
  if v_avg_rating >= 4.8 and v_completed_jobs >= 10 then
    v_badges := array_append(v_badges, 'top_rated');
  end if;
  if v_completion_rate = 100 and v_completed_jobs >= 3 then
    v_badges := array_append(v_badges, 'perfect_completion');
  end if;
  if v_completed_jobs >= 100 then
    v_badges := array_append(v_badges, 'century_club');
  end if;
  if v_total_earnings >= 100000 then
    v_badges := array_append(v_badges, 'top_earner');
  end if;

  update public.profiles set
    completed_jobs  = v_completed_jobs,
    completion_rate = v_completion_rate,
    total_earnings  = v_total_earnings,
    rating          = v_avg_rating,
    total_reviews   = (select count(*) from public.reviews where reviewee_id = p_user_id),
    trust_score     = v_trust_score,
    level_name      = v_level,
    badges          = v_badges
  where id = p_user_id;
end;
$$;

-- Trigger: recalculate on session complete
create or replace function public.trigger_reputation_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'completed' and OLD.status != 'completed' then
    perform public.recalculate_reputation(NEW.helper_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_session_completed_reputation on public.work_sessions;
create trigger on_session_completed_reputation
  after update on public.work_sessions
  for each row execute function public.trigger_reputation_update();

-- Trigger: recalculate on review insert
create or replace function public.trigger_reputation_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalculate_reputation(NEW.reviewee_id);
  return NEW;
end;
$$;

drop trigger if exists on_review_reputation on public.reviews;
create trigger on_review_reputation
  after insert on public.reviews
  for each row execute function public.trigger_reputation_on_review();

-- ═══════════════════════════════════════════════════════════════════════════
