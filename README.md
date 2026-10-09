# Tasky Automate (TaskFlow)

Marketing team task, project and workload manager. Email-only login restricted to an allow-list in the database, Postgres (Neon) storage.

- `frontend/` — React 18 + Vite + Tailwind (shadcn-style UI components in `src/components/ui`)
- `backend/` — Express API, entity schemas in `backend/schemas/`, Postgres via `pg`

## Run locally

```bash
npm run install:all
npm run build     # builds frontend/dist
ADMIN_EMAIL=you@example.com npm start   # http://localhost:4000
```

Development: `npm run dev:backend` (port 4000) and `npm run dev:frontend` (port 5173, proxies `/api`).
Tests: `npm test` (add `TEST_DATABASE_URL=postgres://...` to also run the suite against Postgres — it truncates the tables). Lint: `npm run lint`.

## Database (Neon Postgres)

1. Create a free project at https://neon.tech and copy the **connection string** (`postgresql://...neon.tech/neondb?sslmode=require`).
2. Set it as `DATABASE_URL`. **Tables are created automatically on startup** (idempotent). Alternatives:
   - `DATABASE_URL=... npm --prefix backend run db:migrate`
   - paste `backend/db/schema.sql` into Neon's SQL editor (regenerate with `npm --prefix backend run db:schema`).
