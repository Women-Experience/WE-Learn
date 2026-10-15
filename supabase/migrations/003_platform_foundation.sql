-- ═══════════════════════════════════════════════════════════════════════════
-- WE-Learn migration 003 — platform foundation (Stage A)
-- Run in the Supabase SQL Editor after 002.
--
-- Implements ADR 0001 (Fork), ADR 0002 (Admin) and the Stage A parts of
-- ADR 0004 (seats vs ownership, limits, succession, nothing is lost).
--
--  A. Settings table (all limits live here, editable without code)
--  B. Platform roles: Admin and Content Lead
--  C. Seats and ownership are separate; seat range is 2 to 8
--  D. Bubble columns: credit chain, fork link, hidden flag; column-level
--     protection so a Founder can no longer edit taken_seats, founder_id etc.
--  E. Security rules: hidden bubbles, Admin powers, no founder delete
--  F. Functions: create_bubble, join_bubble, transfer_founder,
--     set_founder_seat, fork_bubble, admin_* helpers
--
-- AFTER RUNNING: make the first Admin by hand (SQL Editor, replace the id
-- with your own user id from Authentication > Users):
--   insert into public.platform_roles (user_id, role)
--   values ('00000000-0000-0000-0000-000000000000', 'admin');
-- To change a limit, edit a row in Table Editor > platform_settings.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── A. Settings ────────────────────────────────────────────────────────────

create table public.platform_settings (
  key         text primary key,
  value       int  not null check (value >= 0),
  description text not null default ''
);

insert into public.platform_settings (key, value, description) values
  ('max_open_learning_seats', 1,
   'How many open Bubbles one woman may hold a learning seat in at the same time. Content Leads are exempt.'),
  ('max_owned_open_bubbles', 2,
   'How many open Bubbles one woman may own (be Founder of) at the same time. Content Leads are exempt.');

alter table public.platform_settings enable row level security;

-- ─── B. Platform roles ──────────────────────────────────────────────────────

create table public.platform_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('admin', 'content_lead')),
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.platform_roles enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from platform_roles where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_content_lead(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from platform_roles where user_id = p and role = 'content_lead'
  );
$$;

create or replace function public.platform_setting(k text)
returns int language plpgsql stable security definer set search_path = public as $$
declare v int;
begin
  select value into v from platform_settings where key = k;
  if v is null then raise exception 'Missing platform setting: %', k; end if;
  return v;
end;
$$;

-- Settings: any signed-in woman may read (the UI explains the limits);
-- only Admins may change them.
create policy "settings_select" on public.platform_settings
  for select to authenticated using (true);
create policy "settings_admin_write" on public.platform_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Roles: the Content Lead badge is public; Admin rows are visible to the
-- person herself and to Admins. Only Admins grant or withdraw roles.
create policy "roles_select_badge" on public.platform_roles
  for select to anon, authenticated using (role = 'content_lead');
create policy "roles_select_own_or_admin" on public.platform_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "roles_admin_insert" on public.platform_roles
  for insert to authenticated
  with check (public.is_admin() and granted_by = auth.uid());
create policy "roles_admin_delete" on public.platform_roles
  for delete to authenticated using (public.is_admin());

-- ─── C. Seats and ownership are separate ────────────────────────────────────

-- New Bubble columns (used by the functions below and by section D).
alter table public.bubbles
  add column created_by   uuid references public.profiles (id) on delete set null,
  add column forked_from  uuid references public.bubbles (id) on delete set null,
  -- Credit to every Bubble this syllabus descends from, oldest first.
  -- Written only by fork_bubble(); nobody can edit it afterwards.
  add column credit_chain jsonb not null default '[]'::jsonb,
  add column hidden_at    timestamptz;

update public.bubbles set created_by = founder_id where created_by is null;

create index idx_bubbles_founder     on public.bubbles (founder_id);
create index idx_bubbles_forked_from on public.bubbles (forked_from);

-- A Founder may choose not to take a seat (she builds or facilitates only).
alter table public.bubble_members
  add column holds_seat boolean not null default true;

-- Seat range is 2 to 8; four is a recommendation in the UI, not a rule.
alter table public.bubbles drop constraint if exists bubbles_max_seats_check;
alter table public.bubbles
  add constraint bubbles_max_seats_check check (max_seats between 2 and 8);

-- Only members who hold a seat count toward the Bubble's capacity.
create or replace function public.sync_taken_seats()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  b uuid := coalesce(new.bubble_id, old.bubble_id);
  cnt int;
  cap int;
begin
  select count(*) into cnt from bubble_members where bubble_id = b and holds_seat;
  select max_seats into cap from bubbles where id = b;
  if tg_op <> 'DELETE' then
    if new.holds_seat and cnt > cap then
      raise exception 'This Bubble is full.';
    end if;
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

