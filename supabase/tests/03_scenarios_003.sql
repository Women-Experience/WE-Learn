\o /dev/null
-- 0. legacy data survives -------------------------------------------------
select test.chk('legacy: created_by backfilled',
  (select (created_by = founder_id)::text from bubbles where id = (select id from _legacy_ids)), 'true');
select test.chk('legacy: founder keeps her seat',
  (select holds_seat::text from bubble_members where bubble_id = (select id from _legacy_ids) and role='founder'), 'true');
select test.chk('legacy: taken_seats still 1',
  (select taken_seats::text from bubbles where id = (select id from _legacy_ids)), '1');
select test.chk('legacy: credit chain empty',
  (select credit_chain::text from bubbles where id = (select id from _legacy_ids)), '[]');

-- bootstrap the first Admin (as the SQL editor would)
insert into platform_roles (user_id, role) values ('00000000-0000-0000-0000-000000000009','admin');

-- 1. creating Bubbles, seats vs ownership ----------------------------------
insert into test.ids select 'b1', test.val('00000000-0000-0000-0000-000000000001',
  $$select public.create_bubble('Bubble 1','Topic','d','Beginner',2,'Tuesday','7:00 PM')::text$$)::uuid;
select test.chk('A founder holds a seat in b1',
  (select holds_seat::text from bubble_members where bubble_id=(select id from test.ids where name='b1') and user_id='00000000-0000-0000-0000-000000000001'), 'true');
select test.chk('b1 taken_seats = 1', (select taken_seats::text from bubbles where id=(select id from test.ids where name='b1')), '1');

insert into test.ids select 'b2', test.val('00000000-0000-0000-0000-000000000001',
  $$select public.create_bubble('Bubble 2','Topic2','d','Beginner',2,'Wednesday','7:00 PM')::text$$)::uuid;
select test.chk('A second bubble: auto facilitator (no seat, she already learns in b1)',
  (select holds_seat::text from bubble_members where bubble_id=(select id from test.ids where name='b2') and user_id='00000000-0000-0000-0000-000000000001'), 'false');
select test.chk('b2 taken_seats = 0 (facilitator holds no seat)', (select taken_seats::text from bubbles where id=(select id from test.ids where name='b2')), '0');

select test.expect_err('00000000-0000-0000-0000-000000000001',
  $$select public.create_bubble('Bubble 3','T','d','Beginner',4,'Thursday','7:00 PM')$$,
  '%up to 2 open%', 'A cannot own a third open Bubble');

select test.expect_err('00000000-0000-0000-0000-000000000003',
  $$select public.create_bubble('X','T','d','Beginner',1,'Thursday','7:00 PM')$$,
  '%bubbles_max_seats_check%', 'seats below 2 rejected');
select test.expect_err('00000000-0000-0000-0000-000000000003',
  $$select public.create_bubble('X','T','d','Beginner',9,'Thursday','7:00 PM')$$,
  '%bubbles_max_seats_check%', 'seats above 8 rejected');

-- 2. joining, waitlist, learning limit -------------------------------------
select test.chk('B joins b1', test.val('00000000-0000-0000-0000-000000000002',
  format($$select public.join_bubble(%L)$$, (select id from test.ids where name='b1'))), 'joined');
select test.chk('b1 is full after 2 seats', (select status from bubbles where id=(select id from test.ids where name='b1')), 'full');
select test.chk('C waitlisted on full b1', test.val('00000000-0000-0000-0000-000000000003',
  format($$select public.join_bubble(%L)$$, (select id from test.ids where name='b1'))), 'waitlisted');
select test.expect_err('00000000-0000-0000-0000-000000000002',
  format($$select public.join_bubble(%L)$$, (select id from test.ids where name='b2')),
  '%learn in 1 open%', 'B cannot learn in two open Bubbles');
