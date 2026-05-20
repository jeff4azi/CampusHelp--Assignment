-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 009: DISPUTE EVIDENCE + ADMIN RESOLUTION TOOLS
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. DISPUTE EVIDENCE TABLE ─────────────────────────────────────────────
-- Stores file references for evidence uploaded to a dispute
create table if not exists public.dispute_evidence (
  id           uuid primary key default gen_random_uuid(),
  dispute_id   uuid not null references public.disputes(id) on delete cascade,
  uploaded_by  uuid not null references auth.users(id) on delete cascade,
  file_url     text not null,
  file_name    text not null,
  file_size    integer,
  file_type    text,  -- 'image' | 'document' | 'other'
  description  text,
  created_at   timestamptz not null default now()
);

create index if not exists evidence_dispute_idx    on public.dispute_evidence(dispute_id);
create index if not exists evidence_uploader_idx   on public.dispute_evidence(uploaded_by);

alter table public.dispute_evidence enable row level security;

-- Session participants and admins can read evidence
create policy "evidence_select" on public.dispute_evidence
  for select using (
    auth.uid() = uploaded_by or
    exists (
      select 1 from public.disputes d
      join public.work_sessions ws on ws.id = d.session_id
      where d.id = dispute_evidence.dispute_id
        and (ws.owner_id = auth.uid() or ws.helper_id = auth.uid())
    ) or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Only session participants can upload evidence for their own dispute
create policy "evidence_insert" on public.dispute_evidence
  for insert with check (
    auth.uid() = uploaded_by and
    exists (
      select 1 from public.disputes d
      join public.work_sessions ws on ws.id = d.session_id
      where d.id = dispute_evidence.dispute_id
        and (ws.owner_id = auth.uid() or ws.helper_id = auth.uid())
        and d.status in ('open', 'under_review')
    )
  );

-- ── 2. STORAGE BUCKET FOR DISPUTE EVIDENCE ───────────────────────────────
-- Run this in Supabase Dashboard → Storage → New Bucket
-- OR via SQL (requires storage extension):
-- insert into storage.buckets (id, name, public) values ('dispute-evidence', 'dispute-evidence', false);

-- Storage RLS policies (run after creating the bucket):
-- create policy "evidence_upload" on storage.objects
--   for insert with check (
--     bucket_id = 'dispute-evidence' and auth.role() = 'authenticated'
--   );
-- create policy "evidence_read" on storage.objects
--   for select using (
--     bucket_id = 'dispute-evidence' and auth.role() = 'authenticated'
--   );

-- ── 3. FUNCTION: ADMIN RESOLVE DISPUTE → HELPER WINS ─────────────────────
-- Releases frozen escrow to helper
create or replace function public.resolve_dispute_helper(
  p_dispute_id uuid,
  p_admin_id   uuid,
  p_resolution text default 'Resolved in favour of helper'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute record;
  v_session record;
  v_helper_share numeric;
begin
  -- Verify admin
  if not exists (select 1 from public.profiles where id = p_admin_id and is_admin = true) then
    raise exception 'Unauthorized: admin only';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if not found then raise exception 'Dispute not found'; end if;

  select * into v_session from public.work_sessions where id = v_dispute.session_id;

  -- Release escrow to helper
  select amount - platform_fee into v_helper_share
  from public.payments where session_id = v_dispute.session_id limit 1;

  update public.payments set
    escrow_status       = 'released',
    escrow_released_at  = now(),
    status              = 'available_for_withdrawal',
    withdrawal_status   = 'pending',
    withdrawable_amount = coalesce(v_helper_share, withdrawable_amount),
    updated_at          = now()
  where session_id = v_dispute.session_id;

  -- Mark session completed
  update public.work_sessions set status = 'completed' where id = v_dispute.session_id;
  update public.posts set status = 'completed' where id = v_session.post_id;

  -- Close dispute
  update public.disputes set
    status      = 'resolved_helper',
    resolution  = p_resolution,
    resolved_by = p_admin_id,
    resolved_at = now(),
    updated_at  = now()
  where id = p_dispute_id;

  -- Notify helper
  insert into public.notifications (user_id, type, title, body, ref_id)
  values (
    v_session.helper_id,
    'dispute_resolved',
    'Dispute resolved in your favour ✅',
    'The dispute has been reviewed and resolved in your favour. Your earnings are now available for withdrawal.',
    v_dispute.session_id
  );

  -- Notify student
  insert into public.notifications (user_id, type, title, body, ref_id)
  values (
    v_session.owner_id,
    'dispute_resolved',
    'Dispute resolved',
    'The dispute has been reviewed. It was resolved in the helper''s favour. The session is now marked complete.',
    v_dispute.session_id
  );
end;
$$;

-- ── 4. FUNCTION: ADMIN RESOLVE DISPUTE → STUDENT WINS (REFUND) ───────────
create or replace function public.resolve_dispute_student(
  p_dispute_id uuid,
  p_admin_id   uuid,
  p_resolution text default 'Resolved in favour of student — refund issued'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute record;
  v_session record;
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and is_admin = true) then
    raise exception 'Unauthorized: admin only';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if not found then raise exception 'Dispute not found'; end if;

  select * into v_session from public.work_sessions where id = v_dispute.session_id;

  -- Refund escrow
  perform public.refund_escrow(v_dispute.session_id);

  -- Close dispute
  update public.disputes set
    status      = 'resolved_student',
    resolution  = p_resolution,
    resolved_by = p_admin_id,
    resolved_at = now(),
    updated_at  = now()
  where id = p_dispute_id;

  -- Notify student
  insert into public.notifications (user_id, type, title, body, ref_id)
  values (
    v_session.owner_id,
    'dispute_resolved',
    'Dispute resolved — refund issued ✅',
    'The dispute has been reviewed and resolved in your favour. A refund will be processed within 3-5 business days.',
    v_dispute.session_id
  );

  -- Notify helper
  insert into public.notifications (user_id, type, title, body, ref_id)
  values (
    v_session.helper_id,
    'dispute_resolved',
    'Dispute resolved',
    'The dispute has been reviewed. It was resolved in the student''s favour. No payment will be released.',
    v_dispute.session_id
  );
end;
$$;

-- ── 5. FUNCTION: ADMIN MARK DISPUTE UNDER REVIEW ─────────────────────────
create or replace function public.mark_dispute_under_review(
  p_dispute_id uuid,
  p_admin_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and is_admin = true) then
    raise exception 'Unauthorized: admin only';
  end if;

  update public.disputes set
    status     = 'under_review',
    updated_at = now()
  where id = p_dispute_id and status = 'open';
end;
$$;

-- ── 6. INDEXES ────────────────────────────────────────────────────────────
create index if not exists disputes_created_at_idx on public.disputes(created_at desc);
create index if not exists disputes_updated_at_idx on public.disputes(updated_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
