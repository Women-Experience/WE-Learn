-- ═══════════════════════════════════════════════════════════════════════════
-- WE-Learn migration 002 — audit fixes
-- Run in the Supabase SQL Editor after 001.
--
--  A. Per-member session progress (fixes silent-loss of member submissions)
--  B. Privacy hardening: member lists & profiles no longer platform-readable
--  C. RLS gaps: resources can't be moved across bubbles; vote re-pointing
--  D. Founder handover + waitlist admission functions
--  E. Notification consent + URL hygiene + abuse limits
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── A. Per-member progress ─────────────────────────────────────────────────

create table public.session_progress (
  session_id        uuid not null references public.sessions (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  project_url       text check (project_url is null or project_url ~* '^https?://'),
  reflection_note   text check (char_length(coalesce(reflection_note, '')) <= 4000),
  confidence_rating int  check (confidence_rating between 1 and 5),
  updated_at        timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.session_progress enable row level security;

-- Your progress is yours; the founder can see her group's progress.
create policy "progress_select" on public.session_progress
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_bubble_founder(public.session_bubble(session_id))
  );
create policy "progress_upsert_own" on public.session_progress
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_bubble_member(public.session_bubble(session_id))
  );
create policy "progress_update_own" on public.session_progress
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress_delete_own" on public.session_progress
  for delete to authenticated using (user_id = auth.uid());

-- ─── B. Privacy hardening ───────────────────────────────────────────────────

-- Does the caller share at least one bubble with this person?
create or replace function public.shares_bubble_with(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from bubble_members a
    join bubble_members b on a.bubble_id = b.bubble_id
    where a.user_id = auth.uid() and b.user_id = p
  );
$$;

create or replace function public.is_some_founder(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bubble_members where user_id = p and role = 'founder'
  );
$$;

-- Member lists: visible only inside bubbles you belong to (was: any signed-in user).
drop policy "members_select_authed" on public.bubble_members;
create policy "members_select_own_bubbles" on public.bubble_members
  for select to authenticated
  using (public.is_bubble_member(bubble_id));

-- Profiles: yourself, women you share a bubble with, and bubble founders
-- (their name appears on bubble pages). Was: every signed-in user.
drop policy "profiles_select" on public.profiles;
create policy "profiles_select_scoped" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.shares_bubble_with(id)
    or public.is_some_founder(id)
  );

-- ─── C. RLS gap fixes ───────────────────────────────────────────────────────

-- A resource must stay in a bubble its uploader belongs to (blocks re-pointing
-- content into foreign bubbles).
drop policy "resources_update_own" on public.resources;
create policy "resources_update_own" on public.resources
  for update to authenticated
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid() and public.is_bubble_member(bubble_id));

-- A vote must stay attached to a resource in a bubble you belong to.
drop policy "votes_update_own" on public.resource_votes;
create policy "votes_update_own" on public.resource_votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_bubble_member(public.resource_bubble(resource_id))
  );

-- ─── D. Founder handover + waitlist admission ───────────────────────────────

-- Hand the founder role to another current member (brief §8).
create or replace function public.transfer_founder(target_bubble uuid, new_founder uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_bubble_founder(target_bubble) then
    raise exception 'Only the founder can transfer leadership.';
  end if;
  if not exists (select 1 from bubble_members
                 where bubble_id = target_bubble and user_id = new_founder) then
    raise exception 'The new founder must already be a member of this Bubble.';
  end if;

  update bubbles set founder_id = new_founder where id = target_bubble;
  update bubble_members set role = 'member'
    where bubble_id = target_bubble and user_id = auth.uid();
  update bubble_members set role = 'founder'
    where bubble_id = target_bubble and user_id = new_founder;
end;
$$;

-- Founder admits a waitlisted woman into a free seat.
create or replace function public.admit_from_waitlist(target_bubble uuid, target_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b record;
begin
  if not public.is_bubble_founder(target_bubble) then
    raise exception 'Only the founder can admit from the waitlist.';
  end if;

  select * into b from bubbles where id = target_bubble for update;
  if b.taken_seats >= b.max_seats then
    raise exception 'No free seats — remove a member first or increase seats.';
  end if;
  if not exists (select 1 from waitlist
                 where bubble_id = target_bubble and user_id = target_user) then
    raise exception 'This person is not on the waitlist.';
  end if;

  insert into bubble_members (bubble_id, user_id, role)
  values (target_bubble, target_user, 'member')
  on conflict do nothing;
  delete from waitlist where bubble_id = target_bubble and user_id = target_user;
end;
$$;

-- Founders can see waitlisted women's names in their Members tab.
create or replace function public.is_waitlisted_in_my_bubble(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from waitlist w
    join bubble_members m on m.bubble_id = w.bubble_id
    where w.user_id = p and m.user_id = auth.uid() and m.role = 'founder'
  );
$$;

drop policy "profiles_select_scoped" on public.profiles;
create policy "profiles_select_scoped" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.shares_bubble_with(id)
    or public.is_some_founder(id)
    or public.is_waitlisted_in_my_bubble(id)
  );

-- ─── E. Consent, URL hygiene, abuse limits ──────────────────────────────────

-- Notification consent (join-flow PRD step 6).
alter table public.profiles
  add column notify_consent boolean not null default false;

-- Only real web links can be stored (blocks javascript: payloads server-side).
alter table public.resources
  add constraint resources_url_scheme
  check (url is null or url ~* '^https?://');

-- Reasonable length caps on free-text profile fields.
alter table public.profiles
  add constraint profiles_name_len  check (char_length(name)  between 1 and 80),
  add constraint profiles_title_len check (title is null or char_length(title) <= 120);

-- A person can found at most 10 bubbles (spam guard; raise later if needed).
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
  if (select count(*) from bubbles where founder_id = auth.uid()) >= 10 then
    raise exception 'You have reached the limit of 10 Bubbles per founder.';
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
