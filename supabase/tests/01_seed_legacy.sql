-- Data that exists BEFORE migration 003 (must survive it).
insert into auth.users (id, email, raw_user_meta_data) values
 ('99999999-0000-0000-0000-000000000001','legacy@x.org','{"full_name":"Legacy Founder"}');
select set_config('request.jwt.claim.sub','99999999-0000-0000-0000-000000000001', false);
create table public._legacy_ids as
  select public.create_bubble('Legacy Bubble','UX Research','old','Beginner',6,'Monday','6:00 PM') as id;
