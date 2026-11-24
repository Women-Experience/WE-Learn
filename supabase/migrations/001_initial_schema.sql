-- ═══════════════════════════════════════════════════════════════════════════
-- WE-Learn (WE Bubbles) — Initial database schema + security rules
-- Run this in the Supabase SQL Editor (or via supabase db push).
--
-- Design principles:
--   1. Security is enforced HERE, on the server — the UI hiding a button is
--      cosmetic; these rules are what actually protects data.
--   2. Member privacy first: member lists, profiles, and resources are only
--      visible to signed-in users (and some only to fellow bubble members).
--      Bubble cards (title/topic/schedule/seat count) are public for browsing.
--   3. Soft-delete for syllabus sections (per PRD R-07): rows get a
--      deleted_at timestamp instead of being destroyed, enabling undo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PROFILES ───────────────────────────────────────────────────────────────
-- One row per signed-in user. Created automatically on first Google sign-in.
-- NOTE: we deliberately do NOT copy the email address here. Emails stay in
-- Supabase's private auth system; other members never see them.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  avatar_url  text,
  title       text,                          -- professional title, user-editable
  created_at  timestamptz not null default now()
);

-- Auto-create a profile when a new user signs in with Google for the first time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── BUBBLES ────────────────────────────────────────────────────────────────

create table public.bubbles (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 120),
  topic         text not null check (char_length(topic) between 1 and 120),
  description   text not null default '' check (char_length(description) <= 2000),
  level         text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  status        text not null default 'open'
                  check (status in ('open', 'full', 'active', 'closed')),
  max_seats     int  not null default 8 check (max_seats between 4 and 8),
  taken_seats   int  not null default 0,     -- maintained by trigger, never by clients
  schedule_day  text not null,               -- "Tuesday"
  schedule_time text not null,               -- "7:00 PM"
  start_date    date,
  founder_id    uuid not null references public.profiles (id),
  hero_image    text,
  created_at    timestamptz not null default now()
);

-- ─── MEMBERSHIP ─────────────────────────────────────────────────────────────

