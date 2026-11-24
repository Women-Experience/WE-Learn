#!/bin/bash
# Runs every migration against a throw-away local Postgres database and then
# the scenario tests. Needs a local Postgres (psql on the PATH, a role that may
# create databases). Nothing here touches Supabase.
#
#   ./supabase/tests/run.sh
#
# The last lines print "passed | failed". Any FAIL row is listed above them.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
M="$HERE/../migrations"
DB="${TEST_DB:-we_learn_test}"

psql -q -v ON_ERROR_STOP=1 -d postgres \
  -c "drop database if exists $DB" -c "create database $DB" 2>&1 | grep -v NOTICE || true

TEMPLATE="$(cat "$HERE/../../public/syllabus-template.json")"
TEMPLATE_V1="$(cat "$HERE/fixtures/syllabus-template-v1.json")"
DEMO="$(cat "$HERE/../../public/demo-syllabus.json")"

for f in "$HERE/00_supabase_stub.sql" "$M/001_initial_schema.sql" "$M/002_audit_fixes.sql" \
         "$HERE/01_seed_legacy.sql" "$M/003_platform_foundation.sql" \
         "$M/004_notifications_ownership_import.sql" "$HERE/02_helpers.sql" \
         "$HERE/03_scenarios_003.sql" "$HERE/04_scenarios_004.sql" \
         "$M/005_course_guide_sessions.sql" "$HERE/05_scenarios_005.sql" \
         "$M/006_group_progress.sql" "$HERE/06_scenarios_006.sql" "$HERE/99_report.sql"; do
  echo "== $(basename "$f")"
  psql -q -v ON_ERROR_STOP=1 -v "template=$TEMPLATE" -v "template_v1=$TEMPLATE_V1" -v "demo=$DEMO" -d "$DB" -f "$f" 2>&1 | grep -v '^$' | grep -v 'set_config\|^-\+$\|^(1 row)' || true
done
