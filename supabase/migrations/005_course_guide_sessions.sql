-- ════════════════════════════════════════════════════════════════════════════
-- 005 — Course Guide sessions, WhatsApp link
-- ════════════════════════════════════════════════════════════════════════════
-- The redesigned Course Guide (main branch) plans every Session as a
-- facilitator script instead of a list of learning-path/video/sandbox blocks.
-- This migration moves the data model to match it, keeping existing rows:
--
--  A. sessions: status draft | this-week | done (was locked | in-progress | done),
--     plus led_by, pre_materials, homework, submission_types, extra_resources.
--     The existing `goal` column (004) holds the learning objective
--     ("By the end, we'll be able to…").
--  B. session_sections: type check-in | last-week | learn | discuss | practice |
--     wrap-up, plus minutes and notes. `content` holds "what happens".
--     Old section types are mapped, and old section video links become the
--     Session's extra resources.
--  C. save_session(): saves one Session and its steps in one go.
--  D. fork_bubble() and the syllabus import understand the new fields.
--     Import accepts version 1 (old section types, mapped) and version 2.
--  E. bubble_chat_links: the WhatsApp group link, readable only by Members.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── A. Sessions ────────────────────────────────────────────────────────────

alter table public.sessions drop constraint if exists sessions_status_check;
update public.sessions
   set status = case status when 'in-progress' then 'this-week'
                            when 'locked'      then 'draft'
                            else status end;
alter table public.sessions alter column status set default 'draft';
alter table public.sessions
  add constraint sessions_status_check check (status in ('draft', 'this-week', 'done'));

alter table public.sessions
  add column led_by           uuid references public.profiles (id) on delete set null,
  add column pre_materials    text check (pre_materials is null or char_length(pre_materials) <= 4000),
  add column homework         text check (homework is null or char_length(homework) <= 4000),
  add column submission_types text[] not null default array['link']::text[]
    check (submission_types <@ array['text', 'file', 'link', 'image']::text[]),
  add column extra_resources  jsonb not null default '[]'::jsonb
    check (jsonb_typeof(extra_resources) = 'array' and jsonb_array_length(extra_resources) <= 20);

comment on column public.sessions.goal is
  'Learning objective: "By the end, we''ll be able to…"';

-- Existing Sessions are led by their Bubble's Founder until someone changes it.
update public.sessions s
   set led_by = b.founder_id
  from public.bubbles b
 where b.id = s.bubble_id and s.led_by is null;

-- ─── B. Session sections ("During the meeting" steps) ───────────────────────

alter table public.session_sections drop constraint if exists session_sections_type_check;

alter table public.session_sections
  add column minutes int not null default 15 check (minutes between 1 and 240),
  add column notes   text check (notes is null or char_length(notes) <= 2000);

comment on column public.session_sections.content is 'What happens in this step';

-- Old video links move to the Session's extra resources (only http(s) links).
update public.sessions s
   set extra_resources = s.extra_resources || v.items
  from (
    select ss.session_id,
           jsonb_agg(jsonb_build_object(
             'id', coalesce(vid ->> 'id', gen_random_uuid()::text),
             'title', coalesce(nullif(vid ->> 'title', ''), ss.title),
             'url', vid ->> 'url',
             'description', '')
           order by ss.position) as items
      from public.session_sections ss,
           jsonb_array_elements(coalesce(ss.videos, '[]'::jsonb)) vid
     where ss.deleted_at is null
       and (vid ->> 'url') ~* '^https?://'
     group by ss.session_id
  ) v
 where v.session_id = s.id;

update public.session_sections
   set type = case type
                when 'learning-path' then 'learn'
                when 'brief'         then 'learn'
                when 'video'         then 'learn'
                when 'sandbox'       then 'practice'
                when 'ai-eval'       then 'practice'
                when 'reflection'    then 'wrap-up'
                else type end,
       videos = '[]'::jsonb;

alter table public.session_sections
  add constraint session_sections_type_check check (type in
    ('check-in', 'last-week', 'learn', 'discuss', 'practice', 'wrap-up'));

-- ─── C. save_session() ──────────────────────────────────────────────────────
-- Saves a Session's fields and replaces its steps with the given list.
-- Steps whose id matches a live step of this Session are updated; the rest are
-- inserted; live steps missing from the list are soft-deleted.
-- Runs as the caller, so the normal row security decides who may save
-- (the Founder or an Admin). Returns the step ids in order.

