-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 005: Enable Realtime for chat_messages + user_presence
-- Run this in Supabase SQL Editor AFTER migration 004
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable Realtime publication for chat tables
-- (Supabase Realtime uses the supabase_realtime publication)
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.user_presence;

-- Ensure chat_messages has replica identity FULL so UPDATE/DELETE payloads
-- include the old row data (needed for read receipts and soft deletes)
alter table public.chat_messages replica identity full;
alter table public.user_presence  replica identity full;

-- ── Ensure read_by default is correct ────────────────────────────────────
-- (idempotent — safe to re-run)
alter table public.chat_messages
  alter column read_by set default '{}';

-- ── Index for unread count queries ───────────────────────────────────────
create index if not exists chat_messages_read_by_idx
  on public.chat_messages using gin(read_by);

-- ── Function: mark messages as read ──────────────────────────────────────
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

-- ── Function: upsert presence ─────────────────────────────────────────────
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

-- ═══════════════════════════════════════════════════════════════════════════