select test.chk('D joins b2 (seat kept for learners)', test.val('00000000-0000-0000-0000-000000000004',
  format($$select public.join_bubble(%L)$$, (select id from test.ids where name='b2'))), 'joined');
select test.chk('b2 taken_seats = 1 (D only)', (select taken_seats::text from bubbles where id=(select id from test.ids where name='b2')), '1');

-- 3. joining stays open once learning has started --------------------------
update bubbles set status='active' where id=(select id from test.ids where name='b2');
select test.chk('E joins an active Bubble with a free seat', test.val('00000000-0000-0000-0000-000000000005',
  format($$select public.join_bubble(%L)$$, (select id from test.ids where name='b2'))), 'joined');
select test.chk('b2 status stays active', (select status from bubbles where id=(select id from test.ids where name='b2')), 'active');
-- E leaves again so she can be used elsewhere
select test.expect_ok('00000000-0000-0000-0000-000000000005',
  format($$delete from bubble_members where bubble_id=%L and user_id='00000000-0000-0000-0000-000000000005'$$, (select id from test.ids where name='b2')),
  'E leaves b2');
update bubbles set status='open' where id=(select id from test.ids where name='b2');

-- 4. privilege escalation attempts ------------------------------------------
select test.expect_err('00000000-0000-0000-0000-000000000001',
  format($$update bubbles set taken_seats=0 where id=%L$$, (select id from test.ids where name='b1')),
  'permission denied%', 'Founder cannot edit taken_seats');
select test.expect_err('00000000-0000-0000-0000-000000000001',
  format($$update bubbles set founder_id='00000000-0000-0000-0000-000000000009' where id=%L$$, (select id from test.ids where name='b1')),
  'permission denied%', 'Founder cannot edit founder_id');
select test.expect_err('00000000-0000-0000-0000-000000000001',
  format($$update bubbles set credit_chain='[]' where id=%L$$, (select id from test.ids where name='b1')),
  'permission denied%', 'Founder cannot edit credit_chain');
select test.expect_err('00000000-0000-0000-0000-000000000001',
  format($$update bubbles set hidden_at=now() where id=%L$$, (select id from test.ids where name='b1')),
  'permission denied%', 'Founder cannot hide her own Bubble via column');
select test.chk('Founder direct delete removes nothing', test.val('00000000-0000-0000-0000-000000000001',
  format($$with d as (delete from bubbles where id=%L returning 1) select count(*)::text from d$$, (select id from test.ids where name='b2'))), '0');
select test.expect_err('00000000-0000-0000-0000-000000000003',
  $$insert into platform_roles (user_id, role, granted_by) values ('00000000-0000-0000-0000-000000000003','admin','00000000-0000-0000-0000-000000000003')$$,
  '%row-level security%', 'non-admin cannot make herself Admin');
select test.expect_err('00000000-0000-0000-0000-000000000003',
  $$insert into platform_roles (user_id, role, granted_by) values ('00000000-0000-0000-0000-000000000003','content_lead','00000000-0000-0000-0000-000000000003')$$,
  '%row-level security%', 'non-admin cannot make herself Content Lead');
select test.chk('non-admin cannot change settings', test.val('00000000-0000-0000-0000-000000000003',
  $$with u as (update platform_settings set value=99 returning 1) select count(*)::text from u$$), '0');
select test.expect_err('00000000-0000-0000-0000-000000000001',
  format($$insert into bubble_members (bubble_id,user_id,role) values (%L,'00000000-0000-0000-0000-000000000001','founder')$$, (select id from test.ids where name='b1')),
  '%', 'cannot insert a second founder row for self (already exists)');
select test.chk('member cannot flip her own holds_seat', test.val('00000000-0000-0000-0000-000000000002',
  format($$with u as (update bubble_members set holds_seat=false where bubble_id=%L and user_id='00000000-0000-0000-0000-000000000002' returning 1) select count(*)::text from u$$, (select id from test.ids where name='b1'))), '0');

