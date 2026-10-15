# Database tests

`run.sh` builds a scratch database, applies migrations 001, 002 and 003 in order
(with a small stand-in for Supabase Auth), loads a few rows that existed before
003, and runs the scenario checks in `02_scenarios.sql`: seats and ownership,
limits, fork and credit chain, hidden Bubbles, Admin powers, and attempts to
escalate privileges.

Add a scenario here whenever a migration adds a rule.
