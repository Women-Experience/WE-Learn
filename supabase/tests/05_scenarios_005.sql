\o /dev/null
-- Scenarios for migration 005: Course Guide sessions and the WhatsApp link.
-- Runs after 03/04, so it also checks how their rows were migrated.
-- At this point: o1 is founded by Mia (14); Kim (12) and Lea (13) are Members;
-- Noa (15) is not a Member (she forked o1 as f3). Ada (9) is an Admin.

-- data migration ------------------------------------------------------------------------------
select test.chk('005: statuses mapped (in-progress → this-week, locked → draft)',
  (select string_agg(number||'='||status, ',' order by number) from sessions where bubble_id=(select id from test.ids where name='o1')), '1=this-week,2=draft');
select test.chk('005: no old statuses remain', (select count(*)::text from sessions where status not in ('draft','this-week','done')), '0');
select test.chk('005: section types mapped',
  (select string_agg(type, ',' order by position) from session_sections where session_id=(select id from sessions where bubble_id=(select id from test.ids where name='o1') and number=1)),
  'learn,learn,practice,wrap-up');
select test.chk('005: old video links became the session''s extra resources',
  (select (jsonb_array_length(extra_resources) = 1 and extra_resources->0->>'url' like 'https://%')::text from sessions where bubble_id=(select id from test.ids where name='o1') and number=1), 'true');
select test.chk('005: section video lists were emptied', (select count(*)::text from session_sections where videos <> '[]'::jsonb), '0');
select test.chk('005: existing sessions are led by the Founder',
  (select count(*)::text from sessions s join bubbles b on b.id=s.bubble_id where s.led_by is distinct from b.founder_id), '0');
select test.chk('005: steps default to 15 minutes', (select min(minutes)::text from session_sections), '15');

-- save_session ----------------------------------------------------------------------------------
insert into test.ids select 'o1s1', id from sessions where bubble_id=(select id from test.ids where name='o1') and number=1;
insert into test.ids select 'o1sec0', id from session_sections where session_id=(select id from test.ids where name='o1s1') and position=0;

select test.chk('Founder saves a session with 2 steps (1 kept, 1 new)', test.val('00000000-0000-0000-0000-000000000014', format($$
  select jsonb_array_length(public.save_session(%L,
    '{"title":"Intro","date":"2026-03-04","learningObjective":"explain three ideas","ledBy":"00000000-0000-0000-0000-000000000013",
      "preMaterials":"Read this","homework":"Map one product","submissionTypes":["link","text"],"status":"this-week",
      "extraResources":[{"id":"x","title":"NN/g","url":"https://nngroup.com","description":"good"}],"duration":40}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('id', %L, 'type','check-in','title','Check-in','minutes',10,'whatHappens','Round of names'),
      jsonb_build_object('id','step-123','type','discuss','title','Discuss','minutes',30,'notes','Pairs')))
  )::text$$, (select id from test.ids where name='o1s1'), (select id from test.ids where name='o1sec0'))), '2');
select test.chk('saved fields',
  (select title||'|'||session_date||'|'||goal||'|'||led_by||'|'||homework||'|'||array_to_string(submission_types,'+')||'|'||duration
     from sessions where id=(select id from test.ids where name='o1s1')),
  'Intro|2026-03-04|explain three ideas|00000000-0000-0000-0000-000000000013|Map one product|link+text|40');
select test.chk('kept step updated in place', (select type||'/'||minutes||'/'||content from session_sections where id=(select id from test.ids where name='o1sec0')), 'check-in/10/Round of names');
select test.chk('steps in order, others soft-deleted',
  (select string_agg(type||':'||position, ',' order by position) from session_sections where session_id=(select id from test.ids where name='o1s1') and deleted_at is null), 'check-in:0,discuss:1');
select test.chk('removed steps are kept as soft-deleted', (select count(*)::text from session_sections where session_id=(select id from test.ids where name='o1s1') and deleted_at is not null), '3');
select test.expect_err('00000000-0000-0000-0000-000000000012', format($$select public.save_session(%L, '{"title":"hacked"}'::jsonb, '[]'::jsonb)$$, (select id from test.ids where name='o1s1')),
  '%not allowed to edit%', 'a Member cannot save a session');