-- 5. Admin and Content Lead --------------------------------------------------
select test.expect_ok('00000000-0000-0000-0000-000000000009',
  $$insert into platform_roles (user_id, role, granted_by) values ('00000000-0000-0000-0000-000000000005','content_lead','00000000-0000-0000-0000-000000000009')$$,
  'Admin grants Content Lead to E');
select test.chk('anon sees the Content Lead badge but not Admin rows',
  test.val_anon($$select count(*)::text from platform_roles$$), '1');

-- 6. Fork ---------------------------------------------------------------------
-- build a syllabus in b1: 3 sessions, one soft-deleted, with sections
do $$
declare b uuid := (select id from test.ids where name='b1'); s1 uuid; s2 uuid; s3 uuid;
begin
  insert into sessions (bubble_id, number, title, status, xp, duration, project_url, reflection_note)
   values (b,1,'Intro','done',150,90,'https://x.org/mine','my private note') returning id into s1;
  insert into sessions (bubble_id, number, title, status) values (b,2,'Deleted one','locked') returning id into s2;
  insert into sessions (bubble_id, number, title, status) values (b,3,'Methods','locked') returning id into s3;
  update sessions set deleted_at = now() where id = s2;
  insert into session_sections (session_id,type,title,content,position) values
    (s1,'brief','Brief','hello',0),(s1,'video','Watch','',1),(s3,'brief','Methods brief','m',0);
  insert into session_sections (session_id,type,title,position,deleted_at) values (s1,'sandbox','Gone',2,now());
  insert into resources (bubble_id,type,title,url,uploaded_by) values (b,'article','Secret reading','https://x.org/r','00000000-0000-0000-0000-000000000001');
end $$;

insert into test.ids select 'f1', test.val('00000000-0000-0000-0000-000000000003',
  format($$select public.fork_bubble(%L, 'Cleo''s copy', 6, 'Sunday', '8:00 PM')::text$$, (select id from test.ids where name='b1')))::uuid;
select test.chk('fork: 2 sessions copied (soft-deleted skipped)', (select count(*)::text from sessions where bubble_id=(select id from test.ids where name='f1')), '2');
select test.chk('fork: renumbered 1,2', (select string_agg(number::text, ',' order by number) from sessions where bubble_id=(select id from test.ids where name='f1')), '1,2');
select test.chk('fork: first in-progress, rest locked', (select string_agg(status, ',' order by number) from sessions where bubble_id=(select id from test.ids where name='f1')), 'in-progress,locked');
select test.chk('fork: live sections copied, deleted ones not', (select count(*)::text from session_sections ss join sessions s on s.id=ss.session_id where s.bubble_id=(select id from test.ids where name='f1')), '3');
select test.chk('fork: private progress not copied', (select count(*)::text from sessions where bubble_id=(select id from test.ids where name='f1') and (project_url is not null or reflection_note is not null)), '0');
select test.chk('fork: resources not copied', (select count(*)::text from resources where bubble_id=(select id from test.ids where name='f1')), '0');
select test.chk('fork: Cleo is Founder with a seat', (select role||'/'||holds_seat::text from bubble_members where bubble_id=(select id from test.ids where name='f1') and user_id='00000000-0000-0000-0000-000000000003'), 'founder/true');
select test.chk('fork: only the Founder is in it', (select count(*)::text from bubble_members where bubble_id=(select id from test.ids where name='f1')), '1');
select test.chk('fork: credit names source and author', (select credit_chain->0->>'title' || ' by ' || (credit_chain->0->>'author') from bubbles where id=(select id from test.ids where name='f1')), 'Bubble 1 by Ann');
select test.chk('fork: forked_from set', (select (forked_from = (select id from test.ids where name='b1'))::text from bubbles where id=(select id from test.ids where name='f1')), 'true');
select test.chk('fork: custom title/seats/schedule', (select title||'/'||max_seats||'/'||schedule_day from bubbles where id=(select id from test.ids where name='f1')), 'Cleo''s copy/6/Sunday');
select test.expect_err('00000000-0000-0000-0000-000000000003',
  format($$update bubbles set credit_chain='[]' where id=%L$$, (select id from test.ids where name='f1')),
  'permission denied%', 'new Founder cannot remove the credit');
