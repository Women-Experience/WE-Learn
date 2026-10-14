# WE Bubbles: shared language

A glossary of the domain terms used in this project. Implementation details (tables, functions, libraries) do not belong here.

## Bubble

**Definition:** A small learning group of women around a shared professional topic. The Founder sets the maximum number of seats. Four members is a recommendation, not a requirement, so a Bubble can start learning with fewer. A Bubble owns its own syllabus (sessions and sections), its members, its waitlist and its resources, and has one Founder.
**Not to be confused with:** A "course". There is no separate course object. The syllabus lives inside the Bubble and is the Bubble's content.
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Fork

**Definition:** Opening a new Bubble from an existing Bubble's syllabus. The sessions and sections are copied into the new Bubble as an independent copy, and the new Bubble remembers which Bubble it came from. The woman who forks becomes the Founder of the new Bubble and can change her copy freely without affecting the original. Forking an existing syllabus is the encouraged path; building a syllabus from scratch is the secondary option. A forked Bubble always shows a credit to the Bubble it came from, which cannot be removed. When a woman starts creating a Bubble, existing syllabi on her topic are offered to her first; the agent's market research runs only if none fit or she chooses not to use one.
**Not to be confused with:** Joining a Bubble (becoming a member of an existing group) and a suggested change (a proposal sent to a syllabus owner, not yet part of this model).
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Founder

**Definition:** The woman who created a Bubble, or who created it by Forking another. Each Bubble has exactly one Founder. She holds every Moderator right, and in addition manages the Bubble itself: its members, waitlist and seats, closing or deleting it, and handing the Founder role to another Member. No one but an Admin can remove her from the role; otherwise she leaves it only by handing it to another Member.
**Not to be confused with:** Moderator, who edits the syllabus but does not manage the Bubble itself. Also not to be confused with Admin, whose authority is platform-wide.
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Moderator

**Definition:** A Member who can edit the whole syllabus of a Bubble, including sessions and sections written by others. A Moderator is made by the Founder, an Admin or another Moderator, and can in turn give the Moderator or Contributor role to other Members. Only Members can be made Moderators, so a woman who has not joined a Bubble can never edit it. Only the Founder or an Admin can remove or demote a Moderator. Every appointment is recorded with who made it and when. The role is per Bubble.
**Not to be confused with:** Founder (the single owner, who also manages members) and Contributor (limited rights, cannot change what others wrote). The earlier brief's "Moderator role", which was out of the MVP, meant a platform-wide role; that is now called Admin.
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Contributor

**Definition:** A Member who has been given limited permission by the Founder, an Admin or a Moderator. A Contributor can propose additional sessions and further content within a session (always as a Proposal), but cannot change or delete what the Founder or a Moderator wrote. The Founder, an Admin or any Moderator can remove her from the role. Every appointment is recorded with who made it and when. The role is per Bubble.
**Not to be confused with:** Moderator (full editing rights) and a plain Member (no permission to add to the syllabus).
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Proposal

**Definition:** Something a Contributor adds to a syllabus: a new session, or further content inside a session. A Proposal stays hidden from the other Members until a Moderator, the Founder or an Admin approves it. Until then only the Contributor who made it and the people who can approve it see it. Once approved it becomes part of the syllabus and credits the Contributor who proposed it. A Proposal that is not approved is kept for its author as a draft, not deleted.
**Not to be confused with:** A resource shared in the Resources tab. Any Member can add resources at any time without approval; they are not part of the syllabus. Also not to be confused with an edit made by a Moderator or the Founder, which takes effect immediately.
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Admin

**Definition:** A member of the WE community team with platform-wide authority. An Admin can edit or remove any Bubble and its syllabus, and can give or take away any role in any Bubble. The role is not tied to any single Bubble.
**Not to be confused with:** Founder, whose authority is limited to her own Bubble. The earlier project brief listed a "Moderator role" as out of scope for the MVP; Admin replaces that decision.
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Member

**Definition:** A woman who has joined a Bubble and holds a seat in it. A Member without edit permission can read the syllabus, add resources and record her own progress, but cannot change the syllabus; she is the "viewer" in everyday speech. A Member can be raised to Contributor or Moderator, and one Member is the Founder.
**Not to be confused with:** A non-member, meaning any other signed-in woman. A non-member has no edit rights over a Bubble at all, but can Fork its syllabus, which makes her the Founder of a new Bubble of her own. Also not to be confused with a woman on the waitlist, who holds no seat yet.
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Session

**Definition:** One meeting of a Bubble, about 90 minutes long, numbered S01, S02 and so on. It has a title, a date, a status (done, in progress or locked) and sections of learning content. Learners call it a lesson.
**Not to be confused with:** A sign-in session, and a Bubble's schedule (the weekly day and time on which its Sessions take place).
**Resolved:** 2026-10-14, during the grill session on the backend plan.

## Syllabus plan

**Definition:** The outline of a Bubble's Sessions (their titles and goals), made before any Session is built. The agent creates it after researching the topic the Founder asked to learn and sharpening that request, or it is written by hand. The Founder or a Moderator can edit it freely. A Session in the plan stays unbuilt until someone asks for it to be built, and Sessions are built one at a time, so a group can learn Session 1 before asking for Session 2.
**Not to be confused with:** A built Session, which has its learning content, and the syllabus as a whole, which is the plan together with the Sessions built from it.
**Resolved:** 2026-10-14, during the grill session on the backend plan.