3. Tables: `users`, `teams`, `team_members`, `projects`, `tasks`, `daily_tasks`, `project_resources`, `activity_logs`, `sheet_syncs`, `file_uploads`, `uploaded_files` (uploaded file bytes live in Postgres, so nothing depends on the web server's disk).

Without `DATABASE_URL` the server falls back to a local JSON file store (`backend/data`) for development only.

## Login (email only, allow-list)

There is no sign-up and no password. Signing in needs only an email, and that email must already be in the `users` table.

- **First admin:** set `ADMIN_EMAIL`; it is created on first start if no admin exists.
- **Adding people:** Management → Team Members → Add Member (admins can add anyone; team leaders can add team members). The email is stored in the database and that person can sign in immediately. Set a member's status to Inactive or delete them to revoke access (existing sessions stop working at once).
- Sessions are 7-day JWTs signed with `JWT_SECRET` (required in production). Login is rate-limited (20 attempts / 15 min per IP + email).
- Roles: `admin` (everything), `team_leader` (manages team members), `team_member`.
- **Security note:** because no password or code is checked, anyone who knows or guesses an allowed email (including the admin's) can sign in as that person. Keep the admin email private and use this only for internal tools. If you later want real verification, add an emailed one-time code on top of the same allow-list.

## Weekly tasks and notifications

- **Weekly Tasks** tab (everyone). Leaders get *Allocate*, *Approvals* and *My week*; members get *My week*.
- **Allocate** is laid out like the team's weekly sheet: Project · Task · Target / Expected Result (free text) · Assigned To · Estimated hrs · Result · Status. Assign one or more people to a task (shared tasks); the estimated hours are shared between them and spread over their days (Mon–Fri by default, adjustable per person with the calendar icon). Leave hours empty for N/A. Project names can be existing projects or free text such as "Others".
- **Import from sheet:** copy the rows (with the header) from Google Sheets/Excel and paste them, or load a CSV. The Project cell applies to the rows below it until a blank row, "Alok/Jutraban" is matched to users, and the week is detected from "Project Dates" (dd/mm/yy). Names with no matching user are listed as warnings. Result and Status columns are ignored. **Export CSV** produces the same columns.
- **Copy from last week** repeats last week's tasks and people so you only change what differs.
- **Save & notify** creates the daily tasks (leaders and project managers included) and notifies everyone affected at once. Unchanged allocations are not re-notified.
- **Approval:** a member's *Submit for approval* (with a written result) goes to the leaders; they *Approve* or *Request changes* (a reason is required). Status shows TRUE once every assignee is approved. Changing a submitted/approved allocation reopens it.
- **Notifications:** pushed live to the screen (bell with unread count, pop-up toasts, optional desktop alerts) when work is allocated, changed, removed, submitted, approved or sent back, and when a leader assigns/edits a daily task or a project. Delivery uses Server-Sent Events with automatic reconnect and catch-up.

## Voice dictation

A **Dictate** button sits on Weekly Tasks → Allocate (leaders) and on Daily Tasks (everyone).

1. Press *Start dictating* and speak (or type / paste text). Speech-to-text uses the browser's built-in speech service (Chrome, Edge, Safari; language selectable, default English-India). It keeps listening through pauses until you press Stop.
2. *Understand* sends the text to the server, which extracts tasks — project, task, target / expected result, estimated hours, people, days — and matches spoken names to real users (ambiguous or unknown names are flagged, never guessed) and weekdays to dates. "Me/I" means the speaker.
3. *Check and assign*: every task is editable (assignees, days, hours…). Nothing is created until you confirm.
   - Weekly: *Add to week* puts the rows in the allocation grid as a draft; *Add & save now* saves and notifies immediately.
   - Daily: creates the daily tasks (one per assignee); assignees are notified. Members can only create tasks for themselves; leaders can assign teammates.

With `ANTHROPIC_API_KEY` set, an AI model does the understanding (handles free-form speech, corrects misheard names against your team/project lists). Without it a simpler rule-based parser is used, which copes with clear phrasing ("Komala and Alok review 100 prospects for BlueDove, target 35% connection rate, 8 hours") but not complex speech. Browser dictation may send audio to the browser vendor's speech service.

## Fun layer (Tasky the mascot)

Everything you do gets a playful reaction, driven by one event bus (`frontend/src/fun`):

- **Tasky**, an animated SVG mascot (bottom-left) with moods — cheering, thinking while something saves, sorry on errors, asleep when idle. Tap Tasky for a joke.
- **Cat & mouse chase progress:** every target (today's tasks, quests, weekly days, projects, team goal) is a chase: a sleepy cat wakes and pursues a mouse who runs for his hole; at 100% the mouse escapes and the cat bonks into the wall. Original characters. Choose Cat & mouse / Rocket / Classic bar and toggle wandering critters in the level chip's settings. A header button pauses all motion (WCAG 2.2.2); `prefers-reduced-motion` defaults to calm. Pages also stagger-in and reveal on scroll.
- **3D characters:** a cast of 18 original, procedurally built 3D buddies (cat, tabby, mouse, fox, panda, bunny, bear, dog, owl, penguin, dino, robot, frog, elephant, unicorn, turtle, octopus, lion) (react-three-fiber, toon shading with ink outlines, no model files). The corner buddy changes with the page (cat on Dashboard, owl on Management, fox on Projects, robot on Daily Tasks, panda on Weekly, penguin on Analytics, and so on) and reacts to your moves (cheer, wave, scared, sleep). The chase progress, login and empty states use them too. Meet and pin a favourite at `/Cast` (also linked from the level chip's settings). Turn 3D off in settings, or it falls back to the 2D art automatically when WebGL isn't available; rendering pauses off-screen and in calm mode.
- **Focus and time:** the focus timer shows your buddy studying with you (book in hand) or racing you to a finish flag; when a session ends it offers a 5-minute guided stretch break where the buddy stretches. A fork-and-knife button in the header starts a lunch break (30/45/60 min): a calm sunset pause screen with your buddy eating.
- **Team feel:** when someone sends or receives a high-five, the two buddies run in and high-five at the bottom of the screen. The Dashboard has a *Team relay* (a baton passes to whoever finished a task last) and the *Team parade* (everyone's buddy marching, with their week so far) in the level chip's settings and on Fridays.
- **Rewards:** finishing work earns mystery eggs (the first after 3 tasks, then one per 10 tasks and per 3 badges). Hatch them for a new buddy or an accessory (hats, scarves, glasses); the roll happens on the server. Wear accessories and pin a buddy at `/Cast`; teammates see them in the relay, parade and high-fives. The sticker album is now a page-turning sticker book where new finds slap onto the page.
- **Daily rhythm:** a yawn-and-stretch wake-up in the morning, a Friday celebration (with a parade button) and an end-of-day pack-up. Each shows once a day and can be turned off (*Daily rhythm*).
- **Feedback on actions:** the *Done jar* fills with a marble per finished task and marbles fly into it when you complete something. On Daily Tasks, drag a pending task's grip handle onto the jar to finish it (the card squashes and stretches as you drag). Checkboxes pop, and an empty notification inbox becomes a calm night scene with a sleeping buddy.
- **Ambient:** the greeting card has a day/night sky (sun or moon travels with the clock), seasonal weather follows the calendar (autumn leaves, winter snow, spring petals, summer sparkles; toggle *Seasonal weather*), and a *Balloon* progress style lifts a hot-air balloon as the team goal nears.
- **Delight:** the Konami code (or tapping the corner buddy 7 times) starts a secret cast party with all 12 buddies dancing; *Cheese Dash* is a one-button mini-game you can play from the settings, `/Cast`, or while a page is slow to load.
- **Page scenes:** every page has a themed 3D banner with its own buddy and live numbers (hide it with the X, or turn *Page scenes* off in settings): Daily Tasks is a robot at a workbench with a sticky note per task still to do; Weekly Tasks is the weekly express with a waving passenger per car; Analytics is a penguin with a magnifier beside planned/done/to-go bars; Management is an owl presenting while gears spin faster the more the team gets done; Projects is a fox with a hammer building a tower (one block per step of average progress) under a crane; Tasks is a bunny at a sorting depot with crates by status; Team is a group photo with a camera flash; AI Allocation is a wizard bear whose crystal ball sends task cubes to the team; Integration shows data packets flowing from a cloud into a spreadsheet.
- **Extra touches:** the login screen has a mouse peeking out of a hole that watches your cursor (click it and it ducks); `/Cast` has a curtained fitting room with a turntable you can drag to spin, and hovering any accessory (even locked ones) previews it; on Fridays the weekly train throws a party with confetti and party hats; the Management banner has a *Team health* thermometer (completion this week plus how many people finished something today, never a ranking).
- **The rest of the app:** a thin shimmering bar with the cat chasing the mouse runs across the top whenever something loads or saves; click sparkles pop when you press buttons; a rocket button appears after you scroll and blasts you back to the top; dictation shows your buddy cupping a hand to its ear beside a live waveform; delete confirmations have a startled buddy (dizzy while deleting); an empty approvals inbox becomes the calm night scene; new table rows slide in with a green flash; error alerts shake; inputs glow on focus; after 5 idle minutes the cast bounces around the screen with a clock (screensaver; any input wakes it). Each can be turned off (*Click sparkles*, *Screensaver*), and everything respects calm mode.
- **For everyone:** notifications, themes, the level chip and fun settings, buddies, eggs, the arcade and every animation are available to all three roles (admin, team leader, team member); nothing playful is role-gated, and a backend test checks each role. The header adapts to the screen: full labels on very wide screens, icons plus the current page's name on laptops, and a scrolling page row on phones, so the controls are never cut off.
- **Every screen:** tested from 320px phones to 2560px monitors (no horizontal overflow on any page). Banners stack on phones and re-fit their 3D scenes to the width, controls and floating pieces respect notches and home bars (`safe-area` insets, `viewport-fit=cover`, `dvh`), hover-only buttons are always visible on touch screens, hover lifts only apply where a mouse exists, touch targets are at least 36px, landscape phones drop the banner, big monitors scale the whole UI up (18px base from 1800px, 22px from 2400px), and 3D renders at a lower resolution and frame rate on touch devices. 3D is switched off by default on devices reporting 2 GB of memory or 2 cores (turn it on in settings).
- **More 3D moments:** a *Team garden* on the Dashboard (a frog waters a flower bed that gains one flower per task the team finishes this week, with butterflies); a level-up podium (your buddy cheers on a gold podium inside a ring of spinning stars); the daily treasure chest is a 3D chest that shakes and flips its lid; new badges are a spinning 3D medal; the trophy shelf opens onto a cabinet with a gold cup per earned badge; and an optional *Cursor pal* (settings, off by default, desktop only) trails your mouse pointer. The *Arcade* (level chip settings, or `/Cast`) now has two games: Cheese Dash and Memory Match (card-flip buddy pairs). The cast grid mounts 3D canvases only while they are near the screen, so pages with many buddies never run out of WebGL contexts.
- **Celebrations:** icon confetti, comic "POW! / BAM! / ZOOM!" bursts, an "APPROVED!" stamp, synthesized sound effects. Creating, completing, assigning, allocating, submitting, approving, sending back, deleting and dictating each have their own moment. Bursts of activity (imports, bulk creates) collapse into one celebration, and big effects are rate-limited.
- **Receiving too:** when someone assigns you work or approves yours, your screen reacts live (via the notification stream).
- **Levels and streaks:** +10 XP per finished daily task, +40 XP per approved weekly task; ten silly level titles (Task Hatchling → Cosmic Closer); day streaks with milestone fireworks. Computed from real data at `GET /api/me/stats`. A one-click **Done!** button on daily task cards completes a task.
- **Look and feel:** rounded Fredoka font, sticker-style cards, bouncy dialogs and page transitions, squishy buttons, bouncing loaders, sleepy empty states, a greeting banner on the dashboard.
- **Control:** the level chip in the header opens a panel to turn off the cartoon look, celebrations (calm mode), sound, or the mascot. `prefers-reduced-motion` starts in calm mode automatically.

## Engagement layer: reasons to come back to the dashboard

Designed from what research says works (streaks are the best-evidenced hook; rewards should track finished work, not logins; progress should be visible at several levels; team goals and peer recognition help while leaderboards often backfire; broken streaks demotivate, so be forgiving). Everything is derived from real work, and nothing ranks people against each other.

- **Daily quests** (3 a day, +15 XP each): finish tasks, log the time on one (leaders: approve a submission), send a high-five. Progress bars plus a "today" ring.
- **Forgiving streak:** counts working days with a finished task. Weekends never count against you, and every 5 days earns a shield (max 2) that quietly covers one missed day. A missed streak just says "start a new one"; an evening nudge says "finish a task to keep it".
- **Daily treasure chest:** unlocked by *finishing a task* (not by opening the app). Holds one of 24 collectible stickers (common / rare / epic, rolled on the server); duplicates give bonus XP. Sticker album in the trophy shelf.
- **19 badges** with progress bars for the locked ones (First Win, Hat-trick, Perfect Day, streaks, Timekeeper, Sharpshooter, Hype Person, Mentor, Voice Wizard…), each with an unlock celebration.
- **Team rocket:** the team's weekly goal (finish everything planned). Every finished task moves the rocket; the whole team celebrates when it reaches the moon.
- **Team wins feed + high-fives:** positive-only activity with one-tap 🙌🔥🌟💪 that notifies the receiver live. Max 20 a day.
- **Focus timer:** 15/25/50-minute sessions on a task, a countdown pill, and on completion an offer to log the time on the task.
- **Micro-delights:** floating "+10 XP" from where you clicked, count-up numbers, Tasky nudges when you've been idle ("2 tasks left today"), and a secret code (↑↑↓↓←→←→BA).
- Controls live in the header level chip (celebrations, sound, mascot, cartoon look). Rewards are cosmetic and small, to avoid crowding out intrinsic motivation.

API: `POST /api/me/sync` (evaluates and records quests/badges once), `GET /api/me/trophies`, `POST /api/me/daily-drop`, `GET /api/team/pulse`, `POST /api/kudos`. Achievements and kudos are written only by the server.

## Themes

Eight built-in themes — **light:** Sunny Day, Bubblegum Pop, Mint Fresh, Sky Pop; **dark:** Midnight (the original), Neon Arcade, Forest Night, Cherry Cola — each with its own background pattern and a mascot tinted to match. Switch from the header: ☀/🌙 quick toggle, or the palette button for the gallery (live mini-previews). Also: **Match my device** (follows the system light/dark setting live), a **Cartoon style** switch (outlined stickers, bouncy buttons, hard shadows), and **Make your own theme** (pick a mode, two colours and a background tint; export/import as JSON to share with teammates).

- The choice applies instantly, is applied before the first paint (no flash) and is saved on the user's account, so it follows them across devices (the newer of "this browser" and "the account" wins at sign-in).
- **How it works:** Tailwind's colour scales (slate, blue, red, green …) are CSS variables, so a theme re-colours every existing `bg-*`/`text-*`/`border-*` class without touching components. In light themes the neutral scale keeps each class's *role* (page, card, muted text…) and pale text shades are swapped for dark ones. `text-white` means "main text colour" and stays white only on solid colour fills.
- **Accessibility:** shades of 600+ are darkened automatically until white text on them reaches WCAG AA, whatever colours a theme or a user picks. `npm --prefix frontend test` checks text, muted text, buttons, links and status chips against AA for every theme.
- **Adding a theme (an extension, not a code change):** drop a file in `frontend/src/themes/packs/` that exports a definition — `{ id, mode: 'light'|'dark', name, tagline, icon, neutral: {hue, sat}, primary, secondary, accent, pattern, patternSize, mascot }` — see any existing pack. It appears in the gallery automatically; run `npm --prefix frontend test` to verify contrast. Use `text-ink` (not `text-slate-900`) for dark text on bright fills.
- API: `theme`, `theme_auto`, `theme_custom` (strictly validated JSON: name, mode, two `#rrggbb` colours, tint) and `theme_at` on `PATCH /api/auth/me`.

## Icons

The UI uses real icon-library artwork (Streamline Plump/Flex Color line icons and Game-Icons.net illustrations) instead of any emoji art, so it looks identical on every device and works offline. Emoji characters stay as the stable keys in the data (kudos, badges, stickers); `src/icons/Emoji.jsx` swaps them for artwork at render time (`<Emoji e="🔥" />`, or `<Rich text="Nice 🎉" />` for strings), and the confetti/burst effects use the same art. The artwork is bundled in `frontend/src/icons/emojiIcons.generated.js`. When you introduce a new emoji anywhere in `frontend/src` or `backend/src`, run `npm --prefix frontend run build:icons` to add its artwork.

Artwork credits: [Streamline Plump & Flex Color](https://www.streamlinehq.com/) (CC BY 4.0) and [Game-Icons.net](https://game-icons.net) (CC BY 3.0; Lorc, Delapouite & contributors), via Iconify. The character→icon mapping lives in `frontend/scripts/build-emoji-icons.mjs`.

## Deploy on Render (free)

1. Push this repo to GitHub and create the Neon database (above).
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` configures the service; `JWT_SECRET` is generated for you.
3. When prompted, set `DATABASE_URL` and `ADMIN_EMAIL` (optionally `ANTHROPIC_API_KEY`).
4. Open `https://<name>.onrender.com`, sign in with the admin email, and add everyone else from Management.

Free-tier note: the service sleeps after ~15 min idle (first request takes ~30–60 s). Data lives in Neon, so restarts and redeploys lose nothing.
Manual setup without the Blueprint: Web Service · Node · Build `npm run render-build` · Start `npm start` · Health check `/api/health` · env as above plus `NODE_VERSION=22`, `NODE_ENV=production`.

## Environment variables

`DATABASE_URL`, `JWT_SECRET` (required in production), `ADMIN_EMAIL`, `PORT` (default 4000), `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` (optional AI allocation; otherwise a round-robin fallback is used), `DATA_DIR` (JSON fallback only).

## Notes

- Google Sheets integration only stores the sheet ID/status; there is no live Google sync.
- Uploaded files are served at unguessable `/uploads/<uuid>` URLs as attachments.
