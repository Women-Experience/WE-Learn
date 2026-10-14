# ADR 0003: The agent is staged, plan-first, run by the server, and quota-limited

**Status:** Accepted, with the open items listed at the end
**Date:** 2026-10-15

## Context

Today the "Build with AI" button calls a function that returns fixed mock sessions; no real model is called. A detailed agent prompt ("Professional Learning Architect v6.2") already exists in the repo and requires verified links and no invented sources.

The project has no budget, learners do not pay, and the pilot starts with about 60 women and may grow to a few thousand. That means free providers only, and free models are slower, limited in output size and prone to inventing links when they cannot search.

## Decision

**1. Build in stages.**

- **A:** backend, manual building, Fork, Admin, and Import (see point 8). The product is useful without any agent.
- **B:** research and a Syllabus plan.
- **C:** building one Session on request, with verified sources.
- **D:** quality review, refreshing Sessions, and optional extras.

**2. Plan first, one Session at a time.** The agent sharpens the Founder's request, researches the topic and proposes a Syllabus plan: Sessions with titles and goals and no content yet. The Founder or a Moderator edits the plan freely. Sessions are built one at a time on request, so a group can learn Session 1 before asking for Session 2. A Session that has not been built is simply one in the `locked` status with no sections, so the existing data model already fits.

**3. Existing before new.** Before any agent run, when a woman gives a topic, she is offered, in this order: open Bubbles on the topic to join, then existing syllabi to fork, and only then research and a new plan. Matching starts with the existing typo-tolerant text search, which costs nothing. This also keeps the community from splitting into many small Bubbles.

**4. The server does the research.** The server runs a fixed set of a few web searches on the topic and gives the results to the model, which only summarizes and plans. In stage C the model may choose sources only from search results, and the server checks that each link actually opens and drops dead ones. The model is never asked to invent a URL.

**5. Fixed output format.** The agent always returns Sessions and sections in the shape the screens already use, so changing a model or a prompt never touches the database or the interface.

**6. A ladder of providers.** The server tries the first provider on an ordered list and moves to the next on an error or a limit. Changing providers is a change to the list, not to the code.

**7. Limits, enforced on the server and logged.**

- Who can run the agent: the Founder, a Moderator or an Admin. Contributors and Members cannot, and it never runs by itself in the background.
- Per Bubble: up to 3 plan runs in total, and up to 3 Session builds per week.
- Per woman, across all her Bubbles: a weekly cap and a daily cap. Starting values: 5 runs a week and a daily cap to be set before the pilot. Content Leads get a larger allowance.
- Across the whole platform: a daily cap, and when it is reached the screen says the agent is busy and building by hand still works.
- A Fork is not a plan run, because the syllabus is copied rather than created. Building Sessions in a copy counts.
- Every run is recorded, and an Admin can reset an allowance.
- These are starting values stored in one settings table, to be calibrated from real use in the pilot.

**8. Import.** A woman can bring a syllabus built elsewhere, in any AI tool or by hand, by pasting it or uploading a file. A template can be downloaded, and a ready-made prompt (based on v6.2) is provided that produces the template's format in any AI tool. The format is validated and the errors are explained plainly: required structure, only `https` links, size limits. An imported syllabus arrives as a Syllabus plan for the Founder to review. This costs the platform nothing, because the AI account used is the woman's own.

## Alternatives considered

- **Generate the whole syllabus in one call.** Rejected: free models are slow and limited in output, and a full syllabus is wasted if she dislikes the plan.
- **The model searches by itself with tools.** Rejected: free models call tools unreliably, and it costs more runs. Fixed server-side searches work with any model.
- **Let women sign in with their Claude or ChatGPT subscription so the platform uses it.** Not available today. Anthropic's terms prohibit using Free, Pro or Max subscription tokens in third-party apps; the allowed route is an API key from the Claude Console with usage billing. OpenAI's "Sign in with ChatGPT" is an identity sign-in, and sharing subscription usage is limited to a small set of partner tools. Checked on 2026-10-15; this can change.
- **A paid provider.** Rejected: there is no budget.
- **Per-Bubble limits only.** Rejected: one woman could create many Bubbles and multiply her allowance. See ADR 0004 for the limits on Bubbles.

## Consequences

- The platform works with no agent at all, and each stage adds value without rewriting the previous one.
- Free providers will sometimes be slow, limited or unavailable; the ladder, the visible "busy" message and manual building are the answer.
- Free-tier terms matter for privacy. For example, Google's free Gemini tier uses content to improve its products. Only the topic, level, schedule and public search results are ever sent to a model, never names or personal details.
- Import turns every AI tool women already use into a free "agent" for the platform.

## Open items

- **Provider.** Recommended: a free Gemini Flash model first and a free Groq model as the fallback, with more providers added later. Free limits and terms change often and must be checked before launch.
- **Where the agent runs.** Recommended: Supabase Edge Functions, in the same account as the database, with provider keys stored as server secrets and never in the repository.
- **Women using their own key or connecting a chat tool to the platform** (their own API key, or an MCP connection from Claude or ChatGPT). Possible later; a later decision.
- **The daily cap per woman and the platform-wide daily cap:** the numbers.
- **Template strictness.** The recommendation adopted here: the format is required, with clear error messages and a downloadable template, because a uniform format is what turns an import into Sessions.