create table public.bubble_members (
  bubble_id  uuid not null references public.bubbles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'member' check (role in ('founder', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (bubble_id, user_id)
);

create table public.waitlist (
  bubble_id  uuid not null references public.bubbles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bubble_id, user_id)
);

-- ─── SESSIONS (syllabus) ────────────────────────────────────────────────────

create table public.sessions (
  id                uuid primary key default gen_random_uuid(),
  bubble_id         uuid not null references public.bubbles (id) on delete cascade,
  number            int  not null,           -- 1, 2, 3… shown as S01, S02…
  title             text not null check (char_length(title) between 1 and 200),
  status            text not null default 'locked'
                      check (status in ('done', 'in-progress', 'locked')),
  session_date      date,
  duration          int  not null default 90,
  xp                int  not null default 150,
  level             text check (level in ('Beginner', 'Intermediate', 'Advanced')),
  project_url       text,
  reflection_note   text,
  confidence_rating int check (confidence_rating between 1 and 5),
  deleted_at        timestamptz,             -- soft delete (PRD R-07)
  created_at        timestamptz not null default now()
);

create table public.session_sections (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  type        text not null check (type in
                ('learning-path', 'brief', 'video', 'sandbox', 'ai-eval', 'reflection')),
  title       text not null check (char_length(title) between 1 and 200),
  content     text,
  videos      jsonb not null default '[]'::jsonb,  -- [{id,title,url}]
  position    int  not null default 0,
  deleted_at  timestamptz,                   -- soft delete (PRD R-07)
  created_at  timestamptz not null default now()
);

-- ─── RESOURCES ──────────────────────────────────────────────────────────────

create table public.resources (
  id              uuid primary key default gen_random_uuid(),
  bubble_id       uuid not null references public.bubbles (id) on delete cascade,
  type            text not null check (type in
                    ('video', 'article', 'book', 'tool', 'podcast', 'other')),
  title           text not null check (char_length(title) between 1 and 200),
  url             text,
  file_path       text,                      -- path in storage bucket, if uploaded
  description     text not null default '' check (char_length(description) <= 1000),
  uploaded_by     uuid not null references public.profiles (id),
  watched         boolean not null default false,
  personal_rating text check (personal_rating in ('up', 'down')),
  created_at      timestamptz not null default now()
);

create table public.resource_votes (
  resource_id uuid not null references public.resources (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  vote        text not null check (vote in ('up', 'down')),
  primary key (resource_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS (used by security rules)
-- "security definer" lets these check membership without tripping over the
-- security rules themselves (a standard Supabase pattern).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.is_bubble_member(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bubble_members
    where bubble_id = b and user_id = auth.uid()
  );
$$;

create or replace function public.is_bubble_founder(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bubble_members
    where bubble_id = b and user_id = auth.uid() and role = 'founder'
  );
$$;

-- ─── Seat counting: keep bubbles.taken_seats correct, atomically ────────────
create or replace function public.sync_taken_seats()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  b uuid := coalesce(new.bubble_id, old.bubble_id);
  cnt int;
  cap int;
begin
  select count(*) into cnt from bubble_members where bubble_id = b;
  select max_seats into cap from bubbles where id = b;
  if tg_op = 'INSERT' and cnt > cap then
    raise exception 'This Bubble is full.';
  end if;
  update bubbles
     set taken_seats = cnt,
         status = case
                    when status in ('open', 'full') and cnt >= max_seats then 'full'
                    when status = 'full' and cnt < max_seats then 'open'
                    else status
                  end
   where id = b;
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_taken_seats
  after insert or delete on public.bubble_members
  for each row execute function public.sync_taken_seats();

-- ─── join_bubble(): the ONLY way to join. Checks seats & status atomically. ─
-- Returns 'joined' or 'waitlisted'.
create or replace function public.join_bubble(target_bubble uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  b record;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a Bubble.';
  end if;

  select * into b from bubbles where id = target_bubble for update;
  if not found then raise exception 'Bubble not found.'; end if;

  if exists (select 1 from bubble_members
             where bubble_id = target_bubble and user_id = auth.uid()) then
    return 'joined';  -- already a member
  end if;

  if b.status in ('closed') then
    raise exception 'This Bubble is closed.';
  end if;

  if b.taken_seats >= b.max_seats or b.status in ('full', 'active') then
    insert into waitlist (bubble_id, user_id)
    values (target_bubble, auth.uid())
    on conflict do nothing;
    return 'waitlisted';
  end if;

  insert into bubble_members (bubble_id, user_id, role)
  values (target_bubble, auth.uid(), 'member');
  delete from waitlist where bubble_id = target_bubble and user_id = auth.uid();
  return 'joined';
end;
$$;

-- ─── create_bubble(): creates the bubble AND founder membership together ────
create or replace function public.create_bubble(
  p_title text, p_topic text, p_description text, p_level text,
  p_max_seats int, p_schedule_day text, p_schedule_time text,
  p_start_date date default null, p_hero_image text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Bubble.';
  end if;

  insert into bubbles (title, topic, description, level, max_seats,
                       schedule_day, schedule_time, start_date, hero_image, founder_id)
  values (p_title, p_topic, coalesce(p_description, ''), p_level, p_max_seats,
          p_schedule_day, p_schedule_time, p_start_date, p_hero_image, auth.uid())
  returning id into new_id;

  insert into bubble_members (bubble_id, user_id, role)
  values (new_id, auth.uid(), 'founder');

  return new_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — who may see / change what
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles         enable row level security;
alter table public.bubbles          enable row level security;
alter table public.bubble_members   enable row level security;
alter table public.waitlist         enable row level security;
alter table public.sessions         enable row level security;
alter table public.session_sections enable row level security;
alter table public.resources        enable row level security;
alter table public.resource_votes   enable row level security;

-- PROFILES: any signed-in user may view profiles (needed for member lists,
-- founder names on cards). Only you may edit your own profile. Nobody may
-- edit anyone else's. Emails are never in this table at all.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- BUBBLES: anyone (even not signed in) may browse bubble cards — the spec
-- calls for free browsing. Creation goes through create_bubble(). Only the
-- founder may edit or close her bubble.
create policy "bubbles_select_public" on public.bubbles
  for select to anon, authenticated using (true);
create policy "bubbles_update_founder" on public.bubbles
  for update to authenticated
  using (founder_id = auth.uid()) with check (founder_id = auth.uid());
create policy "bubbles_delete_founder" on public.bubbles
  for delete to authenticated using (founder_id = auth.uid());

-- MEMBERSHIP: member lists are visible to signed-in users only.
-- Joining happens ONLY through join_bubble() (which checks seats/status);
-- there is deliberately no direct insert policy for self-joins.
-- Founders may add members directly (Add Member button) and remove members;
-- any member may leave on her own. A founder cannot remove herself here
-- (leadership handover will be a dedicated function later).
create policy "members_select_authed" on public.bubble_members
  for select to authenticated using (true);
create policy "members_insert_founder" on public.bubble_members
  for insert to authenticated
  with check (public.is_bubble_founder(bubble_id) and role = 'member');
create policy "members_delete" on public.bubble_members
  for delete to authenticated
  using (
    (user_id = auth.uid() and role <> 'founder')            -- leave on your own
    or (public.is_bubble_founder(bubble_id) and role <> 'founder')  -- founder removes others
  );

-- WAITLIST: you see only your own entries; founders see their bubble's list.
create policy "waitlist_select" on public.waitlist
  for select to authenticated
  using (user_id = auth.uid() or public.is_bubble_founder(bubble_id));
create policy "waitlist_delete" on public.waitlist
  for delete to authenticated
  using (user_id = auth.uid() or public.is_bubble_founder(bubble_id));

-- SYLLABUS (sessions + sections): signed-in users may READ (so a woman can
-- inspect a syllabus before joining). Only the bubble's founder may write.
create policy "sessions_select_authed" on public.sessions
  for select to authenticated using (deleted_at is null or public.is_bubble_founder(bubble_id));
create policy "sessions_write_founder" on public.sessions
  for insert to authenticated with check (public.is_bubble_founder(bubble_id));
create policy "sessions_update_founder" on public.sessions
  for update to authenticated
  using (public.is_bubble_founder(bubble_id)) with check (public.is_bubble_founder(bubble_id));
create policy "sessions_delete_founder" on public.sessions
  for delete to authenticated using (public.is_bubble_founder(bubble_id));

create or replace function public.session_bubble(s uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select bubble_id from sessions where id = s;
$$;

create policy "sections_select_authed" on public.session_sections
  for select to authenticated
  using (deleted_at is null or public.is_bubble_founder(public.session_bubble(session_id)));
create policy "sections_insert_founder" on public.session_sections
  for insert to authenticated
  with check (public.is_bubble_founder(public.session_bubble(session_id)));
create policy "sections_update_founder" on public.session_sections
  for update to authenticated
  using (public.is_bubble_founder(public.session_bubble(session_id)))
  with check (public.is_bubble_founder(public.session_bubble(session_id)));
create policy "sections_delete_founder" on public.session_sections
  for delete to authenticated
  using (public.is_bubble_founder(public.session_bubble(session_id)));

-- RESOURCES: visible to members of that bubble only (they may reveal what
-- members are reading/sharing — kept inside the bubble). Any member may add;
-- you may edit/delete only what you uploaded; the founder may also delete.
create policy "resources_select_members" on public.resources
  for select to authenticated using (public.is_bubble_member(bubble_id));
create policy "resources_insert_members" on public.resources
  for insert to authenticated
  with check (public.is_bubble_member(bubble_id) and uploaded_by = auth.uid());
create policy "resources_update_own" on public.resources
  for update to authenticated
  using (uploaded_by = auth.uid()) with check (uploaded_by = auth.uid());
create policy "resources_delete" on public.resources
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_bubble_founder(bubble_id));

create or replace function public.resource_bubble(r uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select bubble_id from resources where id = r;
$$;

create policy "votes_select_members" on public.resource_votes
  for select to authenticated
  using (public.is_bubble_member(public.resource_bubble(resource_id)));
create policy "votes_upsert_own" on public.resource_votes
  for insert to authenticated
  with check (user_id = auth.uid()
              and public.is_bubble_member(public.resource_bubble(resource_id)));
create policy "votes_update_own" on public.resource_votes
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "votes_delete_own" on public.resource_votes
  for delete to authenticated using (user_id = auth.uid());

-- ─── Useful indexes ─────────────────────────────────────────────────────────
create index idx_bubbles_status      on public.bubbles (status);
create index idx_members_user        on public.bubble_members (user_id);
create index idx_sessions_bubble     on public.sessions (bubble_id, number);
create index idx_sections_session    on public.session_sections (session_id, position);
create index idx_resources_bubble    on public.resources (bubble_id);
