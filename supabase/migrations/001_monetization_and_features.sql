-- ═══════════════════════════════════════════════════════════════════════════
-- MONETIZATION, ADMIN, RATINGS, TRUST & SAFETY - DATABASE MIGRATIONS
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. EXTEND PROFILES TABLE ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists bio text,
  add column if not exists skills text[], -- array of skill tags
  add column if not exists rating numeric(3,2) default 0 check (rating >= 0 and rating <= 5),
  add column if not exists total_reviews integer default 0,
  add column if not exists avatar_url text,
  add column if not exists is_admin boolean default false,
  add column if not exists is_suspended boolean default false;

-- ── 2. EXTEND WORK_SESSIONS TABLE (PAYMENT TRACKING) ──────────────────────
alter table public.work_sessions
  add column if not exists payment_status text default 'pending' 
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  add column if not exists amount numeric(10,2),
  add column if not exists platform_fee numeric(10,2),
  add column if not exists payment_reference text unique;

-- ── 3. CREATE PAYMENTS TABLE ──────────────────────────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.work_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  platform_fee numeric(10,2) not null check (platform_fee >= 0),
  payment_provider text not null default 'paystack',
  transaction_reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'refunded')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_session_id_idx on public.payments(session_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_created_at_idx on public.payments(created_at desc);

-- ── 4. CREATE REVIEWS TABLE ───────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.work_sessions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (session_id, reviewer_id) -- one review per user per session
);

create index if not exists reviews_session_id_idx on public.reviews(session_id);
create index if not exists reviews_reviewee_id_idx on public.reviews(reviewee_id);
create index if not exists reviews_created_at_idx on public.reviews(created_at desc);

-- ── 5. CREATE REPORTS TABLE (TRUST & SAFETY) ──────────────────────────────
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  reported_post_id uuid references public.posts(id) on delete cascade,
  type text not null check (type in ('user', 'post')),
  reason text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  check (
    (type = 'user' and reported_user_id is not null and reported_post_id is null) or
    (type = 'post' and reported_post_id is not null and reported_user_id is null)
  )
);

create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports(reported_user_id);
create index if not exists reports_reported_post_id_idx on public.reports(reported_post_id);
create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_created_at_idx on public.reports(created_at desc);

-- ── 6. ROW LEVEL SECURITY ─────────────────────────────────────────────────

-- Payments: users can read their own; authenticated can insert (system creates)
alter table public.payments enable row level security;

create policy "payments_select" on public.payments
  for select using (auth.uid() = user_id);

create policy "payments_insert" on public.payments
  for insert with check (auth.role() = 'authenticated');

create policy "payments_update" on public.payments
  for update using (auth.uid() = user_id);

-- Reviews: users can read all; can insert if they're part of the session
alter table public.reviews enable row level security;

create policy "reviews_select" on public.reviews
  for select using (auth.role() = 'authenticated');

create policy "reviews_insert" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id and
    exists (
      select 1 from public.work_sessions
      where id = session_id
      and (owner_id = auth.uid() or helper_id = auth.uid())
      and status = 'completed'
    )
  );

-- Reports: users can read their own reports; can insert their own
alter table public.reports enable row level security;

create policy "reports_select" on public.reports
  for select using (
    auth.uid() = reporter_id or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "reports_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "reports_update" on public.reports
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── 7. FUNCTION: UPDATE USER RATING AFTER REVIEW ──────────────────────────
create or replace function public.update_user_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Recalculate average rating and total reviews for the reviewee
  update public.profiles
  set
    rating = (
      select coalesce(avg(rating), 0)
      from public.reviews
      where reviewee_id = new.reviewee_id
    ),
    total_reviews = (
      select count(*)
      from public.reviews
      where reviewee_id = new.reviewee_id
    )
  where id = new.reviewee_id;
  
  return new;
end;
$$;

-- Trigger: update rating after review insert
drop trigger if exists on_review_created on public.reviews;
create trigger on_review_created
  after insert on public.reviews
  for each row
  execute function public.update_user_rating();

-- ── 8. ADMIN HELPER FUNCTIONS ─────────────────────────────────────────────

-- Function to get platform stats (admin only)
create or replace function public.get_platform_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  -- Check if user is admin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_posts', (select count(*) from public.posts),
    'active_sessions', (select count(*) from public.work_sessions where status = 'active'),
    'completed_sessions', (select count(*) from public.work_sessions where status = 'completed'),
    'total_revenue', (select coalesce(sum(platform_fee), 0) from public.payments where status = 'success'),
    'pending_reports', (select count(*) from public.reports where status = 'pending')
  ) into result;

  return result;
end;
$$;

-- ── 9. INDEXES FOR PERFORMANCE ────────────────────────────────────────────
create index if not exists profiles_rating_idx on public.profiles(rating desc);
create index if not exists profiles_is_admin_idx on public.profiles(is_admin) where is_admin = true;
create index if not exists profiles_is_suspended_idx on public.profiles(is_suspended) where is_suspended = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATIONS
-- ═══════════════════════════════════════════════════════════════════════════
