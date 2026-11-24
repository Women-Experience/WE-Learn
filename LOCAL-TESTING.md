# Testing WE Bubbles on your Mac (private, nothing online)

You'll run the website on your own computer only. It talks to your real
Supabase database, but the site itself is reachable only from your Mac.

## One-time setup (≈10 minutes)

**1. Install Node.js** (the engine that runs the site).
   Go to https://nodejs.org → download the **LTS** version → run the installer.
   To check it worked: open the **Terminal** app (⌘-Space, type "Terminal")
   and type `node -v` then Enter. You should see a version like `v22.x.x`.

**2. Unzip the project.** Double-click `we-learn-source.zip` (from Claude).
   You get a folder called `WE-Learn`. Move it somewhere sensible, e.g. Documents.

**3. Open Terminal inside that folder.**
   Easiest way: in Terminal type `cd ` (with a space), then drag the `WE-Learn`
   folder from Finder into the Terminal window, then press Enter.

**4. Install the project's building blocks** — type:

    npm install

   (takes 1–2 minutes; lots of text scrolls by — that's normal.)

**5. Create the settings file** — type:

    cp .env.example .env

   (This copies the public Supabase connection values into place.)

**6. Tell Supabase and Google that "localhost" is allowed** (so sign-in works
   on your Mac):
   - Supabase dashboard → **Authentication → URL Configuration**:
     - Site URL: `http://localhost:5173`
     - Redirect URLs → Add: `http://localhost:5173/**`
     → Save.
   - (Google's redirect URI stays the Supabase callback URL you already
     entered — no change needed there.)

## Every time you want to test

In Terminal, inside the `WE-Learn` folder:

    npm run dev

Then open **http://localhost:5173** in your browser. Leave Terminal open while
you test; press **Ctrl-C** in Terminal to stop.

## Things to try (a test script)

Signed out:
- Landing page shows the "Be the first Bubble" invitation (empty database) — no error.
- Open a bubble (once one exists): syllabus says "Sign in to preview…", members
  say "Sign in to see who's in this Bubble." — no broken images, no menus.

Sign in (top-right "Sign in" → Google):
- After Google, you land back on the site signed in; avatar/initial top-right.
- Create a Bubble via "Create new": all six steps; pick a seat size; launch.
  You should land in your new bubble as founder.
- Syllabus: Add Session; edit it (title, date, status → Done); Save; reload the
  page — changes persist. Try Duplicate, Move up/down, Delete + Undo.
- Resources: add a link (must start with https://). Try a `javascript:` link —
  it should be refused.
- Members: "Add Member" gives a copy-able link.

Second person (best with a second Google account, or ask a teammate):
- Open the invite link → sign in → Join Bubble → answer the checks → tick the
  notification consent → join. Founder's Members tab now shows her.
- Fill the bubble to its seat limit and try joining with one more account:
  she should be waitlisted; founder sees a Waitlist section with **Admit**.
- As a member: submit a project link + reflection on a session; reload; it's
  still there — and the founder does NOT see her own fields overwritten.
- As a member: Members tab → "Leave Bubble" works. Founder → "Make founder"
  hands over leadership.

If anything looks wrong, take a screenshot and tell Claude what you did.
