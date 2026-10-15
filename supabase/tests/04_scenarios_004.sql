\o /dev/null
-- Scenarios for migration 004: working days, notifications, ownership
-- requests, escalation, hardening, syllabus import.
-- Needs the psql variable :template (run.sh passes public/syllabus-template.json).

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000012','k@x.org','{"full_name":"Kim"}'),
 ('00000000-0000-0000-0000-000000000013','l@x.org','{"full_name":"Lea"}'),
 ('00000000-0000-0000-0000-000000000014','m@x.org','{"full_name":"Mia"}'),
 ('00000000-0000-0000-0000-000000000015','n@x.org','{"full_name":"Noa"}');
-- K=12 L=13 M=14 N=15
update profiles set notify_consent = true where id = '00000000-0000-0000-0000-000000000012';

-- working days (Sunday to Thursday) ---------------------------------------------
select test.chk('5 working days after a Thursday = next Thursday',
  (public.add_working_days(timestamptz '2026-10-15 12:00+03', 5) at time zone 'Asia/Jerusalem')::text, '2026-10-22 12:00:00');
select test.chk('5 working days after a Friday = the following Thursday',
  (public.add_working_days(timestamptz '2026-10-16 12:00+03', 5) at time zone 'Asia/Jerusalem')::text, '2026-10-22 12:00:00');
insert into non_working_days values ('2026-10-19','test holiday');
select test.chk('a listed day off is skipped',
  (public.add_working_days(timestamptz '2026-10-15 12:00+03', 5) at time zone 'Asia/Jerusalem')::text, '2026-10-25 12:00:00');
delete from non_working_days;
select test.expect_err('00000000-0000-0000-0000-000000000003', $$insert into non_working_days values ('2026-12-25','x')$$, '%row-level security%', 'non-admin cannot add days off');
select test.expect_ok('00000000-0000-0000-0000-000000000009', $$insert into non_working_days values ('2026-12-25','x')$$, 'Admin adds a day off');
delete from non_working_days;

-- a Bubble with three women ---------------------------------------------------------
insert into test.ids select 'o1', test.val('00000000-0000-0000-0000-000000000012',
  $$select public.create_bubble('Owned','T','d','Beginner',8,'Sunday','7:00 PM')::text$$)::uuid;
select test.expect_ok('00000000-0000-0000-0000-000000000013', format($$select public.join_bubble(%L)$$, (select id from test.ids where name='o1')), 'Lea joins');
select test.expect_ok('00000000-0000-0000-0000-000000000014', format($$select public.join_bubble(%L)$$, (select id from test.ids where name='o1')), 'Mia joins');

-- ownership requests ------------------------------------------------------------------
select test.expect_err('00000000-0000-0000-0000-000000000015', format($$select public.request_ownership(%L)$$, (select id from test.ids where name='o1')), '%Only a Member%', 'non-member cannot ask for ownership');
select test.expect_err('00000000-0000-0000-0000-000000000012', format($$select public.request_ownership(%L)$$, (select id from test.ids where name='o1')), '%already the Founder%', 'Founder cannot ask for her own Bubble');
insert into test.ids select 'r1', test.val('00000000-0000-0000-0000-000000000013',
  format($$select public.request_ownership(%L, 'I would like to run it')::text$$, (select id from test.ids where name='o1')))::uuid;
select test.chk('Founder is notified, with email queued (she consented)',
  (select kind||'/'||email_pending::text from notifications where user_id='00000000-0000-0000-0000-000000000012' order by created_at desc limit 1), 'ownership_request/true');
select test.chk('request deadline is set', (select (due_at > now())::text from ownership_requests where id=(select id from test.ids where name='r1')), 'true');
select test.expect_err('00000000-0000-0000-0000-000000000013', format($$select public.request_ownership(%L)$$, (select id from test.ids where name='o1')), '%already have an open request%', 'only one open request per woman');
select test.chk('requester sees her request', test.val('00000000-0000-0000-0000-000000000013', $$select count(*)::text from ownership_requests$$), '1');
select test.chk('another Member cannot see it', test.val('00000000-0000-0000-0000-000000000014', $$select count(*)::text from ownership_requests$$), '0');
select test.chk('Founder sees it', test.val('00000000-0000-0000-0000-000000000012', $$select count(*)::text from ownership_requests$$), '1');
select test.chk('Admin sees it', test.val('00000000-0000-0000-0000-000000000009', $$select count(*)::text from ownership_requests$$), '1');
select test.expect_err('00000000-0000-0000-0000-000000000013', format($$insert into ownership_requests (bubble_id, requester_id, due_at) values (%L, '00000000-0000-0000-0000-000000000013', now())$$, (select id from test.ids where name='o1')), '%row-level security%', 'requests cannot be inserted directly');
select test.chk('requests cannot be changed directly', test.val('00000000-0000-0000-0000-000000000013', $$with u as (update ownership_requests set status='accepted' returning 1) select count(*)::text from u$$), '0');
insert into test.ids select 'r2', test.val('00000000-0000-0000-0000-000000000014',
  format($$select public.request_ownership(%L)::text$$, (select id from test.ids where name='o1')))::uuid;

