-- Full schema — run this in your Supabase SQL editor.
-- If tables already exist, use the migration blocks at the bottom.

-- ── Posts ──────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course      text not null,
  description text not null,
  budget      numeric(10, 2) not null check (budget > 0),
  status      text not null default 'open'
                check (status in ('open', 'in_progress', 'completed')),
  created_at  timestamptz not null default now()
);

-- ── Offers ─────────────────────────────────────────────────────────────────
create table if not exists public.offers (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  helper_id  uuid not null references auth.users(id) on delete cascade,
  message    text not null,
  accepted   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (post_id, helper_id)
);

-- ── Work Sessions ───────────────────────────────────────────────────────────
create table if not exists public.work_sessions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  helper_id  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'active'
               check (status in ('active', 'completed')),
  created_at timestamptz not null default now()
);

-- ── Messages (AI — kept for future) ────────────────────────────────────────
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  message    text not null,
  role       text not null check (role in ('user', 'ai')),
  created_at timestamptz not null default now()
);

-- ── Notifications ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,   -- 'new_post' | 'new_offer' | 'offer_accepted'
  title      text not null,
  body       text not null,
  read       boolean not null default false,
  ref_id     uuid,            -- post_id or offer_id for deep-linking
  created_at timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
create index if not exists posts_user_id_idx       on public.posts         (user_id);
create index if not exists posts_created_at_idx    on public.posts         (created_at desc);
create index if not exists offers_post_id_idx      on public.offers        (post_id);
create index if not exists offers_helper_id_idx    on public.offers        (helper_id);
create index if not exists sessions_owner_idx      on public.work_sessions (owner_id);
create index if not exists sessions_helper_idx     on public.work_sessions (helper_id);
create index if not exists sessions_post_idx       on public.work_sessions (post_id);
create index if not exists notifs_user_id_idx      on public.notifications (user_id);
create index if not exists notifs_created_at_idx   on public.notifications (created_at desc);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.posts         enable row level security;
alter table public.offers        enable row level security;
alter table public.work_sessions enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;

-- Posts
create policy "posts_select" on public.posts
  for select using (auth.role() = 'authenticated');
create policy "posts_insert" on public.posts
  for insert with check (auth.uid() = user_id);
create policy "posts_update" on public.posts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "posts_delete" on public.posts
  for delete using (auth.uid() = user_id);

-- Offers
create policy "offers_select" on public.offers
  for select using (auth.role() = 'authenticated');
create policy "offers_insert" on public.offers
  for insert with check (auth.uid() = helper_id);
create policy "offers_update" on public.offers
  for update using (
    auth.uid() = (select user_id from public.posts where id = post_id)
  );

-- Work Sessions: owner and helper can read; anyone authenticated can insert (system creates it)
create policy "sessions_select" on public.work_sessions
  for select using (
    auth.uid() = owner_id or auth.uid() = helper_id
  );
create policy "sessions_insert" on public.work_sessions
  for insert with check (auth.uid() = owner_id);
create policy "sessions_update" on public.work_sessions
  for update using (
    auth.uid() = owner_id or auth.uid() = helper_id
  );

-- Messages
create policy "messages_select" on public.messages
  for select using (auth.uid() = user_id);
create policy "messages_insert" on public.messages
  for insert with check (auth.uid() = user_id);

-- Notifications: users read their own; authenticated users can insert (system creates them)
create policy "notifs_select" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifs_insert" on public.notifications
  for insert with check (auth.role() = 'authenticated');
create policy "notifs_update" on public.notifications
  for update using (auth.uid() = user_id);


-- ── MIGRATIONS (run if tables already exist) ────────────────────────────────
-- alter table public.posts
--   add column if not exists status text not null default 'open'
--     check (status in ('open', 'in_progress', 'completed'));

-- create table if not exists public.work_sessions ( ... ); -- see above


-- ── Trigger: notify all other users when a new post is created ──────────────
--
-- Run this block in the Supabase SQL editor.
-- It creates a pg function + trigger so that every INSERT on public.posts
-- fans out a 'new_post' notification row to every authenticated user
-- except the post author.

create or replace function public.notify_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, ref_id)
  select
    u.id,
    'new_post',
    'New job posted',
    'A new assignment was posted in ' || new.course || ' — check it out!',
    new.id
  from auth.users u
  where u.id <> new.user_id;   -- don't notify the poster themselves

  return new;
end;
$$;

-- Drop first so re-running this script is idempotent
drop trigger if exists on_post_created on public.posts;

create trigger on_post_created
  after insert on public.posts
  for each row
  execute function public.notify_new_post();


-- ── Profiles ────────────────────────────────────────────────────────────────
-- Run this block in the Supabase SQL editor.

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read any profile (needed to fetch the other user's phone in a session)
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Users can only insert/update their own profile
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- ── Trigger: auto-create profile row on new user signup ─────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