drop trigger trg_sync_taken_seats on public.bubble_members;
create trigger trg_sync_taken_seats
  after insert or delete or update of holds_seat on public.bubble_members
  for each row execute function public.sync_taken_seats();

-- How many open Bubbles does this woman currently learn in?
create or replace function public.learning_seats_in_use(p uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
    from bubble_members m
    join bubbles b on b.id = m.bubble_id
   where m.user_id = p and m.holds_seat
     and b.status <> 'closed' and b.hidden_at is null;
$$;

-- Learning limit (one open Bubble at a time by default; Content Leads exempt).
-- Enforced on every path that gives someone a seat: joining, being admitted
-- from the waitlist, being added by the Founder, taking a seat as Founder.
create or replace function public.enforce_learning_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  lim int;
  cnt int;
begin
  if not new.holds_seat then return new; end if;
  if tg_op = 'UPDATE' and old.holds_seat then return new; end if;
  if public.is_content_lead(new.user_id) then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended('learn:' || new.user_id::text, 0));
  lim := public.platform_setting('max_open_learning_seats');
  select count(*) into cnt
    from bubble_members m
    join bubbles b on b.id = m.bubble_id
   where m.user_id = new.user_id and m.holds_seat
     and b.status <> 'closed' and b.hidden_at is null
     and m.bubble_id <> new.bubble_id;
  if cnt >= lim then
    raise exception 'You can learn in % open Bubble(s) at a time. Finish or leave your current Bubble first.', lim;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_learning_limit
  before insert or update of holds_seat on public.bubble_members
  for each row execute function public.enforce_learning_limit();

-- Ownership limit (two open Bubbles by default; Content Leads exempt).
create or replace function public.assert_can_own_bubble(p uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  lim int;
  cnt int;
begin
  if public.is_content_lead(p) then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('own:' || p::text, 0));
  lim := public.platform_setting('max_owned_open_bubbles');
  select count(*) into cnt from bubbles
   where founder_id = p and status <> 'closed' and hidden_at is null;
  if cnt >= lim then
    raise exception 'You can run up to % open Bubble(s) at a time. Close one first, or hand it to someone else.', lim;
  end if;
end;
$$;

-- ─── D. Bubble columns and protection ───────────────────────────────────────

-- (The new columns are added at the top of section C, because the seat
-- functions below refer to them.)

-- Founders previously had UPDATE on every column, so a Founder could have
-- rewritten taken_seats, founder_id or the credit chain with a direct API
-- call. Allow only the columns the app legitimately edits.
revoke update on public.bubbles from authenticated;
grant update (title, topic, description, level, status, max_seats,
              schedule_day, schedule_time, start_date, hero_image)
  on public.bubbles to authenticated;

create or replace function public.guard_bubble_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.max_seats is distinct from old.max_seats and new.max_seats < old.taken_seats then
    raise exception 'You cannot reduce the seats below the % learners already in this Bubble.', old.taken_seats;
  end if;
  -- A closed Bubble stays closed (its members' seats were released). Only an
  -- Admin can reopen it; everyone else forks it instead.
  if old.status = 'closed' and new.status <> 'closed' and not public.is_admin() then
    raise exception 'A closed Bubble cannot be reopened. Fork it to start a new one.';
  end if;
  -- open/full always follow the real seat count.
  if new.status in ('open', 'full') then
    new.status := case when new.taken_seats >= new.max_seats then 'full' else 'open' end;
  end if;
  return new;
end;
$$;

create trigger trg_guard_bubble_update
  before update on public.bubbles
  for each row execute function public.guard_bubble_update();

-- Nothing is lost: a Bubble that has Members cannot be deleted at all.
-- (Only Admins can delete; see policies below.) Hide it instead.
create or replace function public.guard_bubble_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from bubble_members
             where bubble_id = old.id and user_id <> old.founder_id) then
    raise exception 'A Bubble that has Members cannot be deleted. Hide it instead.';
  end if;
  return old;
end;
$$;

create trigger trg_guard_bubble_delete
  before delete on public.bubbles
  for each row execute function public.guard_bubble_delete();

-- ─── E. Security rules ──────────────────────────────────────────────────────

create or replace function public.bubble_visible(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bubbles
     where id = b
       and (hidden_at is null or public.is_admin() or founder_id = auth.uid())
  );
$$;

-- Bubbles: hidden ones are seen only by their Founder and Admins.
drop policy "bubbles_select_public" on public.bubbles;
create policy "bubbles_select_public" on public.bubbles
  for select to anon, authenticated
  using (hidden_at is null or public.is_admin() or founder_id = auth.uid());