select test.chk('…and nothing changed', (select title from sessions where id=(select id from test.ids where name='o1s1')), 'Intro');
select test.expect_err('00000000-0000-0000-0000-000000000015', format($$select public.save_session(%L, '{"title":"hacked"}'::jsonb, '[]'::jsonb)$$, (select id from test.ids where name='o1s1')),
  '%not allowed to edit%', 'a non-member cannot save a session');
select test.expect_err('00000000-0000-0000-0000-000000000014', format($$select public.save_session(%L, '{}'::jsonb, '[{"type":"quiz","title":"t"}]'::jsonb)$$, (select id from test.ids where name='o1s1')),
  '%session_sections_type_check%', 'unknown step types are refused');
select test.expect_err('00000000-0000-0000-0000-000000000014', format($$select public.save_session(%L, '{"extraResources":[{"title":"x","url":"javascript:alert(1)"}]}'::jsonb, '[]'::jsonb)$$, (select id from test.ids where name='o1s1')),
  '%extra_resources_valid%', 'javascript: links are refused in extra resources');
select test.expect_err('00000000-0000-0000-0000-000000000014', format($$select public.save_session(%L, '{"submissionTypes":["video"]}'::jsonb, '[]'::jsonb)$$, (select id from test.ids where name='o1s1')),
  '%submission_types%', 'unknown submission types are refused');
select test.expect_err('00000000-0000-0000-0000-000000000014', format($$select public.save_session(%L, '{"status":"locked"}'::jsonb, '[]'::jsonb)$$, (select id from test.ids where name='o1s1')),
  '%sessions_status_check%', 'old statuses are refused');
select test.chk('a refused save changes nothing',
  (select count(*)::text from session_sections where session_id=(select id from test.ids where name='o1s1') and deleted_at is null), '2');
select test.expect_ok('00000000-0000-0000-0000-000000000009', format($$select public.save_session(%L, '{"title":"Intro"}'::jsonb, '[{"type":"learn","title":"Learn","minutes":20}]'::jsonb)$$, (select id from test.ids where name='o1s1')),
  'an Admin can save a session');

-- fork --------------------------------------------------------------------------------------------
insert into test.ids select 'f5', test.val('00000000-0000-0000-0000-000000000015',
  format($$select public.fork_bubble(%L)::text$$, (select id from test.ids where name='o1')))::uuid;
select test.chk('fork: every session starts as a draft led by the new Founder',
  (select string_agg(status||'/'||(led_by = '00000000-0000-0000-0000-000000000015')::text, ',' order by number) from sessions where bubble_id=(select id from test.ids where name='f5')), 'draft/true,draft/true');
select test.chk('fork: plan copied (objective, homework, resources, steps with minutes)',
  (select goal||'|'||homework||'|'||jsonb_array_length(extra_resources)||'|'||(select string_agg(type||':'||minutes, ',') from session_sections ss where ss.session_id=s.id and ss.deleted_at is null)
     from sessions s where bubble_id=(select id from test.ids where name='f5') and number=1),
  'explain three ideas|Map one product|1|learn:20');

-- import, version 2 and version 1 -----------------------------------------------------------------
select test.chk('the shipped template (version 2) is valid', (public.validate_syllabus_import(:'template'::jsonb) ->> 'ok'), 'true');
select test.chk('version 1 files are still valid', (public.validate_syllabus_import(:'template_v1'::jsonb) ->> 'ok'), 'true');
select test.chk('Mia imports the version 2 template', test.val('00000000-0000-0000-0000-000000000014',
  format($$select public.import_syllabus(%L, %L::jsonb)::text$$, (select id from test.ids where name='o1'), :'template')), '1');
select test.chk('v2 import: draft, numbered 3, led by the Founder, with plan',
  (select number||'/'||status||'/'||(led_by='00000000-0000-0000-0000-000000000014')::text||'/'||(pre_materials is not null)::text||'/'||(homework is not null)::text||'/'||jsonb_array_length(extra_resources)
     from sessions where bubble_id=(select id from test.ids where name='o1') and number=3), '3/draft/true/true/true/1');
select test.chk('v2 import: steps with minutes',
  (select string_agg(type||':'||minutes, ',' order by position) from session_sections where session_id=(select id from sessions where bubble_id=(select id from test.ids where name='o1') and number=3)),
  'check-in:10,last-week:15,learn:30,discuss:25,wrap-up:10');
select test.chk('Mia imports a version 1 file', test.val('00000000-0000-0000-0000-000000000014',
  format($$select public.import_syllabus(%L, %L::jsonb)::text$$, (select id from test.ids where name='o1'), :'template_v1')), '1');
