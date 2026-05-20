-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 006: Fix chat RLS + ensure realtime is properly enabled
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Drop and recreate chat RLS policies with correct logic ─────────────
-- The original policy used a subquery that could fail in some Supabase versions

drop policy if exists "chat_select" on public.chat_messages;
drop policy if exists "chat_insert" on public.chat_messages;
drop policy if exists "chat_update" on public.chat_messages;

-- Simpler, more permissive select: any authenticated user who is a session participant
create policy "chat_select" on public.chat_messages
  for select using (
    auth.uid() is not null and
    exists (
      select 1 from public.work_sessions ws
      where ws.id = chat_messages.session_id
        and (ws.owner_id = auth.uid() or ws.helper_id = auth.uid())
    )
  );

create policy "chat_insert" on public.chat_messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.work_sessions ws
      where ws.id = chat_messages.session_id
        and (ws.owner_id = auth.uid() or ws.helper_id = auth.uid())
    )
  );

create policy "chat_update" on public.chat_messages
  for update using (auth.uid() = sender_id);

-- ── 2. Fix presence RLS ───────────────────────────────────────────────────
drop policy if exists "presence_select" on public.user_presence;
drop policy if exists "presence_upsert" on public.user_presence;

create policy "presence_select" on public.user_presence
  for select using (auth.uid() is not null);

create policy "presence_insert" on public.user_presence
  for insert with check (auth.uid() = user_id);

create policy "presence_update" on public.user_presence
  for update using (auth.uid() = user_id);

-- ── 3. Ensure realtime is enabled (idempotent) ────────────────────────────
-- These may already be added from migration 005 — the DO block handles duplicates
do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when others then
    -- already added, ignore
  end;
  begin
    alter publication supabase_realtime add table public.user_presence;
  exception when others then
    -- already added, ignore
  end;
end;
$$;

-- ── 4. Replica identity (needed for UPDATE/DELETE realtime payloads) ──────
alter table public.chat_messages replica identity full;
alter table public.user_presence  replica identity full;

-- ── 5. Re-create the upsert_presence function (idempotent) ───────────────
create or replace function public.upsert_presence(
  p_user_id  uuid,
  p_online   boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_presence (user_id, is_online, last_seen)
  values (p_user_id, p_online, now())
  on conflict (user_id) do update
    set is_online = p_online,
        last_seen = now();
end;
$$;

-- ── 6. Re-create mark_messages_read function (idempotent) ────────────────
create or replace function public.mark_messages_read(
  p_session_id uuid,
  p_user_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_messages
  set read_by = array_append(read_by, p_user_id)
  where session_id = p_session_id
    and sender_id  <> p_user_id
    and not (p_user_id = any(read_by))
    and deleted_at is null;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
