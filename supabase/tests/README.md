# Database tests

`run.sh` builds a scratch database, applies migrations 001, 002 and 003 in order
(with a small stand-in for Supabase Auth), loads a few rows that existed before
003, and runs the scenario checks in `02_scenarios.sql`: seats and ownership,
limits, fork and credit chain, hidden Bubbles, Admin powers, and attempts to
escalate privileges.

Migration 005 runs after the 003 and 004 scenarios, so `05_scenarios_005.sql`
also checks that the rows those scenarios created were carried over to the
Course Guide format (statuses, step types, video links).

Add a scenario here whenever a migration adds a rule.