select test.chk('v1 import: types mapped and video moved to resources',
  (select (select string_agg(type, ',' order by position) from session_sections where session_id=s.id)||'|'||jsonb_array_length(extra_resources)
     from sessions s where bubble_id=(select id from test.ids where name='o1') and number=4), 'learn,learn,practice,wrap-up|1');
select test.bad('v2 rejects old section types', '{"format":"we-syllabus","version":2,"sessions":[{"title":"a","sections":[{"type":"brief","title":"t"}]}]}', '%type must be one of check-in%');
select test.bad('v2 rejects fractional minutes', '{"format":"we-syllabus","version":2,"sessions":[{"title":"a","sections":[{"type":"learn","title":"t","minutes":2.5}]}]}', '%whole number%');
select test.bad('v2 rejects http:// resources', '{"format":"we-syllabus","version":2,"sessions":[{"title":"a","resources":[{"url":"http://x.org"}]}]}', '%https://%');
select test.bad('v2 rejects more than 12 steps',
  (select jsonb_build_object('format','we-syllabus','version',2,'sessions',jsonb_build_array(jsonb_build_object('title','s','sections',jsonb_agg(jsonb_build_object('type','learn','title','t'||g))))) from generate_series(1,13) g), '%at most 12 sections%');

select test.chk('the demo course (10 sessions) is valid', (public.validate_syllabus_import(:'demo'::jsonb) ->> 'ok'), 'true');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000016','o@x.org','{"full_name":"Ora"}');
insert into test.ids select 'demo', test.val('00000000-0000-0000-0000-000000000016',
  $$select public.create_bubble('Demo','AI-Native Product Design','d','Intermediate',8,'Tuesday','7:00 PM')::text$$)::uuid;
select test.chk('the demo course imports with every step and homework', test.val('00000000-0000-0000-0000-000000000016',
  format($$select public.import_syllabus(%L, %L::jsonb)::text$$, (select id from test.ids where name='demo'), :'demo')), '10');
select test.chk('demo: 50 steps, 9 homeworks, objectives on all',
  (select (select count(*) from session_sections ss join sessions s2 on s2.id=ss.session_id where s2.bubble_id=s.bubble_id)||'/'||count(homework)||'/'||count(goal)
     from sessions s where bubble_id=(select id from test.ids where name='demo') group by bubble_id), '50/9/10');

-- WhatsApp link -------------------------------------------------------------------------------------
select test.expect_ok('00000000-0000-0000-0000-000000000014', format($$insert into bubble_chat_links (bubble_id, whatsapp_link) values (%L, 'https://chat.whatsapp.com/AbC123')$$, (select id from test.ids where name='o1')), 'Founder sets the WhatsApp link');
select test.chk('a Member can read it', test.val('00000000-0000-0000-0000-000000000012', $$select count(*)::text from bubble_chat_links$$), '1');
select test.chk('a non-member cannot', test.val('00000000-0000-0000-0000-000000000015', format($$select count(*)::text from bubble_chat_links where bubble_id=%L$$, (select id from test.ids where name='o1'))), '0');
select test.chk('a visitor cannot', test.val_anon($$select count(*)::text from bubble_chat_links$$), '0');
select test.chk('a Member cannot change it', test.val('00000000-0000-0000-0000-000000000012', $$with u as (update bubble_chat_links set whatsapp_link='https://chat.whatsapp.com/evil' returning 1) select count(*)::text from u$$), '0');
select test.expect_err('00000000-0000-0000-0000-000000000012', format($$insert into bubble_chat_links (bubble_id, whatsapp_link) values (%L, 'https://chat.whatsapp.com/x') on conflict (bubble_id) do update set whatsapp_link = excluded.whatsapp_link$$, (select id from test.ids where name='o1')),
  '%row-level security%', 'a Member cannot upsert it');
select test.expect_err('00000000-0000-0000-0000-000000000014', format($$update bubble_chat_links set whatsapp_link='https://evil.example/x' where bubble_id=%L$$, (select id from test.ids where name='o1')),
  '%whatsapp_link_check%', 'only WhatsApp links are accepted');
select test.expect_ok('00000000-0000-0000-0000-000000000014', format($$delete from bubble_chat_links where bubble_id=%L$$, (select id from test.ids where name='o1')), 'Founder can remove it');
select test.chk('…and it is gone', (select count(*)::text from bubble_chat_links), '0');