create or replace function public.save_session(p_session uuid, p_fields jsonb, p_sections jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  sec jsonb;
  sec_id uuid;
  ids jsonb := '[]'::jsonb;
  keep uuid[] := '{}';
  idx int := 0;
  touched int;
begin
  if jsonb_typeof(coalesce(p_sections, '[]'::jsonb)) <> 'array' then
    raise exception 'Steps must be a list.';
  end if;
  if jsonb_array_length(coalesce(p_sections, '[]'::jsonb)) > 12 then
    raise exception 'A session can have at most 12 steps.';
  end if;

  update sessions set
    title            = coalesce(nullif(trim(p_fields ->> 'title'), ''), title),
    session_date     = case when p_fields ? 'date'
                            then nullif(p_fields ->> 'date', '')::date else session_date end,
    level            = coalesce(p_fields ->> 'level', level),
    status           = coalesce(p_fields ->> 'status', status),
    goal             = case when p_fields ? 'learningObjective'
                            then nullif(trim(p_fields ->> 'learningObjective'), '') else goal end,
    led_by           = case when p_fields ? 'ledBy'
                            then nullif(p_fields ->> 'ledBy', '')::uuid else led_by end,
    pre_materials    = case when p_fields ? 'preMaterials'
                            then nullif(trim(p_fields ->> 'preMaterials'), '') else pre_materials end,
    homework         = case when p_fields ? 'homework'
                            then nullif(trim(p_fields ->> 'homework'), '') else homework end,
    submission_types = case when p_fields ? 'submissionTypes'
                            then array(select jsonb_array_elements_text(p_fields -> 'submissionTypes'))
                            else submission_types end,
    extra_resources  = case when p_fields ? 'extraResources'
                            then p_fields -> 'extraResources' else extra_resources end,
    duration         = coalesce((p_fields ->> 'duration')::int, duration)
  where id = p_session and deleted_at is null;
  get diagnostics touched = row_count;
  if touched = 0 then
    raise exception 'Session not found, or you are not allowed to edit it.';
  end if;

  for sec in select * from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) loop
    sec_id := null;
    if (sec ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      update session_sections set
        type     = sec ->> 'type',
        title    = trim(sec ->> 'title'),
        minutes  = coalesce((sec ->> 'minutes')::int, minutes),
        content  = nullif(sec ->> 'whatHappens', ''),
        notes    = nullif(sec ->> 'notes', ''),
        position = idx
      where id = (sec ->> 'id')::uuid and session_id = p_session and deleted_at is null
      returning id into sec_id;
    end if;
    if sec_id is null then
      insert into session_sections (session_id, type, title, minutes, content, notes, position)
      values (p_session, sec ->> 'type', trim(sec ->> 'title'),
              coalesce((sec ->> 'minutes')::int, 15),
              nullif(sec ->> 'whatHappens', ''), nullif(sec ->> 'notes', ''), idx)
      returning id into sec_id;
    end if;
    keep := keep || sec_id;
    ids := ids || to_jsonb(sec_id::text);
    idx := idx + 1;
  end loop;

  update session_sections set deleted_at = now()
   where session_id = p_session and deleted_at is null and not (id = any (keep));

  return ids;
end;
$$;

-- Extra resources: only web links, each with a title (defense in depth vs XSS).
create or replace function public.valid_extra_resources(r jsonb)
returns boolean language sql immutable as $$
  select jsonb_typeof(r) = 'array'
     and not exists (
       select 1 from jsonb_array_elements(r) e
        where jsonb_typeof(e) <> 'object'
           or coalesce(e ->> 'url', '') !~* '^https?://[^[:space:]]+$'
           or char_length(coalesce(e ->> 'url', '')) > 2000
           or char_length(coalesce(e ->> 'title', '')) > 200
           or char_length(coalesce(e ->> 'description', '')) > 1000);
$$;

alter table public.sessions
  add constraint sessions_extra_resources_valid check (public.valid_extra_resources(extra_resources));

-- ─── D1. fork_bubble() copies the facilitator plan ─────────────────────────

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

  -- Every copied Session starts as a draft led by the new Founder.
  for s in
    select * from sessions
     where bubble_id = src.id and deleted_at is null
     order by number
  loop
    i := i + 1;
    insert into sessions (bubble_id, number, title, goal, status, duration, xp, level,
                          led_by, pre_materials, homework, submission_types, extra_resources)
    values (new_id, i, s.title, s.goal, 'draft', s.duration, s.xp, s.level,
            auth.uid(), s.pre_materials, s.homework, s.submission_types, s.extra_resources)
    returning id into new_session;

    insert into session_sections (session_id, type, title, minutes, content, notes, position)
    select new_session, type, title, minutes, content, notes, position
      from session_sections
     where session_id = s.id and deleted_at is null;
  end loop;

  return new_id;
end;
$$;

-- ─── D2. Syllabus import, versions 1 and 2 ─────────────────────────────────
-- Version 2 (public/syllabus-template.json):
--   { "format": "we-syllabus", "version": 2,
--     "sessions": [ { "title", "goal", "level", "preMaterials", "homework",
--                     "resources": [ { "title", "url", "description" } ],
--                     "sections": [ { "type", "title", "minutes", "content", "notes" } ] } ] }
-- Version 1 is still accepted: its section types are mapped and its section
-- "videos" become the Session's resources.

create or replace function public._import_section_type(t text)
returns text language sql immutable as $$
  select case t
    when 'learning-path' then 'learn'
    when 'brief'         then 'learn'
    when 'video'         then 'learn'
    when 'sandbox'       then 'practice'
    when 'ai-eval'       then 'practice'
    when 'reflection'    then 'wrap-up'
    else t end;
$$;

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
  ver int;
  types text[];
  v1_types text[] := array['learning-path', 'brief', 'video', 'sandbox', 'ai-eval', 'reflection'];
  v2_types text[] := array['check-in', 'last-week', 'learn', 'discuss', 'practice', 'wrap-up'];
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
  if payload -> 'version' = '1'::jsonb then
    ver := 1; types := v1_types || v2_types;
  elsif payload -> 'version' = '2'::jsonb then
    ver := 2; types := v2_types;
  else
    errs := errs || public._import_err('version', 'The "version" field must be 2 (or 1 for older files).');
    ver := 2; types := v2_types;
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
    if sess ? 'preMaterials' and (jsonb_typeof(sess -> 'preMaterials') <> 'string' or char_length(sess ->> 'preMaterials') > 4000) then
      errs := errs || public._import_err(sp || '.preMaterials', 'Session ' || si || ': "preMaterials" must be text of up to 4000 characters.');
    end if;
    if sess ? 'homework' and (jsonb_typeof(sess -> 'homework') <> 'string' or char_length(sess ->> 'homework') > 4000) then
      errs := errs || public._import_err(sp || '.homework', 'Session ' || si || ': "homework" must be text of up to 4000 characters.');
    end if;
    if sess ? 'resources' then
      if jsonb_typeof(sess -> 'resources') <> 'array' or jsonb_array_length(sess -> 'resources') > 10 then
        errs := errs || public._import_err(sp || '.resources', 'Session ' || si || ': "resources" must be a list of up to 10 links.');
      else
        vi := 0;
        for vid in select * from jsonb_array_elements(sess -> 'resources') loop
          vi := vi + 1;
          if jsonb_typeof(vid) <> 'object'
             or jsonb_typeof(vid -> 'url') is distinct from 'string'
             or char_length(vid ->> 'url') > 2000
             or (vid ->> 'url') !~* '^https://[^[:space:]]+$' then
            errs := errs || public._import_err(sp || '.resources[' || vi || ']',
              'Session ' || si || ', resource ' || vi || ': each resource needs a "url" that starts with https://');
          end if;
          if jsonb_typeof(vid) = 'object'
             and ((vid ? 'title' and (jsonb_typeof(vid -> 'title') <> 'string' or char_length(vid ->> 'title') > 200))
               or (vid ? 'description' and (jsonb_typeof(vid -> 'description') <> 'string' or char_length(vid ->> 'description') > 1000))) then
            errs := errs || public._import_err(sp || '.resources[' || vi || ']',
              'Session ' || si || ', resource ' || vi || ': the title must be up to 200 characters and the description up to 1000.');
          end if;
        end loop;
      end if;
    end if;

    if sess ? 'sections' then
      if jsonb_typeof(sess -> 'sections') <> 'array' then
        errs := errs || public._import_err(sp || '.sections', 'Session ' || si || ': "sections" must be a list.');
        continue;
      end if;
      if jsonb_array_length(sess -> 'sections') > 12 then
        errs := errs || public._import_err(sp || '.sections', 'Session ' || si || ' can have at most 12 sections.');
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
            || ': the type must be one of ' || array_to_string(case when ver = 1 then v1_types else v2_types end, ', ') || '.');
        end if;
        if jsonb_typeof(sec -> 'title') is distinct from 'string'
           or char_length(trim(sec ->> 'title')) not between 1 and 200 then
          errs := errs || public._import_err(cp || '.title', 'Session ' || si || ', section ' || ci || ' needs a title of 1 to 200 characters.');
        end if;
        if sec ? 'minutes' and (jsonb_typeof(sec -> 'minutes') <> 'number'
             or (sec ->> 'minutes')::numeric <> floor((sec ->> 'minutes')::numeric)
             or (sec ->> 'minutes')::numeric not between 1 and 240) then
          errs := errs || public._import_err(cp || '.minutes', 'Session ' || si || ', section ' || ci || ': "minutes" must be a whole number from 1 to 240.');
        end if;
        if sec ? 'content' and (jsonb_typeof(sec -> 'content') <> 'string' or char_length(sec ->> 'content') > 8000) then
          errs := errs || public._import_err(cp || '.content', 'Session ' || si || ', section ' || ci || ': the content must be text of up to 8000 characters.');
        end if;
        if sec ? 'notes' and (jsonb_typeof(sec -> 'notes') <> 'string' or char_length(sec ->> 'notes') > 2000) then
          errs := errs || public._import_err(cp || '.notes', 'Session ' || si || ', section ' || ci || ': the notes must be text of up to 2000 characters.');
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
-- They arrive as drafts after any existing ones, so the Founder can review and
-- edit the plan before anyone uses it. Returns how many were added.
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
  res jsonb;
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

    -- Session resources = "resources" (v2) plus any section "videos" (v1).
    select coalesce(jsonb_agg(r), '[]'::jsonb) into res from (
      select jsonb_build_object('id', gen_random_uuid()::text,
                                'title', coalesce(nullif(x ->> 'title', ''), x ->> 'url'),
                                'url', x ->> 'url',
                                'description', coalesce(x ->> 'description', '')) r
        from jsonb_array_elements(coalesce(sess -> 'resources', '[]'::jsonb)) x
      union all
      select jsonb_build_object('id', gen_random_uuid()::text,
                                'title', coalesce(nullif(x ->> 'title', ''), sc ->> 'title'),
                                'url', x ->> 'url',
                                'description', '')
        from jsonb_array_elements(coalesce(sess -> 'sections', '[]'::jsonb)) sc,
             jsonb_array_elements(coalesce(sc -> 'videos', '[]'::jsonb)) x
    ) q;
    if jsonb_array_length(res) > 20 then
      raise exception 'Session %: at most 20 links in total.', added;
    end if;

    insert into sessions (bubble_id, number, title, goal, status, level, led_by,
                          pre_materials, homework, extra_resources)
    values (p_bubble, base + added, trim(sess ->> 'title'), nullif(trim(sess ->> 'goal'), ''),
            'draft', coalesce(sess ->> 'level', b.level), b.founder_id,
            nullif(trim(sess ->> 'preMaterials'), ''), nullif(trim(sess ->> 'homework'), ''), res)
    returning id into new_session;

    idx := 0;
    for sec in select * from jsonb_array_elements(coalesce(sess -> 'sections', '[]'::jsonb)) loop
      insert into session_sections (session_id, type, title, minutes, content, notes, position)
      values (new_session, public._import_section_type(sec ->> 'type'), trim(sec ->> 'title'),
              coalesce((sec ->> 'minutes')::int, 15),
              nullif(sec ->> 'content', ''), nullif(sec ->> 'notes', ''), idx);
      idx := idx + 1;
    end loop;
  end loop;

  return added;
