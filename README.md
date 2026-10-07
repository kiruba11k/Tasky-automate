# Tasky Automate (TaskFlow)

Marketing team task, project and workload manager. Invitation-only login, Postgres (Neon) storage.

- `frontend/` — React 18 + Vite + Tailwind (shadcn-style UI components in `src/components/ui`)
- `backend/` — Express API, entity schemas in `backend/schemas/`, Postgres via `pg`

## Run locally

```bash
npm run install:all
npm run build     # builds frontend/dist
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=change-me-123 npm start   # http://localhost:4000
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

## Login (invitation only)

There is no sign-up. Accounts exist only if an admin (or a team leader, for team members) invites them.

- **First admin:** set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (min. 8 chars) before the first start. If you set only `ADMIN_EMAIL`, an invitation link is printed in the server log instead. These are only used while no admin exists, so you can delete `ADMIN_PASSWORD` afterwards.
- **Inviting:** Management → Team Members → Add Member. A one-time link (valid 7 days) is shown to share; the invitee opens it and sets their own password. "Reset password" on a member issues a new link and invalidates their current password.
- Passwords are hashed with scrypt; sessions are 7-day JWTs signed with `JWT_SECRET` (required in production); login is rate-limited (10 attempts / 15 min per IP + email).
- Roles: `admin` (everything), `team_leader` (manages team members), `team_member`.

## Deploy on Render (free)

1. Push this repo to GitHub and create the Neon database (above).
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` configures the service; `JWT_SECRET` is generated for you.
3. When prompted, set `DATABASE_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (optionally `ANTHROPIC_API_KEY`).
4. Open `https://<name>.onrender.com`, sign in as the admin, and invite everyone else from Management.

Free-tier note: the service sleeps after ~15 min idle (first request takes ~30–60 s). Data lives in Neon, so restarts and redeploys lose nothing.
Manual setup without the Blueprint: Web Service · Node · Build `npm run render-build` · Start `npm start` · Health check `/api/health` · env as above plus `NODE_VERSION=22`, `NODE_ENV=production`.

## Environment variables

`DATABASE_URL`, `JWT_SECRET` (required in production), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PUBLIC_URL` (base URL used in log links), `PORT` (default 4000), `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` (optional AI allocation; otherwise a round-robin fallback is used), `DATA_DIR` (JSON fallback only).

## Notes

- Google Sheets integration only stores the sheet ID/status; there is no live Google sync.
- Uploaded files are served at unguessable `/uploads/<uuid>` URLs as attachments.