drop policy "bubbles_update_founder" on public.bubbles;
create policy "bubbles_update_founder_or_admin" on public.bubbles
  for update to authenticated
  using (founder_id = auth.uid() or public.is_admin())
  with check (founder_id = auth.uid() or public.is_admin());

-- Only Admins delete (and never a Bubble that has Members, see trigger).
drop policy "bubbles_delete_founder" on public.bubbles;
create policy "bubbles_delete_admin" on public.bubbles
  for delete to authenticated using (public.is_admin());

-- Syllabus: hidden Bubbles' syllabi are hidden too; Admins may do anything.
drop policy "sessions_select_authed" on public.sessions;
create policy "sessions_select_authed" on public.sessions
  for select to authenticated
  using (
    (deleted_at is null or public.is_bubble_founder(bubble_id))
    and public.bubble_visible(bubble_id)
  );
create policy "sessions_admin_all" on public.sessions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy "sections_select_authed" on public.session_sections;
create policy "sections_select_authed" on public.session_sections
  for select to authenticated
  using (
    (deleted_at is null or public.is_bubble_founder(public.session_bubble(session_id)))
    and public.bubble_visible(public.session_bubble(session_id))
  );
create policy "sections_admin_all" on public.session_sections
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admins may see every member and profile, and remove any member
-- (including a Founder, who nobody else can remove).
create policy "members_select_admin" on public.bubble_members
  for select to authenticated using (public.is_admin());
create policy "members_delete_admin" on public.bubble_members
  for delete to authenticated using (public.is_admin());
create policy "profiles_select_admin" on public.profiles
  for select to authenticated using (public.is_admin());

-- ─── F. Functions ───────────────────────────────────────────────────────────

-- create_bubble(): same inputs as before plus an optional p_founder_learns.
--   null  = take a learning seat if the limit allows, otherwise facilitate only
--   true  = take a seat (fails if the learning limit is reached)
--   false = build and facilitate without a seat
drop function public.create_bubble(text, text, text, text, int, text, text, date, text);

