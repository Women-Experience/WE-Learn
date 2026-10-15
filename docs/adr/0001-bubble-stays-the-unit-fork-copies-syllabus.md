# ADR 0001: A Bubble stays the unit of the platform, and Fork copies its syllabus

**Status:** Accepted
**Date:** 2026-10-14

## Context

The project brief defines a Bubble as one learning group of 4 to 8 women that owns its own syllabus, members, waitlist and resources, with one Founder. The database and the screens are already built around that.

During backend planning, a different model was proposed: a separate "course" object holding the content, with many groups learning the same course. The goal behind it is real: women should be encouraged to pick an existing syllabus and improve it, with building a new one from scratch as the secondary option.

## Decision

A Bubble remains the single unit. There is no separate course object.

Reuse happens through **Fork**: any signed-in woman can open a new Bubble from the syllabus of an existing Bubble.

- The sessions and sections are copied into the new Bubble as an independent copy. Later changes on either side do not affect the other.
- The woman who forks becomes the Founder of the new Bubble.
- The new Bubble remembers which Bubble it came from.
- Every forked Bubble always shows a credit to its source ("based on" the source Bubble and its Founder). The credit cannot be removed by the new Founder or by Moderators.
- The Fork action is offered on every Bubble page, including Bubbles that are full, active or closed. A woman who cannot join a Bubble is exactly the one who needs it.

## Alternatives considered

- **A separate course object with many groups per course.** Rejected: it would rewrite the data model, the security rules and the screens that already work, and a shared syllabus would mean one group's edits change what other running groups see.
- **A live link between a fork and its source.** Rejected: an upstream edit could silently change a syllabus a group is halfway through. Independent copies are safer for a small pilot.

## Consequences

- Easier: no rewrite of what exists, no way for one woman to damage another's syllabus, and a clear chain of credit from the source to every copy.
- Harder: improvements made in a copy do not flow back to the source on their own. A later "suggest this back to the source" step can be added if the community wants it.
- Many diverging copies of a popular syllabus are expected and accepted.
- Decided while building: a Fork copies sessions and sections only. Resources, members, progress and personal notes are never copied, because resources and progress are private to the Bubble's members.
- Decided while building: a Fork counts toward the Founder's limit of owned open Bubbles (see ADR 0004), like any other Bubble she founds. This replaces the earlier limit of 10 Bubbles per Founder.
