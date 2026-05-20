-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 008: ESCROW PAYMENT SYSTEM
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ADD ESCROW STATUS TO PAYMENTS ─────────────────────────────────────
-- escrow_status tracks the lifecycle of held funds:
--   held                → payment received, funds locked until completion
--   released            → session completed, funds available to helper
--   disputed            → dispute raised, funds frozen
--   refunded            → funds returned to student
alter table public.payments
  add column if not exists escrow_status text default 'held'
    check (escrow_status in ('held', 'released', 'disputed', 'refunded')),
  add column if not exists escrow_released_at timestamptz,
  add column if not exists escrow_disputed_at timestamptz;

-- Back-fill existing payments: if status = available_for_withdrawal → released
update public.payments
  set escrow_status = 'released'
  where status = 'available_for_withdrawal'
    and escrow_status = 'held';

-- ── 2. CREATE DISPUTES TABLE ──────────────────────────────────────────────
create table if not exists public.disputes (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.work_sessions(id) on delete cascade,
  raised_by     uuid not null references auth.users(id) on delete cascade,
  reason        text not null,
  description   text,
  evidence_urls text[],
  status        text not null default 'open'
    check (status in ('open', 'under_review', 'resolved_helper', 'resolved_student', 'closed')),
  resolution    text,
  resolved_by   uuid references auth.users(id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists disputes_session_idx   on public.disputes(session_id);
create index if not exists disputes_raised_by_idx on public.disputes(raised_by);
create index if not exists disputes_status_idx    on public.disputes(status);

alter table public.disputes enable row level security;

create policy "disputes_select" on public.disputes
  for select using (
    auth.uid() = raised_by or
    exists (
      select 1 from public.work_sessions ws
      where ws.id = disputes.session_id
        and (ws.owner_id = auth.uid() or ws.helper_id = auth.uid())
    ) or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "disputes_insert" on public.disputes
  for insert with check (
    auth.uid() = raised_by and
    exists (
      select 1 from public.work_sessions ws
      where ws.id = disputes.session_id
        and (ws.owner_id = auth.uid() or ws.helper_id = auth.uid())
    )
  );

create policy "disputes_update" on public.disputes
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ── 3. FUNCTION: RELEASE ESCROW (called on session completion) ────────────
create or replace function public.release_escrow(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set
    escrow_status       = 'released',
    escrow_released_at  = now(),
    status              = 'available_for_withdrawal',
    withdrawal_status   = 'pending',
    updated_at          = now()
  where session_id = p_session_id
    and escrow_status   = 'held';
end;
$$;

-- ── 4. FUNCTION: FREEZE ESCROW (called when dispute is raised) ────────────
create or replace function public.freeze_escrow(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set
    escrow_status       = 'disputed',
    escrow_disputed_at  = now(),
    updated_at          = now()
  where session_id = p_session_id
    and escrow_status in ('held', 'released');
end;
$$;

-- ── 5. FUNCTION: REFUND ESCROW (admin resolves in student's favour) ───────
create or replace function public.refund_escrow(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set
    escrow_status     = 'refunded',
    status            = 'refunded',
    withdrawal_status = 'failed',
    updated_at        = now()
  where session_id = p_session_id;
end;
$$;

-- ── 6. UPDATE complete_session_atomic TO RELEASE ESCROW ───────────────────
create or replace function public.complete_session_atomic(
  p_session_id uuid,
  p_user_id    uuid
)
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
  select * into v_session from public.work_sessions where id = p_session_id;
  if not found then raise exception 'Session not found'; end if;

  if v_session.owner_id != p_user_id and v_session.helper_id != p_user_id then
    raise exception 'Unauthorized';
  end if;

  if v_session.status = 'completed' then
    return jsonb_build_object('success', true, 'message', 'Already completed');
  end if;

  -- Check no active dispute
  if exists (
    select 1 from public.disputes
    where session_id = p_session_id and status in ('open', 'under_review')
  ) then
    raise exception 'Cannot complete session with an active dispute';
  end if;

  -- 1. Update session
  update public.work_sessions set status = 'completed' where id = p_session_id;

  -- 2. Update post
  update public.posts set status = 'completed' where id = v_session.post_id;

  -- 3. Release escrow → funds available to helper
  select * into v_payment from public.payments where session_id = p_session_id limit 1;

  if found then
    v_helper_share := v_payment.amount - v_payment.platform_fee;

    update public.payments set
      status              = 'available_for_withdrawal',
      escrow_status       = 'released',
      escrow_released_at  = now(),
      withdrawable_amount = v_helper_share,
      helper_id           = v_session.helper_id,
      withdrawal_status   = 'pending',
      updated_at          = now()
    where session_id = p_session_id;
  end if;

  return jsonb_build_object(
    'success',            true,
    'session_id',         p_session_id,
    'post_id',            v_session.post_id,
    'helper_id',          v_session.helper_id,
    'withdrawable_amount', coalesce(v_helper_share, 0)
  );
end;
$$;

-- ── 7. TRIGGER: freeze escrow when dispute is raised ──────────────────────
create or replace function public.trigger_freeze_on_dispute()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.freeze_escrow(NEW.session_id);
  return NEW;
end;
$$;

drop trigger if exists on_dispute_created on public.disputes;
create trigger on_dispute_created
  after insert on public.disputes
  for each row
  execute function public.trigger_freeze_on_dispute();

-- ── 8. TRIGGER: notify both parties when dispute is raised ────────────────
create or replace function public.notify_dispute_raised()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_other_id uuid;
begin
  select * into v_session from public.work_sessions where id = NEW.session_id;

  -- Notify the other party
  v_other_id := case
    when v_session.owner_id = NEW.raised_by then v_session.helper_id
    else v_session.owner_id
  end;

  insert into public.notifications (user_id, type, title, body, ref_id)
  values (
    v_other_id,
    'dispute_raised',
    'A dispute has been raised ⚠️',
    'A dispute was opened on your session. Funds are frozen until it is resolved by our team.',
    NEW.session_id
  );

  -- Also notify the raiser
  insert into public.notifications (user_id, type, title, body, ref_id)
  values (
    NEW.raised_by,
    'dispute_raised',
    'Dispute submitted',
    'Your dispute has been received. Funds are frozen and our team will review within 48 hours.',
    NEW.session_id
  );

  return NEW;
end;
$$;

drop trigger if exists on_dispute_notify on public.disputes;
create trigger on_dispute_notify
  after insert on public.disputes
  for each row
  execute function public.notify_dispute_raised();

-- ── 9. VIEW: escrow_balances (helper's balance summary) ───────────────────
create or replace view public.escrow_balances as
select
  p.helper_id,
  coalesce(sum(case when p.escrow_status = 'held'     then p.withdrawable_amount else 0 end), 0) as held_amount,
  coalesce(sum(case when p.escrow_status = 'released' and p.withdrawal_status = 'pending'
                    then p.withdrawable_amount else 0 end), 0) as available_amount,
  coalesce(sum(case when p.withdrawal_status = 'completed' then p.withdrawable_amount else 0 end), 0) as withdrawn_amount,
  coalesce(sum(case when p.escrow_status = 'disputed' then p.withdrawable_amount else 0 end), 0) as disputed_amount,
  count(case when p.escrow_status = 'held'     then 1 end) as held_count,
  count(case when p.escrow_status = 'released' and p.withdrawal_status = 'pending' then 1 end) as available_count
from public.payments p
where p.helper_id is not null
group by p.helper_id;

-- ── 10. INDEXES ───────────────────────────────────────────────────────────
create index if not exists payments_escrow_status_idx on public.payments(escrow_status);
create index if not exists payments_helper_escrow_idx on public.payments(helper_id, escrow_status);

-- ═══════════════════════════════════════════════════════════════════════════