create or replace function public.create_bubble(
  p_title text, p_topic text, p_description text, p_level text,
  p_max_seats int, p_schedule_day text, p_schedule_time text,
  p_start_date date default null, p_hero_image text default null,
  p_founder_learns boolean default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  takes_seat boolean;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a Bubble.';
  end if;
  perform public.assert_can_own_bubble(auth.uid());

  takes_seat := coalesce(
    p_founder_learns,
    public.is_content_lead(auth.uid())
      or public.learning_seats_in_use(auth.uid()) < public.platform_setting('max_open_learning_seats')
  );

  insert into bubbles (title, topic, description, level, max_seats,
                       schedule_day, schedule_time, start_date, hero_image,
                       founder_id, created_by)
  values (p_title, p_topic, coalesce(p_description, ''), p_level, p_max_seats,
          p_schedule_day, p_schedule_time, p_start_date, p_hero_image,
          auth.uid(), auth.uid())
  returning id into new_id;

  insert into bubble_members (bubble_id, user_id, role, holds_seat)
  values (new_id, auth.uid(), 'founder', takes_seat);

  return new_id;
end;
$$;

-- join_bubble(): joining stays open until the Bubble is full or the Founder
-- closes it. Having started to learn ('active') no longer blocks joining.
create or replace function public.join_bubble(target_bubble uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  b record;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a Bubble.';
  end if;

  select * into b from bubbles where id = target_bubble for update;
  if not found or b.hidden_at is not null then
    raise exception 'Bubble not found.';
  end if;

  if exists (select 1 from bubble_members
             where bubble_id = target_bubble and user_id = auth.uid()) then
    return 'joined';  -- already a member
  end if;

  if b.status = 'closed' then
    raise exception 'This Bubble is closed.';
  end if;

  if b.taken_seats >= b.max_seats or b.status = 'full' then
    insert into waitlist (bubble_id, user_id)
    values (target_bubble, auth.uid())
    on conflict do nothing;
    return 'waitlisted';
  end if;

  insert into bubble_members (bubble_id, user_id, role, holds_seat)
  values (target_bubble, auth.uid(), 'member', true);
  delete from waitlist where bubble_id = target_bubble and user_id = auth.uid();
  return 'joined';
end;
$$;

-- transfer_founder(): hand the Bubble to another Member. With leave_bubble
-- the old Founder also leaves, which is how a Founder steps away.
drop function public.transfer_founder(uuid, uuid);

create or replace function public.transfer_founder(
  target_bubble uuid, new_founder uuid, leave_bubble boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_bubble_founder(target_bubble) then
    raise exception 'Only the founder can transfer leadership.';
  end if;
  if not exists (select 1 from bubble_members
                 where bubble_id = target_bubble and user_id = new_founder) then
    raise exception 'The new founder must already be a member of this Bubble.';
  end if;
  perform public.assert_can_own_bubble(new_founder);

  update bubbles set founder_id = new_founder where id = target_bubble;
  update bubble_members set role = 'member'
    where bubble_id = target_bubble and user_id = auth.uid();
  update bubble_members set role = 'founder'
    where bubble_id = target_bubble and user_id = new_founder;

  if leave_bubble then
    delete from bubble_members
     where bubble_id = target_bubble and user_id = auth.uid();
  end if;
end;
$$;

-- The Founder chooses whether she learns in her own Bubble.
create or replace function public.set_founder_seat(target_bubble uuid, p_learns boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_bubble_founder(target_bubble) then
    raise exception 'Only the founder can change her own seat.';
  end if;
  update bubble_members set holds_seat = p_learns
   where bubble_id = target_bubble and user_id = auth.uid();
end;
$$;

-- fork_bubble(): open a new Bubble from an existing Bubble's syllabus.
-- Copies sessions and sections (never progress, notes, resources, members).
-- The credit to the source is written here and cannot be edited later.
-- Works on any visible Bubble, including full, active and closed ones.
create or replace function public.fork_bubble(
  source_bubble uuid,
  p_title text default null,
  p_max_seats int default 8,
  p_schedule_day text default null,
  p_schedule_time text default null,
  p_start_date date default null,
  p_founder_learns boolean default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  src record;
  author text;
  new_id uuid;
  takes_seat boolean;
  s record;
  new_session uuid;
  i int := 0;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to fork a Bubble.';
  end if;

  select * into src from bubbles where id = source_bubble;
  if not found or src.hidden_at is not null then
    raise exception 'Bubble not found.';
  end if;

  perform public.assert_can_own_bubble(auth.uid());
  takes_seat := coalesce(
    p_founder_learns,
    public.is_content_lead(auth.uid())
      or public.learning_seats_in_use(auth.uid()) < public.platform_setting('max_open_learning_seats')
  );

  select name into author from profiles where id = coalesce(src.created_by, src.founder_id);

  insert into bubbles (title, topic, description, level, max_seats,
                       schedule_day, schedule_time, start_date, hero_image,
                       founder_id, created_by, forked_from, credit_chain)
  values (coalesce(nullif(trim(p_title), ''), src.title), src.topic, src.description,
          src.level, p_max_seats,
          coalesce(p_schedule_day, src.schedule_day),
          coalesce(p_schedule_time, src.schedule_time),
          p_start_date, src.hero_image, auth.uid(), auth.uid(), src.id,
          src.credit_chain || jsonb_build_array(jsonb_build_object(
            'bubble_id', src.id, 'title', src.title, 'author', coalesce(author, 'Unknown')
          )))
  returning id into new_id;

  insert into bubble_members (bubble_id, user_id, role, holds_seat)
  values (new_id, auth.uid(), 'founder', takes_seat);

  for s in
    select * from sessions
     where bubble_id = src.id and deleted_at is null
     order by number
  loop
    i := i + 1;
    insert into sessions (bubble_id, number, title, status, duration, xp, level)
    values (new_id, i, s.title,
            case when i = 1 then 'in-progress' else 'locked' end,
            s.duration, s.xp, s.level)
    returning id into new_session;

    insert into session_sections (session_id, type, title, content, videos, position)
    select new_session, type, title, content, videos, position
      from session_sections
     where session_id = s.id and deleted_at is null;
  end loop;

  return new_id;
end;
$$;

-- Admin tools ----------------------------------------------------------------

-- Hide (or unhide) a Bubble. Nothing is deleted; members keep their data.
create or replace function public.admin_set_bubble_hidden(target_bubble uuid, p_hide boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only an Admin can hide a Bubble.';
  end if;
  update bubbles
     set hidden_at = case when p_hide then now() else null end
   where id = target_bubble;
end;
$$;

-- Give a Bubble to another woman (for example when its Founder has vanished).
-- If she is not a member yet she joins without a seat.
create or replace function public.admin_assign_founder(target_bubble uuid, new_founder uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only an Admin can assign a Bubble.';
  end if;
  if not exists (select 1 from profiles where id = new_founder) then
    raise exception 'That person does not exist.';
  end if;

  insert into bubble_members (bubble_id, user_id, role, holds_seat)
  values (target_bubble, new_founder, 'member', false)
  on conflict do nothing;

  update bubble_members set role = 'member'
   where bubble_id = target_bubble and role = 'founder';
  update bubble_members set role = 'founder'
   where bubble_id = target_bubble and user_id = new_founder;
  update bubbles set founder_id = new_founder where id = target_bubble;
end;
$$;
