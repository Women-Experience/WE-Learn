\o
-- report
select case when pass then 'PASS' else 'FAIL' end as r, label, case when pass then '' else detail end as detail from test.results order by pass, label;
select count(*) filter (where pass) as passed, count(*) filter (where not pass) as failed from test.results;
