\o /dev/null
-- Scenarios for migration 006: group progress.
-- o1: Founder Mia (14); Members Kim (12) and Lea (13). Noa (15) is not a Member.

insert into test.ids select 'p1', id from sessions where bubble_id=(select id from test.ids where name='o1') and number=1;
insert into test.ids select 'p2', id from sessions where bubble_id=(select id from test.ids where name='o1') and number=2;

select test.expect_ok('00000000-0000-0000-0000-000000000012', format($$insert into session_completions (session_id, user_id) values (%L, auth.uid())$$, (select id from test.ids where name='p1')), 'Kim marks S01 done');
select test.expect_ok('00000000-0000-0000-0000-000000000013', format($$insert into session_completions (session_id, user_id) values (%L, auth.uid()), (%L, auth.uid())$$, (select id from test.ids where name='p1'), (select id from test.ids where name='p2')), 'Lea marks S01 and S02 done');
select test.expect_ok('00000000-0000-0000-0000-000000000014', format($$insert into session_completions (session_id, user_id) values (%L, auth.uid())$$, (select id from test.ids where name='p1')), 'the Founder can mark her own progress too');

select test.chk('a Member sees the whole group''s progress',
  test.val('00000000-0000-0000-0000-000000000012', format($$select count(*)::text from session_completions where session_id in (%L, %L)$$, (select id from test.ids where name='p1'), (select id from test.ids where name='p2'))), '4');
select test.chk('a non-member sees none of it',
  test.val('00000000-0000-0000-0000-000000000015', format($$select count(*)::text from session_completions where session_id = %L$$, (select id from test.ids where name='p1'))), '0');
select test.chk('a visitor sees none of it', test.val_anon($$select count(*)::text from session_completions$$), '0');
select test.chk('…while private notes stay private: Kim cannot read Lea''s session_progress',
  test.val('00000000-0000-0000-0000-000000000012', $$select count(*)::text from session_progress where user_id = '00000000-0000-0000-0000-000000000013'$$), '0');

select test.expect_err('00000000-0000-0000-0000-000000000012', format($$insert into session_completions (session_id, user_id) values (%L, '00000000-0000-0000-0000-000000000013')$$, (select id from test.ids where name='p2')),
  '%row-level security%', 'nobody can mark someone else done');
select test.expect_err('00000000-0000-0000-0000-000000000015', format($$insert into session_completions (session_id, user_id) values (%L, auth.uid())$$, (select id from test.ids where name='p1')),
  '%row-level security%', 'a non-member cannot mark progress');
select test.expect_err('00000000-0000-0000-0000-000000000012', format($$insert into session_completions (session_id, user_id) values (%L, auth.uid())$$, (select id from test.ids where name='p1')),
  '%duplicate key%', 'marking twice is refused (the app treats it as already done)');
select test.expect_ok('00000000-0000-0000-0000-000000000012', format($$insert into session_completions (session_id, user_id) values (%L, auth.uid()) on conflict (session_id, user_id) do nothing$$, (select id from test.ids where name='p1')),
  'marking again the way the app does it (on conflict do nothing) is accepted');
select test.chk('nobody can un-mark someone else',
  test.val('00000000-0000-0000-0000-000000000012', $$with d as (delete from session_completions where user_id = '00000000-0000-0000-0000-000000000013' returning 1) select count(*)::text from d$$), '0');
select test.expect_err('00000000-0000-0000-0000-000000000012', $$update session_completions set completed_at = now() - interval '1 year'$$,
  'permission denied%', 'completion dates cannot be rewritten');
select test.chk('a Member can un-mark herself',
  test.val('00000000-0000-0000-0000-000000000013', format($$with d as (delete from session_completions where user_id = auth.uid() and session_id = %L returning 1) select count(*)::text from d$$, (select id from test.ids where name='p2'))), '1');

update sessions set deleted_at = now() where id = (select id from test.ids where name='p2');
select test.expect_err('00000000-0000-0000-0000-000000000013', format($$insert into session_completions (session_id, user_id) values (%L, auth.uid())$$, (select id from test.ids where name='p2')),
  '%row-level security%', 'a deleted session cannot be marked done');
update sessions set deleted_at = null where id = (select id from test.ids where name='p2');

select test.expect_ok('00000000-0000-0000-0000-000000000012', format($$delete from bubble_members where bubble_id = %L and user_id = auth.uid()$$, (select id from test.ids where name='o1')), 'Kim leaves o1');
select test.chk('leaving removes her progress in that Bubble',
  (select count(*)::text from session_completions where user_id = '00000000-0000-0000-0000-000000000012'), '0');
select test.chk('…and nobody else''s', (select count(*)::text from session_completions where session_id = (select id from test.ids where name='p1')), '2');
