-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION FLOW FIX + EARNINGS/WITHDRAWAL SYSTEM
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ADD WITHDRAWAL FIELDS TO PAYMENTS TABLE ────────────────────────────
alter table public.payments
  add column if not exists helper_id uuid references auth.users(id),
  add column if not exists withdrawable_amount numeric(10,2),
  add column if not exists withdrawal_status text default 'pending'
    check (withdrawal_status in ('pending', 'processing', 'completed', 'failed')),
  add column if not exists withdrawn_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- ── 2. CREATE WITHDRAWALS TABLE ───────────────────────────────────────────
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  payment_ids uuid[], -- array of payment ids being withdrawn
  bank_details jsonb, -- bank name, account number, account name
  admin_notes text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id)
);

create index if not exists withdrawals_helper_id_idx on public.withdrawals(helper_id);
create index if not exists withdrawals_status_idx on public.withdrawals(status);
create index if not exists withdrawals_created_at_idx on public.withdrawals(created_at desc);

-- ── 3. RLS FOR WITHDRAWALS ────────────────────────────────────────────────
alter table public.withdrawals enable row level security;

create policy "withdrawals_select" on public.withdrawals
  for select using (
    auth.uid() = helper_id or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "withdrawals_insert" on public.withdrawals
  for insert with check (auth.uid() = helper_id);

create policy "withdrawals_update" on public.withdrawals
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── 4. UPDATE PAYMENTS RLS TO ALLOW HELPER TO READ THEIR OWN ─────────────
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select using (
    auth.uid() = user_id or
    auth.uid() = helper_id or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── 5. FUNCTION: COMPLETE SESSION ATOMICALLY ─────────────────────────────
-- This ensures post, session, and payment all update together
create or replace function public.complete_session_atomic(p_session_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_payment record;
  v_helper_share numeric;
begin
  -- Get session
  select * into v_session from public.work_sessions where id = p_session_id;
  
  if not found then
    raise exception 'Session not found';
  end if;
  
  -- Only owner or helper can complete
  if v_session.owner_id != p_user_id and v_session.helper_id != p_user_id then
    raise exception 'Unauthorized';
  end if;
  
  -- Prevent double completion
  if v_session.status = 'completed' then
    return jsonb_build_object('success', true, 'message', 'Already completed');
  end if;
  
  -- 1. Update work_session
  update public.work_sessions
  set status = 'completed'
  where id = p_session_id;
  
  -- 2. Update post status to completed
  update public.posts
  set status = 'completed'
  where id = v_session.post_id;
  
  -- 3. Update payment to available_for_withdrawal
  select * into v_payment from public.payments where session_id = p_session_id limit 1;
  
  if found then
    v_helper_share := v_payment.amount - v_payment.platform_fee;
    
    update public.payments
    set 
      status = 'available_for_withdrawal',
      withdrawable_amount = v_helper_share,
      helper_id = v_session.helper_id,
      updated_at = now()
    where session_id = p_session_id;
  end if;
  
  return jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'post_id', v_session.post_id,
    'helper_id', v_session.helper_id,
    'withdrawable_amount', coalesce(v_helper_share, 0)
  );
end;
$$;

-- ── 6. INDEXES ────────────────────────────────────────────────────────────
create index if not exists payments_helper_id_idx on public.payments(helper_id);
create index if not exists payments_withdrawal_status_idx on public.payments(withdrawal_status);

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATIONS
-- ═══════════════════════════════════════════════════════════════════════════
