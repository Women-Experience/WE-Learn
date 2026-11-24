-- ═══════════════════════════════════════════════════════════════════════════
-- WE-Learn migration 004 — notifications, ownership requests, import
-- Run in the Supabase SQL Editor after 003.
--
-- Implements the rest of Stage A from ADR 0003 and ADR 0004:
--
--  A. Settings and working days (Sunday to Thursday, plus an optional
--     list of days off such as public holidays)
--  B. In-site notifications (email is sent later by a small server job that
--     reads rows with email_pending = true)
--  C. Ownership requests: a Member asks to take over a living Bubble; the
--     Founder answers; after 5 working days without an answer it goes to
--     the Admins (a daily job does this)
--  D. Syllabus import: validate and import a syllabus built elsewhere
--  E. sessions.goal, so a Syllabus plan can carry a goal per Session
--  F. Hardening: internal helper functions are no longer callable from the
--     browser
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── A. Settings and working days ───────────────────────────────────────────

insert into public.platform_settings (key, value, description) values
  ('ownership_request_working_days', 5,
   'Working days a Founder has to answer an ownership request before it goes to the Admins.');

-- Working days are Sunday to Thursday. Admins may list extra days off.
create table public.non_working_days (
  day  date primary key,
  note text not null default ''
);
alter table public.non_working_days enable row level security;
create policy "non_working_select" on public.non_working_days
  for select to authenticated using (true);
create policy "non_working_admin_write" on public.non_working_days
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Moment that is n working days after start_at (same time of day, Israel time).
create or replace function public.add_working_days(start_at timestamptz, n int)
returns timestamptz language plpgsql stable security definer set search_path = public as $$
declare
  d date := (start_at at time zone 'Asia/Jerusalem')::date;
  t time := (start_at at time zone 'Asia/Jerusalem')::time;
  remaining int := n;
begin
  while remaining > 0 loop
    d := d + 1;
    -- isodow: Friday = 5, Saturday = 6
    if extract(isodow from d) not in (5, 6)
       and not exists (select 1 from non_working_days where day = d) then
      remaining := remaining - 1;
    end if;
  end loop;
  return (d + t) at time zone 'Asia/Jerusalem';
end;
$$;

-- ─── B. Notifications ───────────────────────────────────────────────────────

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          text not null check (kind in (
                  'ownership_request', 'ownership_accepted', 'ownership_declined',
                  'ownership_escalated', 'ownership_for_admin', 'info')),
  bubble_id     uuid references public.bubbles (id) on delete cascade,
  message       text not null check (char_length(message) <= 500),
  read_at       timestamptz,
  -- true when she consented to notifications and the email has not gone out
  email_pending boolean not null default false,
  emailed_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_notifications_user  on public.notifications (user_id, created_at desc);
create index idx_notifications_email on public.notifications (email_pending) where email_pending;

alter table public.notifications enable row level security;

-- You see and manage only your own notifications; you can mark them read
-- and delete them, but never rewrite their text. Only the server creates them.
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Internal: create a notification. Email is queued only for women who gave
-- notification consent (profiles.notify_consent).
create or replace function public.notify(
  p_user uuid, p_kind text, p_bubble uuid, p_message text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, bubble_id, message, email_pending)
  values (p_user, p_kind, p_bubble, left(p_message, 500),
          coalesce((select notify_consent from profiles where id = p_user), false));
end;
$$;

-- ─── C. Ownership requests ──────────────────────────────────────────────────

