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
