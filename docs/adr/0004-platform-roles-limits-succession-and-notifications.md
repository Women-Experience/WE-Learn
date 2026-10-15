# ADR 0004: Platform roles, limits on Bubbles, ownership succession and notifications

**Status:** Accepted, with the open items listed at the end
**Date:** 2026-10-15

## Context

ADR 0002 defines the roles inside one Bubble and the Admin role. Further conversation brought up needs it does not cover: women who build content for others, with different limits from learners; a Founder who builds but does not learn; Bubbles whose Founder disappears; and a way to tell people that something needs their answer.

The team is small and not technical, so anything that needs per-woman manual configuration will not be maintained.

## Decision

**Roles across the platform.**

- **Admin:** governs the platform (see ADR 0002).
- **Creator:** any woman who builds a syllabus. This is not a permission.
- **Content Lead:** a Creator trusted to build at scale. Her syllabi carry a visible badge as a sign of quality, she is not limited in the number of Bubbles she holds, and she gets a larger allowance of agent runs. She may build a Bubble and leave it; others fork it and the original is preserved (ADR 0001). The role carries no power to edit or remove other women's Bubbles. A woman becomes a Content Lead by asking the Admin team, or by building Bubbles that worked well. The platform only suggests candidates to Admins, by default after at least two of her Bubbles had all Sessions completed and at least one syllabus of hers was forked by another woman. An Admin always decides, grants the role and can withdraw it.

**Seats and ownership are separate.** A Founder chooses whether she takes a seat and learns in her Bubble. A Founder who only builds or facilitates holds no seat, so the seats (a maximum chosen by the Founder, from 2 to 8, with four recommended and not required) stay for learners. A Bubble with only its Founder in it is valid.

**Limits on Bubbles.** Each woman may hold a seat in one open Bubble at a time, and may own up to two open Bubbles. Content Leads are not limited. The numbers are starting values in one settings table that an Admin edits; they are not set per woman.

**Joining.** A Bubble keeps accepting new Members until it is full or the Founder closes it. Having started to learn does not close it.

**Ownership succession.**

- A Founder who wants to leave must name a successor among the Members. If she disappears, an Admin assigns the Bubble to someone or closes it.
- A Member who wants to take over a living Bubble sends an ownership request to the Founder and the Moderators. If nobody answers within 5 working days, the request goes to the Admins to decide.
- Working days are Sunday to Thursday, so a request sent on a Thursday does not expire over a weekend.

**Nothing is lost.** Only an Admin can delete a Bubble. A Founder who wants to stop closes it, and the syllabus stays and can be forked. A Bubble that has Members cannot be deleted.

**Notifications.** In the site, as a list and a bell, and by email, sent from the server to the address that stays private in the sign-in system and only to those who gave consent. WhatsApp is left for later, because messages the business starts are charged per message and need a verified business account and approved templates. A daily job in the database finds requests that passed 5 working days and passes them on.

## Alternatives considered

- **A number set per woman, with no new role.** Rejected: it means someone maintains a growing list of exceptions. A role with fixed limits is simpler to give and to explain, and the badge doubles as recognition.
- **Content builders as Admins.** Rejected: it gives power to delete other women's work to people who only need to build.
- **Letting an abandoned Bubble be copied instead of taken over.** Rejected: it produces copies of copies and loses the group's history.
- **A 14-day wait for an answer, and a 2-day wait.** Both rejected as too long and too short; 5 working days was chosen.
- **WhatsApp as the first channel.** Rejected: cost and set-up burden.

## Consequences

- A migration must separate who owns a Bubble from who holds a seat, because today every Founder is also a Member and cannot leave.
- Implemented in migration 004 (Stage A): notifications (in the site; email is queued for women who gave consent and still needs a small sender), ownership requests with a deadline of 5 working days counted Sunday to Thursday plus an optional list of days off (`non_working_days`, edited by an Admin) for holidays, and a daily job that sends overdue requests to the Admins. The job needs the pg_cron extension, which has to be switched on in the Supabase dashboard.
- Implemented in migration 003 (Stage A). Two rules were settled while building it: a closed Bubble cannot be reopened by its Founder (members' seats were released, so reopening could break the one-learning-seat limit; an Admin can reopen it, or the Founder forks it), and a Fork counts toward the owned-Bubble limit. Both limits are rows in `platform_settings`.
- The security rules need tests, because more roles mean more places for a mistake.
- Notifications need a table, an email sender with a free tier and a daily scheduled job.
- A single settings table holds all limits, and a screen to edit it can come later; at first it can be edited directly in the Supabase table editor.

## Open items

- The numbers for learning seats and owned Bubbles are starting values, to be confirmed after the pilot.
- How an Admin is identified and first appointed.
