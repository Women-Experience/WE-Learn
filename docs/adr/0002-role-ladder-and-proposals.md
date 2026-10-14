# ADR 0002: Role ladder inside a Bubble, Admin across the platform, and Proposals

**Status:** Accepted
**Date:** 2026-10-14

## Context

The project brief says the syllabus is edited by the Founder only, lists a Moderator role as out of the MVP, and leaves role-based enforcement for later. In practice the database rules already enforce permissions on the server, and they are keyed to one Founder per Bubble.

The product needs more than that. A Founder may want others to share the work, a Bubble should not depend on one person staying active, and content the Founder or a Moderator wrote must be protected from careless changes. A woman who has not joined a Bubble must have no editing rights over it at all.

## Decision

**Roles inside one Bubble, from strongest to weakest:**

1. **Founder.** Exactly one. Holds every Moderator right and also manages the Bubble: members, waitlist, seats, closing or deleting it, and handing the Founder role to another Member.
2. **Moderator.** Edits the whole syllabus, including what others wrote.
3. **Contributor.** Limited rights: proposes additional sessions and further content, and cannot change or delete what the Founder or a Moderator wrote.
4. **Member.** Reads the syllabus, adds resources in the Resources tab, and records her own progress.

**Platform-wide:** **Admin** can edit or remove any Bubble and its syllabus and can give or take away any role in any Bubble.

**Rules:**

- Only Members of a Bubble can hold the Moderator or Contributor role in it. A non-member has no editing rights over a Bubble; she can Fork it (see ADR 0001).
- The Founder, an Admin or a Moderator can give the Moderator or Contributor role to a Member.
- Nobody but an Admin can remove the Founder from the role. She otherwise leaves it only by handing it over.
- Only the Founder or an Admin can remove or demote a Moderator.
- The Founder, an Admin or any Moderator can remove a Contributor.
- Every appointment is recorded with who made it and when.

**Proposals.** Whatever a Contributor adds to the syllabus is a Proposal. It is hidden from other Members until a Moderator, the Founder or an Admin approves it. Once approved it becomes part of the syllabus and credits the Contributor. A Proposal that is not approved is kept for its author as a draft. The Resources tab is not part of this: any Member can still add resources without approval.

**Build order.** The decisions above are settled, but they are built in phases to keep the pilot small and the permission rules easy to test:

- **Phase A:** Founder, Member, Admin and Fork.
- **Phase B:** Moderator.
- **Phase C:** Contributor and Proposals, the most expensive part (storage for pending items, an approval screen, notifications).

The role data is designed so that adding a phase extends it instead of rewriting it.

## Alternatives considered

- **Founder-only editing, as in the brief.** Rejected: the Bubble depends on one person, and nobody else can contribute except by forking.
- **Every Member can edit freely.** Rejected: nothing protects what the Founder or a Moderator wrote.
- **Contributor additions go live at once, marked as such, and are removed afterwards if needed.** Rejected: unreviewed content would reach all 4 to 8 learners first.
- **Only the Founder and Admin can hand out roles.** Rejected: moderation should be shareable so a Bubble can keep running without the Founder.

## Consequences

- Content a Moderator or the Founder created is protected, and a Bubble can continue if its Founder disappears.
- Moderators cannot remove the Founder or each other, so sharing moderation cannot be turned against the creator.
- This supersedes the brief's "Syllabus: Founder edits only", the Moderator role being out of the MVP, and "role-based permission enforcement coming later". The earlier notion of a Moderator as a platform-wide role is now called Admin.
- More security rules exist, and they are where data could leak by mistake. A permission review and tests of these rules are needed before the pilot.
- Not decided here: how an Admin is identified and stored, and how Admins are first appointed.