select test.chk('source untouched by the fork', (select count(*)::text from sessions where bubble_id=(select id from test.ids where name='b1') and deleted_at is null), '2');

-- fork of a fork keeps the whole chain, oldest first (D already learns in b2 -> facilitator)
insert into test.ids select 'f2', test.val('00000000-0000-0000-0000-000000000004',
  format($$select public.fork_bubble(%L)::text$$, (select id from test.ids where name='f1')))::uuid;
select test.chk('fork of fork: chain has 2 entries, root first',
  (select jsonb_array_length(credit_chain)::text || ':' || (credit_chain->0->>'title') || '>' || (credit_chain->1->>'title') from bubbles where id=(select id from test.ids where name='f2')),
  '2:Bubble 1>Cleo''s copy');
select test.chk('fork: D already learns elsewhere, so she facilitates', (select holds_seat::text from bubble_members where bubble_id=(select id from test.ids where name='f2') and user_id='00000000-0000-0000-0000-000000000004'), 'false');

-- fork works on full / active / closed bubbles
select test.chk('fork a FULL Bubble (b1 is full)', test.val('00000000-0000-0000-0000-000000000006',
  format($$select (public.fork_bubble(%L) is not null)::text$$, (select id from test.ids where name='b1'))), 'true');

-- 7. Closing and reopening ---------------------------------------------------
select test.expect_ok('00000000-0000-0000-0000-000000000003',
  format($$update bubbles set status='closed' where id=%L$$, (select id from test.ids where name='f1')), 'Founder closes her Bubble');
select test.expect_err('00000000-0000-0000-0000-000000000003',
  format($$update bubbles set status='open' where id=%L$$, (select id from test.ids where name='f1')),
  '%cannot be reopened%', 'Founder cannot reopen a closed Bubble');
select test.chk('closing frees Cleo''s learning seat', (select public.learning_seats_in_use('00000000-0000-0000-0000-000000000003')::text), '0');
select test.chk('fork a CLOSED Bubble', test.val('00000000-0000-0000-0000-000000000007',
  format($$select (public.fork_bubble(%L) is not null)::text$$, (select id from test.ids where name='f1'))), 'true');
select test.expect_ok('00000000-0000-0000-0000-000000000009',
  format($$update bubbles set status='open' where id=%L$$, (select id from test.ids where name='f1')), 'Admin can reopen a closed Bubble');

-- 8. Ownership limit and Content Leads --------------------------------------
-- Cleo owns f1 (reopened). One more is fine, a third is not.
select test.expect_ok('00000000-0000-0000-0000-000000000003',
  $$select public.create_bubble('C2','T','d','Beginner',4,'Monday','7:00 PM')$$, 'Cleo owns a second open Bubble');
select test.expect_err('00000000-0000-0000-0000-000000000003',
  $$select public.create_bubble('C3','T','d','Beginner',4,'Monday','7:00 PM')$$,
  '%up to 2 open%', 'Cleo cannot own a third');
select test.expect_ok('00000000-0000-0000-0000-000000000005',
  $$select public.create_bubble('E1','T','d','Beginner',8,'Monday','7:00 PM'); select public.create_bubble('E2','T','d','Beginner',8,'Monday','7:00 PM'); select public.create_bubble('E3','T','d','Beginner',8,'Monday','7:00 PM')$$,
  'Content Lead owns three Bubbles');