-- answering ------------------------------------------------------------------------------
select test.expect_err('00000000-0000-0000-0000-000000000014', format($$select public.respond_ownership_request(%L, true)$$, (select id from test.ids where name='r1')), '%Only the Founder or an Admin%', 'a Member cannot answer a request');
select test.expect_ok('00000000-0000-0000-0000-000000000012', format($$select public.respond_ownership_request(%L, true)$$, (select id from test.ids where name='r1')), 'Founder accepts Lea');
select test.chk('Lea is now Founder', (select founder_id::text from bubbles where id=(select id from test.ids where name='o1')), '00000000-0000-0000-0000-000000000013');
select test.chk('roles swapped', (select string_agg(user_id::text||'='||role, ',' order by user_id) from bubble_members where bubble_id=(select id from test.ids where name='o1') and user_id in ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000013')), '00000000-0000-0000-0000-000000000012=member,00000000-0000-0000-0000-000000000013=founder');
select test.chk('Kim keeps her seat as a Member', (select holds_seat::text from bubble_members where bubble_id=(select id from test.ids where name='o1') and user_id='00000000-0000-0000-0000-000000000012'), 'true');
select test.chk('Mia''s competing request was declined', (select status from ownership_requests where id=(select id from test.ids where name='r2')), 'declined');
select test.chk('Lea told she is Founder', (select kind from notifications where user_id='00000000-0000-0000-0000-000000000013' and kind='ownership_accepted' limit 1), 'ownership_accepted');
select test.chk('Mia told it went elsewhere', (select kind from notifications where user_id='00000000-0000-0000-0000-000000000014' and kind='ownership_declined' limit 1), 'ownership_declined');
select test.chk('no email queued for Lea (no consent)', (select email_pending::text from notifications where user_id='00000000-0000-0000-0000-000000000013' and kind='ownership_accepted' limit 1), 'false');
select test.expect_err('00000000-0000-0000-0000-000000000013', format($$select public.respond_ownership_request(%L, false)$$, (select id from test.ids where name='r1')), '%already been answered%', 'cannot answer twice');

-- decline and withdraw -----------------------------------------------------------------
insert into test.ids select 'r3', test.val('00000000-0000-0000-0000-000000000014',
  format($$select public.request_ownership(%L)::text$$, (select id from test.ids where name='o1')))::uuid;
select test.expect_ok('00000000-0000-0000-0000-000000000013', format($$select public.respond_ownership_request(%L, false)$$, (select id from test.ids where name='r3')), 'Founder declines');
select test.chk('declined status', (select status from ownership_requests where id=(select id from test.ids where name='r3')), 'declined');
insert into test.ids select 'r4', test.val('00000000-0000-0000-0000-000000000014',
  format($$select public.request_ownership(%L)::text$$, (select id from test.ids where name='o1')))::uuid;
select test.expect_err('00000000-0000-0000-0000-000000000012', format($$select public.withdraw_ownership_request(%L)$$, (select id from test.ids where name='r4')), '%No open request of yours%', 'only the requester can withdraw');
select test.expect_ok('00000000-0000-0000-0000-000000000014', format($$select public.withdraw_ownership_request(%L)$$, (select id from test.ids where name='r4')), 'requester withdraws');

-- escalation to the Admins after the deadline ---------------------------------------------
insert into test.ids select 'r5', test.val('00000000-0000-0000-0000-000000000014',
  format($$select public.request_ownership(%L)::text$$, (select id from test.ids where name='o1')))::uuid;
select test.chk('before the deadline nothing is escalated', public.escalate_overdue_ownership_requests()::text, '0');
update ownership_requests set due_at = now() - interval '1 hour' where id=(select id from test.ids where name='r5');
select test.chk('after the deadline one request is escalated', public.escalate_overdue_ownership_requests()::text, '1');
select test.chk('status escalated', (select status from ownership_requests where id=(select id from test.ids where name='r5')), 'escalated');
select test.chk('Admin is notified', (select count(*)::text from notifications where user_id='00000000-0000-0000-0000-000000000009' and kind='ownership_for_admin'), '1');
select test.chk('Mia is told it went to the Admins', (select count(*)::text from notifications where user_id='00000000-0000-0000-0000-000000000014' and kind='ownership_escalated'), '1');
select test.chk('running the job again does nothing more', public.escalate_overdue_ownership_requests()::text, '0');
select test.chk('no duplicate Admin notification', (select count(*)::text from notifications where user_id='00000000-0000-0000-0000-000000000009' and kind='ownership_for_admin'), '1');
select test.expect_ok('00000000-0000-0000-0000-000000000009', format($$select public.respond_ownership_request(%L, true)$$, (select id from test.ids where name='r5')), 'Admin decides an escalated request');
select test.chk('Mia is now Founder', (select founder_id::text from bubbles where id=(select id from test.ids where name='o1')), '00000000-0000-0000-0000-000000000014');

-- the requester's own limit applies ---------------------------------------------------------
select test.expect_ok('00000000-0000-0000-0000-000000000013', $$select public.create_bubble('L1','T','d','Beginner',4,'Monday','7:00 PM'); select public.create_bubble('L2','T','d','Beginner',4,'Monday','7:00 PM')$$, 'Lea founds two Bubbles');
select test.expect_err('00000000-0000-0000-0000-000000000013', format($$select public.request_ownership(%L)$$, (select id from test.ids where name='o1')), '%up to 2 open%', 'a woman at her ownership limit cannot ask for another');

-- notifications ---------------------------------------------------------------------------------
select test.chk('a woman sees only her own notifications', test.val('00000000-0000-0000-0000-000000000012', $$select count(*)::text from notifications where user_id <> auth.uid()$$), '0');
select test.chk('Kim can read hers', test.val('00000000-0000-0000-0000-000000000012', $$select (count(*) > 0)::text from notifications$$), 'true');
select test.expect_ok('00000000-0000-0000-0000-000000000012', $$update notifications set read_at = now() where user_id = auth.uid()$$, 'she can mark them read');
select test.expect_err('00000000-0000-0000-0000-000000000012', $$update notifications set message = 'hacked' where user_id = auth.uid()$$, 'permission denied%', 'she cannot rewrite them');
select test.expect_err('00000000-0000-0000-0000-000000000012', $$insert into notifications (user_id, kind, message) values ('00000000-0000-0000-0000-000000000013','info','spam')$$, '%row-level security%', 'she cannot create notifications for others');
select test.expect_err('00000000-0000-0000-0000-000000000012', $$select public.notify('00000000-0000-0000-0000-000000000013','info',null,'spam')$$, 'permission denied for function notify%', 'notify() is server-only');

-- hardening ----------------------------------------------------------------------------------------
select test.expect_err('00000000-0000-0000-0000-000000000003', $$select public.learning_seats_in_use('00000000-0000-0000-0000-000000000001')$$, 'permission denied for function%', 'nobody can peek at another woman''s seats');
select test.expect_err('00000000-0000-0000-0000-000000000003', $$select public.assert_can_own_bubble('00000000-0000-0000-0000-000000000001')$$, 'permission denied for function%', 'assert_can_own_bubble is server-only');
select test.expect_err('00000000-0000-0000-0000-000000000003', $$select public.escalate_overdue_ownership_requests()$$, 'permission denied for function%', 'escalation job is server-only');

-- syllabus import --------------------------------------------------------------------------------------
select test.chk('the shipped template is valid', (public.validate_syllabus_import(:'template'::jsonb) ->> 'ok'), 'true');
select test.chk('Mia (Founder) imports the template', test.val('00000000-0000-0000-0000-000000000014',
  format($$select public.import_syllabus(%L, %L::jsonb)::text$$, (select id from test.ids where name='o1'), :'template')), '1');
select test.chk('imported: 1 session, in progress, with goal',
  (select count(*)||'/'||min(status)||'/'||(min(goal) is not null)::text from sessions where bubble_id=(select id from test.ids where name='o1')), '1/in-progress/true');
select test.chk('imported: 4 sections', (select count(*)::text from session_sections ss join sessions s on s.id=ss.session_id where s.bubble_id=(select id from test.ids where name='o1')), '4');
select test.chk('imported: video entry has id, title and https url',
  (select (v->>'id' is not null and v->>'url' like 'https://%')::text from session_sections ss join sessions s on s.id=ss.session_id, jsonb_array_elements(ss.videos) v where s.bubble_id=(select id from test.ids where name='o1') limit 1), 'true');
select test.chk('importing again appends locked sessions', (select test.val('00000000-0000-0000-0000-000000000014',
  format($$select public.import_syllabus(%L, %L::jsonb)::text$$, (select id from test.ids where name='o1'), :'template'))), '1');
select test.chk('second import is locked and numbered 2', (select string_agg(number||'='||status, ',' order by number) from sessions where bubble_id=(select id from test.ids where name='o1')), '1=in-progress,2=locked');
select test.expect_err('00000000-0000-0000-0000-000000000012', format($$select public.import_syllabus(%L, %L::jsonb)$$, (select id from test.ids where name='o1'), :'template'), '%Only the Founder or an Admin%', 'a Member cannot import');

-- validation catches bad input (each case must be rejected with a helpful message)
create function test.bad(lbl text, payload jsonb, pat text) returns void language sql as $$
  insert into test.results
  select lbl, (r ->> 'ok')::boolean = false and r::text ilike pat, r::text
    from (select public.validate_syllabus_import(payload) r) x;
$$;
select test.bad('rejects a non-object', '[]'::jsonb, '%one block of JSON%');
select test.bad('rejects the wrong format name', '{"format":"other","version":1,"sessions":[{"title":"a"}]}', '%we-syllabus%');
select test.bad('rejects the wrong version', '{"format":"we-syllabus","version":2,"sessions":[{"title":"a"}]}', '%version%');
select test.bad('rejects sessions that are not a list', '{"format":"we-syllabus","version":1,"sessions":{}}', '%must be a list%');
select test.bad('rejects zero sessions', '{"format":"we-syllabus","version":1,"sessions":[]}', '%at least one session%');
select test.bad('rejects a missing title', '{"format":"we-syllabus","version":1,"sessions":[{"goal":"x"}]}', '%needs a title%');
select test.bad('rejects an unknown level', '{"format":"we-syllabus","version":1,"sessions":[{"title":"a","level":"Expert"}]}', '%level must be%');
select test.bad('rejects an unknown section type', '{"format":"we-syllabus","version":1,"sessions":[{"title":"a","sections":[{"type":"quiz","title":"t"}]}]}', '%type must be one of%');
select test.bad('rejects a section with no type', '{"format":"we-syllabus","version":1,"sessions":[{"title":"a","sections":[{"title":"t"}]}]}', '%type must be one of%');
select test.bad('rejects http:// links', '{"format":"we-syllabus","version":1,"sessions":[{"title":"a","sections":[{"type":"video","title":"t","videos":[{"url":"http://x.org/v"}]}]}]}', '%https://%');
select test.bad('rejects javascript: links', '{"format":"we-syllabus","version":1,"sessions":[{"title":"a","sections":[{"type":"video","title":"t","videos":[{"url":"javascript:alert(1)"}]}]}]}', '%https://%');
select test.bad('rejects a link with no url', '{"format":"we-syllabus","version":1,"sessions":[{"title":"a","sections":[{"type":"video","title":"t","videos":[{"title":"x"}]}]}]}', '%https://%');
select test.bad('rejects links with spaces', '{"format":"we-syllabus","version":1,"sessions":[{"title":"a","sections":[{"type":"video","title":"t","videos":[{"url":"https://x.org/a b"}]}]}]}', '%https://%');
select test.bad('rejects more than 20 sessions',
  (select jsonb_build_object('format','we-syllabus','version',1,'sessions',jsonb_agg(jsonb_build_object('title','s'||g))) from generate_series(1,21) g), '%at most 20 sessions%');
select test.bad('rejects more than 8 sections',
  (select jsonb_build_object('format','we-syllabus','version',1,'sessions',jsonb_build_array(jsonb_build_object('title','s','sections',jsonb_agg(jsonb_build_object('type','brief','title','t'||g))))) from generate_series(1,9) g), '%at most 8 sections%');
select test.bad('rejects very long content',
  jsonb_build_object('format','we-syllabus','version',1,'sessions',jsonb_build_array(jsonb_build_object('title','s','sections',jsonb_build_array(jsonb_build_object('type','brief','title','t','content',repeat('x',8001)))))), '%up to 8000%');
select test.expect_err('00000000-0000-0000-0000-000000000014',
  format($$select public.import_syllabus(%L, '{"format":"we-syllabus","version":1,"sessions":[{"title":"a","sections":[{"type":"video","title":"t","videos":[{"url":"javascript:alert(1)"}]}]}]}'::jsonb)$$, (select id from test.ids where name='o1')),
  '%problems%', 'import refuses a bad syllabus with an explanation');
select test.chk('a refused import saves nothing', (select count(*)::text from sessions where bubble_id=(select id from test.ids where name='o1')), '2');
select test.chk('anyone signed in can preview validation', test.val('00000000-0000-0000-0000-000000000015', $$select (public.validate_syllabus_import('[]'::jsonb) ->> 'ok')$$), 'false');

-- Fork copies each session's goal -------------------------------------------------------------------------
insert into test.ids select 'f3', test.val('00000000-0000-0000-0000-000000000015',
  format($$select public.fork_bubble(%L)::text$$, (select id from test.ids where name='o1')))::uuid;
select test.chk('fork copies the goals', (select count(*)::text from sessions where bubble_id=(select id from test.ids where name='f3') and goal is not null), '2');
