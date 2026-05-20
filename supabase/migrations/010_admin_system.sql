-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 010: DEDICATED ADMIN SYSTEM
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ADMIN USERS TABLE ─────────────────────────────────────────────────
-- Separate from profiles — only users in this table can access /admin/*
create table if not exists public.admin_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin'
    check (role in ('super_admin', 'admin', 'moderator', 'support')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.admin_users enable row level security;

-- Each admin can only read their own row (no recursive subquery)
create policy "admin_users_select" on public.admin_users
  for select using (auth.uid() = id);

-- Only super_admins can insert/update
create policy "admin_users_insert" on public.admin_users
  for insert with check (
    exists (select 1 from public.admin_users where id = auth.uid() and role = 'super_admin')
  );

create policy "admin_users_update" on public.admin_users
  for update using (
    exists (select 1 from public.admin_users where id = auth.uid() and role = 'super_admin')
  );

-- ── 2. ADMIN ACTIVITY LOG ─────────────────────────────────────────────────
create table if not exists public.admin_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id) on delete cascade,
  action      text not null,   -- 'suspend_user' | 'delete_post' | 'resolve_dispute' etc.
  target_type text,            -- 'user' | 'post' | 'session' | 'withdrawal' | 'dispute'
  target_id   uuid,
  notes       text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_logs_admin_idx  on public.admin_logs(admin_id);
create index if not exists admin_logs_created_idx on public.admin_logs(created_at desc);

alter table public.admin_logs enable row level security;

create policy "admin_logs_select" on public.admin_logs
  for select using (
    exists (select 1 from public.admin_users where id = auth.uid())
  );

create policy "admin_logs_insert" on public.admin_logs
  for insert with check (
    exists (select 1 from public.admin_users where id = auth.uid())
  );

-- ── 3. PLATFORM SETTINGS TABLE ───────────────────────────────────────────
create table if not exists public.platform_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.platform_settings enable row level security;

create policy "settings_select" on public.platform_settings
  for select using (
    exists (select 1 from public.admin_users where id = auth.uid())
  );

create policy "settings_upsert" on public.platform_settings
  for all using (
    exists (select 1 from public.admin_users where id = auth.uid()
      and role in ('super_admin', 'admin'))
  );

-- Seed default settings
insert into public.platform_settings (key, value) values
  ('platform_fee_percent', '20'),
  ('max_budget_ngn', '500000'),
  ('min_budget_ngn', '500'),
  ('dispute_review_hours', '48'),
  ('withdrawal_processing_hours', '24')
on conflict (key) do nothing;

-- ── 4. FUNCTION: ADMIN LOG HELPER ────────────────────────────────────────
create or replace function public.log_admin_action(
  p_action      text,
  p_target_type text default null,
  p_target_id   uuid default null,
  p_notes       text default null,
  p_metadata    jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_logs (admin_id, action, target_type, target_id, notes, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_notes, p_metadata);
end;
$$;

-- ── 5. FUNCTION: GET DAILY REVENUE (for charts) ───────────────────────────
create or replace function public.get_daily_revenue(p_days integer default 30)
returns table(day date, revenue numeric, transactions bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users where id = auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    date_trunc('day', created_at)::date as day,
    coalesce(sum(platform_fee), 0)      as revenue,
    count(*)                            as transactions
  from public.payments
  where status = 'success'
    and created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1;
end;
$$;

-- ── 6. FUNCTION: GET USER GROWTH (for charts) ─────────────────────────────
create or replace function public.get_user_growth(p_days integer default 30)
returns table(day date, new_users bigint, cumulative bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users where id = auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    date_trunc('day', created_at)::date as day,
    count(*)                            as new_users,
    sum(count(*)) over (order by date_trunc('day', created_at)) as cumulative
  from public.profiles
  where created_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1;
end;
$$;

-- ── 7. BOOTSTRAP: make yourself super_admin ───────────────────────────────
-- Run this manually after creating your account:
-- insert into public.admin_users (id, role)
-- values ('<your-auth-user-id>', 'super_admin');

-- ═══════════════════════════════════════════════════════════════════════════
