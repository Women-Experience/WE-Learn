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

for f in "$HERE/00_supabase_stub.sql" "$M/001_initial_schema.sql" "$M/002_audit_fixes.sql" \
         "$HERE/01_seed_legacy.sql" "$M/003_platform_foundation.sql" "$HERE/02_scenarios.sql"; do
  echo "== $(basename "$f")"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1 | grep -v '^$' | grep -v 'set_config\|^-\+$\|^(1 row)' || true
done
