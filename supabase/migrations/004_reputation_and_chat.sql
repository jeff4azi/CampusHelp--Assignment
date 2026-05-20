-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1: REPUTATION SYSTEM + REAL-TIME CHAT + PROFILE IMPROVEMENTS
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. EXTEND PROFILES TABLE ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists university text,
  add column if not exists department text,
  add column if not exists level_name text default 'Newbie',
  add column if not exists trust_score numeric(5,2) default 0,
  add column if not exists completed_jobs integer default 0,
  add column if not exists completion_rate numeric(5,2) default 0,
  add column if not exists total_earnings numeric(10,2) default 0,
  add column if not exists badges text[] default '{}',
  add column if not exists is_verified boolean default false,
  add column if not exists response_time_avg integer default 0, -- minutes
  add column if not exists last_active_at timestamptz default now();

-- ── 2. REAL-TIME CHAT MESSAGES TABLE ─────────────────────────────────────
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.work_sessions(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  content     text,
  type        text not null default 'text'
                check (type in ('text', 'file', 'image', 'system')),
  file_url    text,
  file_name   text,
  file_size   integer,
  read_by     uuid[] default '{}',
  created_at  timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz
);

create index if not exists chat_messages_session_idx on public.chat_messages(session_id);
create index if not exists chat_messages_sender_idx  on public.chat_messages(sender_id);
create index if not exists chat_messages_created_idx on public.chat_messages(created_at desc);

-- ── 3. ONLINE PRESENCE TABLE ─────────────────────────────────────────────
create table if not exists public.user_presence (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  is_online   boolean default false,
  last_seen   timestamptz default now()
);

-- ── 4. RLS FOR CHAT ───────────────────────────────────────────────────────
alter table public.chat_messages enable row level security;
alter table public.user_presence  enable row level security;

-- Chat: only session participants can read/write
create policy "chat_select" on public.chat_messages
  for select using (
    exists (
      select 1 from public.work_sessions
      where id = session_id
      and (owner_id = auth.uid() or helper_id = auth.uid())
    )
  );

create policy "chat_insert" on public.chat_messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.work_sessions
      where id = session_id
      and (owner_id = auth.uid() or helper_id = auth.uid())
    )
  );

create policy "chat_update" on public.chat_messages
  for update using (auth.uid() = sender_id);

-- Presence: anyone authenticated can read; users update their own
create policy "presence_select" on public.user_presence
  for select using (auth.role() = 'authenticated');

create policy "presence_upsert" on public.user_presence
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. FUNCTION: RECALCULATE HELPER REPUTATION ───────────────────────────
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
  -- Count completed jobs as helper
  select count(*) into v_completed_jobs
  from public.work_sessions
  where helper_id = p_user_id and status = 'completed';

  -- Count total jobs as helper
  select count(*) into v_total_jobs
  from public.work_sessions
  where helper_id = p_user_id;

  -- Completion rate
  v_completion_rate := case
    when v_total_jobs > 0 then (v_completed_jobs::numeric / v_total_jobs) * 100
    else 0
  end;

  -- Average rating
  select coalesce(avg(rating), 0) into v_avg_rating
  from public.reviews
  where reviewee_id = p_user_id;

  -- Total earnings
  select coalesce(sum(withdrawable_amount), 0) into v_total_earnings
  from public.payments
  where helper_id = p_user_id and status = 'available_for_withdrawal';

  -- Trust score (weighted formula)
  v_trust_score := (
    (v_avg_rating * 20) +                          -- 0-100 from rating
    (least(v_completed_jobs, 50) * 0.6) +          -- up to 30 from jobs
    (v_completion_rate * 0.2) +                    -- up to 20 from completion
    (least(v_total_earnings / 10000, 10) * 1.0)    -- up to 10 from earnings
  );
  v_trust_score := least(v_trust_score, 100);

  -- Level calculation
  v_level := case
    when v_completed_jobs >= 50 and v_avg_rating >= 4.5 and v_completion_rate >= 90 then 'Elite Tutor'
    when v_completed_jobs >= 20 and v_avg_rating >= 4.0 and v_completion_rate >= 80 then 'Top Helper'
    when v_completed_jobs >= 5  and v_avg_rating >= 3.5 then 'Verified Helper'
    else 'Newbie'
  end;

  -- Badges
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

  -- Update profile
  update public.profiles set
    completed_jobs   = v_completed_jobs,
    completion_rate  = v_completion_rate,
    total_earnings   = v_total_earnings,
    rating           = v_avg_rating,
    trust_score      = v_trust_score,
    level_name       = v_level,
    badges           = v_badges
  where id = p_user_id;
end;
$$;

-- ── 6. TRIGGER: RECALCULATE ON SESSION COMPLETE ───────────────────────────
create or replace function public.trigger_reputation_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  for each row
  execute function public.trigger_reputation_update();

-- ── 7. TRIGGER: RECALCULATE ON REVIEW ────────────────────────────────────
create or replace function public.trigger_reputation_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_reputation(NEW.reviewee_id);
  return NEW;
end;
$$;

drop trigger if exists on_review_reputation on public.reviews;
create trigger on_review_reputation
  after insert on public.reviews
  for each row
  execute function public.trigger_reputation_on_review();

-- ── 8. INDEXES ────────────────────────────────────────────────────────────
create index if not exists profiles_level_idx       on public.profiles(level_name);
create index if not exists profiles_trust_score_idx on public.profiles(trust_score desc);
create index if not exists profiles_completed_idx   on public.profiles(completed_jobs desc);

-- ═══════════════════════════════════════════════════════════════════════════