create table public.ownership_requests (
  id           uuid primary key default gen_random_uuid(),
  bubble_id    uuid not null references public.bubbles (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  message      text not null default '' check (char_length(message) <= 1000),
  status       text not null default 'pending'
                 check (status in ('pending', 'escalated', 'accepted', 'declined', 'withdrawn')),
  created_at   timestamptz not null default now(),
  due_at       timestamptz not null,           -- when it goes to the Admins
  decided_by   uuid references public.profiles (id) on delete set null,
  decided_at   timestamptz
);

-- One open request per woman per Bubble.
create unique index one_open_ownership_request
  on public.ownership_requests (bubble_id, requester_id)
  where status in ('pending', 'escalated');

alter table public.ownership_requests enable row level security;

-- Read: the requester, the Bubble's Founder and Admins. All changes go
-- through the functions below; there is deliberately no insert/update policy.
create policy "ownership_select" on public.ownership_requests
  for select to authenticated
  using (requester_id = auth.uid()
         or public.is_bubble_founder(bubble_id)
         or public.is_admin());

-- A Member asks to take over a Bubble.
create or replace function public.request_ownership(p_bubble uuid, p_message text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  b record;
  who text;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select * into b from bubbles where id = p_bubble;
  if not found or b.hidden_at is not null then
    raise exception 'Bubble not found.';
  end if;
  if b.status = 'closed' then
    raise exception 'This Bubble is closed. Fork it to start a new one.';
  end if;
  if not exists (select 1 from bubble_members
                 where bubble_id = p_bubble and user_id = auth.uid()) then
    raise exception 'Only a Member of this Bubble can ask to take it over. Fork it if you only want to use its syllabus.';
  end if;
  if b.founder_id = auth.uid() then
    raise exception 'You are already the Founder of this Bubble.';
  end if;
  if exists (select 1 from ownership_requests
             where bubble_id = p_bubble and requester_id = auth.uid()
               and status in ('pending', 'escalated')) then
    raise exception 'You already have an open request for this Bubble.';
  end if;
  -- Fail early if she could not own another Bubble anyway.
  perform public.assert_can_own_bubble(auth.uid());

  insert into ownership_requests (bubble_id, requester_id, message, due_at)
  values (p_bubble, auth.uid(), coalesce(p_message, ''),
          public.add_working_days(now(), public.platform_setting('ownership_request_working_days')))
  returning id into new_id;

  select name into who from profiles where id = auth.uid();
  perform public.notify(b.founder_id, 'ownership_request', p_bubble,
    coalesce(who, 'A member') || ' asks to take over "' || b.title || '". Please answer within '
    || public.platform_setting('ownership_request_working_days') || ' working days.');

  return new_id;
end;
$$;

-- The Founder (or an Admin) answers. Accepting hands the Bubble over; the
-- old Founder stays in the Bubble as a Member.
create or replace function public.respond_ownership_request(p_request uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  b record;
  other record;
begin
  select * into r from ownership_requests where id = p_request for update;
  if not found then raise exception 'Request not found.'; end if;
  if r.status not in ('pending', 'escalated') then
    raise exception 'This request has already been answered.';
  end if;

  select * into b from bubbles where id = r.bubble_id for update;
  if not (public.is_bubble_founder(r.bubble_id) or public.is_admin()) then
    raise exception 'Only the Founder or an Admin can answer this request.';
  end if;

  if p_accept then
    if not exists (select 1 from bubble_members
                   where bubble_id = r.bubble_id and user_id = r.requester_id) then
      raise exception 'She is no longer a Member of this Bubble.';
    end if;
    if not public.is_admin() then
      perform public.assert_can_own_bubble(r.requester_id);
    end if;

    update bubbles set founder_id = r.requester_id where id = r.bubble_id;
    update bubble_members set role = 'member'
     where bubble_id = r.bubble_id and user_id = b.founder_id;
    update bubble_members set role = 'founder'
     where bubble_id = r.bubble_id and user_id = r.requester_id;

    update ownership_requests
       set status = 'accepted', decided_by = auth.uid(), decided_at = now()
     where id = p_request;
    perform public.notify(r.requester_id, 'ownership_accepted', r.bubble_id,
      'You are now the Founder of "' || b.title || '".');

    -- Anyone else who asked meanwhile is told the Bubble has a new Founder.
    for other in
      select * from ownership_requests
       where bubble_id = r.bubble_id and id <> p_request
         and status in ('pending', 'escalated')
    loop
      update ownership_requests
         set status = 'declined', decided_by = auth.uid(), decided_at = now()
       where id = other.id;
      perform public.notify(other.requester_id, 'ownership_declined', r.bubble_id,
        '"' || b.title || '" was handed to someone else.');
    end loop;
  else
    update ownership_requests
       set status = 'declined', decided_by = auth.uid(), decided_at = now()
     where id = p_request;
    perform public.notify(r.requester_id, 'ownership_declined', r.bubble_id,
      'Your request to take over "' || b.title || '" was declined.');
  end if;
end;
$$;

-- The requester changes her mind.
create or replace function public.withdraw_ownership_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update ownership_requests
     set status = 'withdrawn', decided_by = auth.uid(), decided_at = now()
   where id = p_request and requester_id = auth.uid()
     and status in ('pending', 'escalated');
  if not found then
    raise exception 'No open request of yours with that id.';
  end if;
end;
$$;

-- Daily job: requests that waited past their deadline go to the Admins.
create or replace function public.escalate_overdue_ownership_requests()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  a record;
  b record;
  who text;
  n int := 0;
begin
  for r in
    select * from ownership_requests
     where status = 'pending' and due_at <= now()
     for update
  loop
    select * into b from bubbles where id = r.bubble_id;
    select name into who from profiles where id = r.requester_id;

    update ownership_requests set status = 'escalated' where id = r.id;
    perform public.notify(r.requester_id, 'ownership_escalated', r.bubble_id,
      'Nobody answered in time, so your request for "' || b.title || '" went to the Admin team.');
    for a in select user_id from platform_roles where role = 'admin' loop
      perform public.notify(a.user_id, 'ownership_for_admin', r.bubble_id,
        coalesce(who, 'A member') || ' asked to take over "' || b.title
        || '" and the Founder did not answer in time.');
    end loop;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Schedule the daily job when pg_cron is available (it is on Supabase; turn it
-- on under Database > Extensions if this notice appears).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('escalate-ownership-requests', '15 5 * * *',
                        'select public.escalate_overdue_ownership_requests()');
exception when others then
  raise notice 'pg_cron is not available here, so the daily escalation job was NOT scheduled (%). Enable pg_cron and run: select cron.schedule(''escalate-ownership-requests'', ''15 5 * * *'', ''select public.escalate_overdue_ownership_requests()'');', sqlerrm;
end $$;

-- ─── E. Sessions get a goal ─────────────────────────────────────────────────

alter table public.sessions
  add column goal text check (goal is null or char_length(goal) <= 1000);

-- fork_bubble() now copies each Session's goal as well.
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
    insert into sessions (bubble_id, number, title, goal, status, duration, xp, level)
    values (new_id, i, s.title, s.goal,
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

-- ─── D. Syllabus import ─────────────────────────────────────────────────────
-- Format (version 1), also shown in public/syllabus-template.json:
--   { "format": "we-syllabus", "version": 1,
--     "sessions": [ { "title": "...", "goal": "...", "level": "Beginner",
--       "sections": [ { "type": "brief", "title": "...", "content": "...",
--                       "videos": [ { "title": "...", "url": "https://..." } ] } ] } ] }

create or replace function public._import_err(p_path text, p_msg text)
returns jsonb language sql immutable as $$
  select jsonb_build_object('path', p_path, 'message', p_msg);
$$;

-- Checks a syllabus without saving anything. Returns {ok, errors:[{path,message}]}.
-- Anyone signed in may call it (the screen shows the errors before importing).
create or replace function public.validate_syllabus_import(payload jsonb)
returns jsonb language plpgsql immutable as $$
declare
  errs jsonb := '[]'::jsonb;
  sess jsonb;
  sec jsonb;
  vid jsonb;
  n int;
  si int := 0;
  ci int;
  vi int;
  sp text;
  cp text;
  types text[] := array['learning-path', 'brief', 'video', 'sandbox', 'ai-eval', 'reflection'];
  levels text[] := array['Beginner', 'Intermediate', 'Advanced'];
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(
      public._import_err('', 'The syllabus must be one block of JSON that starts with { and ends with }.')));
  end if;
  if length(payload::text) > 300000 then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(
      public._import_err('', 'The syllabus is too large. Keep it under about 300,000 characters.')));
  end if;
  if payload ->> 'format' is distinct from 'we-syllabus' then
    errs := errs || public._import_err('format', 'The "format" field must be "we-syllabus". Start from the template.');
  end if;
  if payload -> 'version' is distinct from '1'::jsonb then
    errs := errs || public._import_err('version', 'The "version" field must be 1.');
  end if;
  if jsonb_typeof(payload -> 'sessions') is distinct from 'array' then
    errs := errs || public._import_err('sessions', 'The "sessions" field must be a list.');
    return jsonb_build_object('ok', false, 'errors', errs);
  end if;

  n := jsonb_array_length(payload -> 'sessions');
  if n < 1 then errs := errs || public._import_err('sessions', 'The syllabus needs at least one session.'); end if;
  if n > 20 then errs := errs || public._import_err('sessions', 'A syllabus can have at most 20 sessions.'); end if;

  for sess in select * from jsonb_array_elements(payload -> 'sessions') loop
    si := si + 1;
    sp := 'sessions[' || si || ']';
    if jsonb_typeof(sess) <> 'object' then
      errs := errs || public._import_err(sp, 'Session ' || si || ' must be an object.');
      continue;
    end if;
    if jsonb_typeof(sess -> 'title') is distinct from 'string'
       or char_length(trim(sess ->> 'title')) not between 1 and 200 then
      errs := errs || public._import_err(sp || '.title', 'Session ' || si || ' needs a title of 1 to 200 characters.');
    end if;
    if sess ? 'goal' and (jsonb_typeof(sess -> 'goal') <> 'string' or char_length(sess ->> 'goal') > 1000) then
      errs := errs || public._import_err(sp || '.goal', 'Session ' || si || ': the goal must be text of up to 1000 characters.');
    end if;
    if sess ? 'level' and not coalesce(sess ->> 'level' = any (levels), false) then
      errs := errs || public._import_err(sp || '.level', 'Session ' || si || ': the level must be Beginner, Intermediate or Advanced.');
    end if;

    if sess ? 'sections' then
      if jsonb_typeof(sess -> 'sections') <> 'array' then
        errs := errs || public._import_err(sp || '.sections', 'Session ' || si || ': "sections" must be a list.');
        continue;
      end if;
      if jsonb_array_length(sess -> 'sections') > 8 then
        errs := errs || public._import_err(sp || '.sections', 'Session ' || si || ' can have at most 8 sections.');
      end if;
      ci := 0;
      for sec in select * from jsonb_array_elements(sess -> 'sections') loop
        ci := ci + 1;
        cp := sp || '.sections[' || ci || ']';
        if jsonb_typeof(sec) <> 'object' then
          errs := errs || public._import_err(cp, 'Session ' || si || ', section ' || ci || ' must be an object.');
          continue;
        end if;
        if not coalesce(sec ->> 'type' = any (types), false) then
          errs := errs || public._import_err(cp || '.type', 'Session ' || si || ', section ' || ci
            || ': the type must be one of ' || array_to_string(types, ', ') || '.');
        end if;
        if jsonb_typeof(sec -> 'title') is distinct from 'string'
           or char_length(trim(sec ->> 'title')) not between 1 and 200 then
          errs := errs || public._import_err(cp || '.title', 'Session ' || si || ', section ' || ci || ' needs a title of 1 to 200 characters.');
        end if;
        if sec ? 'content' and (jsonb_typeof(sec -> 'content') <> 'string' or char_length(sec ->> 'content') > 8000) then
          errs := errs || public._import_err(cp || '.content', 'Session ' || si || ', section ' || ci || ': the content must be text of up to 8000 characters.');
        end if;
        if sec ? 'videos' then
          if jsonb_typeof(sec -> 'videos') <> 'array' or jsonb_array_length(sec -> 'videos') > 10 then
            errs := errs || public._import_err(cp || '.videos', 'Session ' || si || ', section ' || ci || ': "videos" must be a list of up to 10 links.');
          else
            vi := 0;
            for vid in select * from jsonb_array_elements(sec -> 'videos') loop
              vi := vi + 1;
              if jsonb_typeof(vid) <> 'object'
                 or jsonb_typeof(vid -> 'url') is distinct from 'string'
                 or char_length(vid ->> 'url') > 2000
                 or (vid ->> 'url') !~* '^https://[^[:space:]]+$' then
                errs := errs || public._import_err(cp || '.videos[' || vi || ']',
                  'Session ' || si || ', section ' || ci || ', link ' || vi || ': each link needs a "url" that starts with https://');
              end if;
              if jsonb_typeof(vid) = 'object' and vid ? 'title'
                 and (jsonb_typeof(vid -> 'title') <> 'string' or char_length(vid ->> 'title') > 200) then
                errs := errs || public._import_err(cp || '.videos[' || vi || '].title',
                  'Session ' || si || ', section ' || ci || ', link ' || vi || ': the title must be text of up to 200 characters.');
              end if;
            end loop;
          end if;
        end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object('ok', jsonb_array_length(errs) = 0, 'errors', errs);
end;
$$;

-- Adds the sessions of a valid syllabus to a Bubble (Founder or Admin only).
-- They arrive as locked sessions after any existing ones, so the Founder can
-- review and edit the plan before anyone uses it. Returns how many were added.
create or replace function public.import_syllabus(p_bubble uuid, p_payload jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  b record;
  v jsonb;
  sess jsonb;
  sec jsonb;
  new_session uuid;
  base int;
  existing int;
  added int := 0;
  idx int;
begin
  select * into b from bubbles where id = p_bubble;
  if not found then raise exception 'Bubble not found.'; end if;
  if not (public.is_bubble_founder(p_bubble) or public.is_admin()) then
    raise exception 'Only the Founder or an Admin can import a syllabus.';
  end if;

  v := public.validate_syllabus_import(p_payload);
  if not (v ->> 'ok')::boolean then
    raise exception 'The syllabus has problems: %', (
      select string_agg(e ->> 'message', ' ')
        from (select e from jsonb_array_elements(v -> 'errors') e limit 3) x);
  end if;

  select coalesce(max(number), 0), count(*) filter (where deleted_at is null)
    into base, existing
    from sessions where bubble_id = p_bubble;
  if existing + jsonb_array_length(p_payload -> 'sessions') > 40 then
    raise exception 'A Bubble can have at most 40 sessions.';
  end if;

  for sess in select * from jsonb_array_elements(p_payload -> 'sessions') loop
    added := added + 1;
    insert into sessions (bubble_id, number, title, goal, status, level)
    values (p_bubble, base + added, trim(sess ->> 'title'), nullif(trim(sess ->> 'goal'), ''),
            case when existing = 0 and added = 1 then 'in-progress' else 'locked' end,
            coalesce(sess ->> 'level', b.level))
    returning id into new_session;

    idx := 0;
    for sec in select * from jsonb_array_elements(coalesce(sess -> 'sections', '[]'::jsonb)) loop
      insert into session_sections (session_id, type, title, content, videos, position)
      values (new_session, sec ->> 'type', trim(sec ->> 'title'), sec ->> 'content',
              coalesce((select jsonb_agg(jsonb_build_object(
                          'id', gen_random_uuid()::text,
                          'title', coalesce(vid ->> 'title', ''),
                          'url', vid ->> 'url'))
                          from jsonb_array_elements(coalesce(sec -> 'videos', '[]'::jsonb)) vid),
                       '[]'::jsonb),
              idx);
      idx := idx + 1;
    end loop;
  end loop;

  return added;
end;
$$;

-- ─── F. Hardening ───────────────────────────────────────────────────────────
-- These helpers are only meant to be called by other server functions. By
-- default Supabase lets every signed-in (and anonymous) visitor call any
-- function through the API, which would let anyone create notifications for
-- others or read how many Bubbles another woman learns in.

revoke execute on function public.notify(uuid, text, uuid, text)       from public, anon, authenticated;
revoke execute on function public.learning_seats_in_use(uuid)           from public, anon, authenticated;
revoke execute on function public.assert_can_own_bubble(uuid)           from public, anon, authenticated;
revoke execute on function public.escalate_overdue_ownership_requests() from public, anon, authenticated;
revoke execute on function public.add_working_days(timestamptz, int)    from public, anon, authenticated;