-- settings really drive the limit (admin raises it, Cleo can create, then restore)
select test.expect_ok('00000000-0000-0000-0000-000000000009', $$update platform_settings set value=3 where key='max_owned_open_bubbles'$$, 'Admin edits a limit');
select test.expect_ok('00000000-0000-0000-0000-000000000003', $$select public.create_bubble('C3','T','d','Beginner',4,'Monday','7:00 PM')$$, 'new limit applies immediately');
update platform_settings set value=2 where key='max_owned_open_bubbles';

-- 9. Hidden Bubbles ----------------------------------------------------------
select test.expect_err('00000000-0000-0000-0000-000000000003', format($$select public.admin_set_bubble_hidden(%L, true)$$, (select id from test.ids where name='b2')),
  '%Only an Admin%', 'non-admin cannot hide');
select test.expect_ok('00000000-0000-0000-0000-000000000009', format($$select public.admin_set_bubble_hidden(%L, true)$$, (select id from test.ids where name='b2')), 'Admin hides b2');
select test.chk('hidden: anon cannot see it', test.val_anon(format($$select count(*)::text from bubbles where id=%L$$, (select id from test.ids where name='b2'))), '0');
select test.chk('hidden: other member cannot see it', test.val('00000000-0000-0000-0000-000000000004', format($$select count(*)::text from bubbles where id=%L$$, (select id from test.ids where name='b2'))), '0');
select test.chk('hidden: Founder still sees it', test.val('00000000-0000-0000-0000-000000000001', format($$select count(*)::text from bubbles where id=%L$$, (select id from test.ids where name='b2'))), '1');
select test.chk('hidden: Admin sees it', test.val('00000000-0000-0000-0000-000000000009', format($$select count(*)::text from bubbles where id=%L$$, (select id from test.ids where name='b2'))), '1');
select test.expect_err('00000000-0000-0000-0000-000000000006', format($$select public.fork_bubble(%L)$$, (select id from test.ids where name='b2')), '%not found%', 'hidden: cannot be forked');
select test.expect_err('00000000-0000-0000-0000-000000000006', format($$select public.join_bubble(%L)$$, (select id from test.ids where name='b2')), '%not found%', 'hidden: cannot be joined');
select test.expect_ok('00000000-0000-0000-0000-000000000009', format($$select public.admin_set_bubble_hidden(%L, false)$$, (select id from test.ids where name='b2')), 'Admin unhides b2');

-- 10. Deleting ----------------------------------------------------------------
select test.expect_err('00000000-0000-0000-0000-000000000009', format($$delete from bubbles where id=%L$$, (select id from test.ids where name='b1')),
  '%has Members%', 'even an Admin cannot delete a Bubble that has Members');
select test.expect_ok('00000000-0000-0000-0000-000000000009', format($$delete from bubbles where id=%L$$, (select id from test.ids where name='f2')),
  'Admin deletes a Bubble with only its Founder');
select test.chk('deleting a fork keeps its source credit chain on other copies', (select jsonb_array_length(credit_chain)::text from bubbles where id=(select id from test.ids where name='f1')), '1');

-- 11. Admin can edit a syllabus, others cannot -------------------------------
select test.expect_ok('00000000-0000-0000-0000-000000000009', format($$insert into sessions (bubble_id, number, title) values (%L, 9, 'Admin added')$$, (select id from test.ids where name='b1')), 'Admin edits any syllabus');
select test.expect_err('00000000-0000-0000-0000-000000000003', format($$insert into sessions (bubble_id, number, title) values (%L, 10, 'Stranger added')$$, (select id from test.ids where name='b1')), '%row-level security%', 'non-member cannot edit a syllabus');

