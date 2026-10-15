\o /dev/null
create schema test;
create table test.results (label text, pass boolean, detail text);
create table test.ids (name text primary key, id uuid);
grant usage on schema test to authenticated, anon;
grant all on all tables in schema test to authenticated, anon;

create function test.expect_err(uid uuid, q text, pat text, lbl text) returns void language plpgsql as $$
declare msg text;
begin
  begin
    perform set_config('request.jwt.claim.sub', coalesce(uid::text,''), false);
    set local role authenticated;
    execute q;
    reset role;
    insert into test.results values (lbl, false, 'expected an error but it succeeded');
  exception when others then
    msg := sqlerrm;
    reset role;
    insert into test.results values (lbl, msg ilike pat, msg);
  end;
end $$;

create function test.expect_ok(uid uuid, q text, lbl text) returns void language plpgsql as $$
declare msg text;
begin
  begin
    perform set_config('request.jwt.claim.sub', coalesce(uid::text,''), false);
    set local role authenticated;
    execute q;
    reset role;
    insert into test.results values (lbl, true, 'ok');
  exception when others then
    msg := sqlerrm;
    reset role;
    insert into test.results values (lbl, false, msg);
  end;
end $$;

create function test.val(uid uuid, q text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text,''), false);
  set local role authenticated;
  execute q into v;
  reset role;
  return v;
exception when others then reset role; raise;
end $$;

create function test.val_anon(q text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', '', false);
  set local role anon;
  execute q into v;
  reset role;
  return v;
exception when others then reset role; raise;
end $$;

create function test.chk(lbl text, got text, want text) returns void language sql as $$
  insert into test.results values (lbl, got is not distinct from want, 'got ' || coalesce(got,'NULL') || ', want ' || want);
$$;

-- people -----------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'u' || n || '@x.org',
       jsonb_build_object('full_name', name)
from (values (1,'Ann'),(2,'Bea'),(3,'Cleo'),(4,'Dana'),(5,'Eve'),(6,'Fay'),(7,'Gia'),(8,'Hana'),(9,'Admin Ada')) v(n,name);
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000010','i@x.org','{"full_name":"Ida"}'),
 ('00000000-0000-0000-0000-000000000011','j@x.org','{"full_name":"Jo"}');
-- A=1 B=2 C=3 D=4 E=5 F=6 G=7 H=8 ADMIN=9 I=10 J=11