end;
$$;

revoke execute on function public._import_section_type(text) from public, anon;

-- ─── E. WhatsApp group link ─────────────────────────────────────────────────
-- Bubbles are publicly listed, so the chat link lives in its own table that
-- only the Bubble's Members (and Admins) can read. Only the Founder or an
-- Admin can set it.

create table public.bubble_chat_links (
  bubble_id     uuid primary key references public.bubbles (id) on delete cascade,
  whatsapp_link text not null
    check (char_length(whatsapp_link) <= 500
           and whatsapp_link ~* '^https://(chat\.whatsapp\.com|wa\.me|whatsapp\.com)/[^[:space:]]*$'),
  updated_at    timestamptz not null default now()
);

alter table public.bubble_chat_links enable row level security;

create policy "chat_links_select_members" on public.bubble_chat_links
  for select to authenticated
  using (public.is_bubble_member(bubble_id) or public.is_admin());
create policy "chat_links_insert_founder" on public.bubble_chat_links
  for insert to authenticated
  with check (public.is_bubble_founder(bubble_id) or public.is_admin());
create policy "chat_links_update_founder" on public.bubble_chat_links
  for update to authenticated
  using (public.is_bubble_founder(bubble_id) or public.is_admin())
  with check (public.is_bubble_founder(bubble_id) or public.is_admin());
create policy "chat_links_delete_founder" on public.bubble_chat_links
  for delete to authenticated
  using (public.is_bubble_founder(bubble_id) or public.is_admin());