-- 12. Founder seat choice and capacity ---------------------------------------
-- hand b1 to Bea and let Ann leave; then Cleo (waitlisted) is admitted
select test.expect_ok('00000000-0000-0000-0000-000000000001', format($$select public.transfer_founder(%L, '00000000-0000-0000-0000-000000000002', true)$$, (select id from test.ids where name='b1')), 'Ann hands b1 to Bea and leaves');
select test.chk('b1: Bea is Founder', (select founder_id::text from bubbles where id=(select id from test.ids where name='b1')), '00000000-0000-0000-0000-000000000002');
select test.chk('b1: Ann left', (select count(*)::text from bubble_members where bubble_id=(select id from test.ids where name='b1') and user_id='00000000-0000-0000-0000-000000000001'), '0');
select test.chk('b1: frees a seat and reopens', (select taken_seats||'/'||status from bubbles where id=(select id from test.ids where name='b1')), '1/open');
select test.expect_err('00000000-0000-0000-0000-000000000002', format($$select public.admit_from_waitlist(%L, '00000000-0000-0000-0000-000000000003')$$, (select id from test.ids where name='b1')),
  '%learn in 1 open%', 'waitlist admission respects the learning limit (Cleo already learns in f1)');
select test.expect_err('00000000-0000-0000-0000-000000000002', format($$select public.transfer_founder(%L, '00000000-0000-0000-0000-000000000004')$$, (select id from test.ids where name='b1')),
  '%must already be a member%', 'successor must be a member');
-- Ann now has no seat anywhere; her facilitator Bubble b2 lets her take one
select test.expect_ok('00000000-0000-0000-0000-000000000001', format($$select public.set_founder_seat(%L, true)$$, (select id from test.ids where name='b2')), 'Ann takes a seat in her own Bubble');
select test.chk('b2: now 2 of 2 seats, full', (select taken_seats||'/'||status from bubbles where id=(select id from test.ids where name='b2')), '2/full');
select test.expect_ok('00000000-0000-0000-0000-000000000001', format($$select public.set_founder_seat(%L, false)$$, (select id from test.ids where name='b2')), 'Ann gives her seat back');
select test.chk('b2: back to open', (select taken_seats||'/'||status from bubbles where id=(select id from test.ids where name='b2')), '1/open');
select test.expect_err('00000000-0000-0000-0000-000000000003', format($$select public.set_founder_seat(%L, true)$$, (select id from test.ids where name='b2')), '%Only the founder%', 'non-founder cannot change a founder seat');

-- 13. Seat guards ---------------------------------------------------------------
insert into test.ids select 'x', test.val('00000000-0000-0000-0000-000000000005',
  $$select public.create_bubble('Big','T','d','Beginner',8,'Friday','7:00 PM')::text$$)::uuid;
select test.expect_ok('00000000-0000-0000-0000-000000000010', format($$select public.join_bubble(%L)$$, (select id from test.ids where name='x')), 'Ida joins Big');
select test.expect_ok('00000000-0000-0000-0000-000000000011', format($$select public.join_bubble(%L)$$, (select id from test.ids where name='x')), 'Jo joins Big');
select test.expect_ok('00000000-0000-0000-0000-000000000008', format($$select public.join_bubble(%L)$$, (select id from test.ids where name='x')), 'Hana joins Big');
select test.expect_err('00000000-0000-0000-0000-000000000005', format($$update bubbles set max_seats=2 where id=%L$$, (select id from test.ids where name='x')),
  '%reduce the seats%', 'cannot shrink seats below learners already in');
select test.chk('Big has 4 learners (Eve, Ida, Jo, Hana)', (select taken_seats::text from bubbles where id=(select id from test.ids where name='x')), '4');
select test.expect_ok('00000000-0000-0000-0000-000000000005', format($$update bubbles set status='full' where id=%L$$, (select id from test.ids where name='x')), 'Founder sets status full by hand');
select test.chk('status full by hand is normalised back to open', (select status from bubbles where id=(select id from test.ids where name='x')), 'open');

-- 14. Syllabus of a visible Bubble still readable by signed-in users ----------
select test.chk('signed-in woman can read a syllabus to preview it', test.val('00000000-0000-0000-0000-000000000008', format($$select count(*)::text from sessions where bubble_id=%L$$, (select id from test.ids where name='b1'))), '3');

