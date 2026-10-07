# Tasky Automate (TaskFlow)

Marketing team task, project and workload manager.

- `frontend/` — React 18 + Vite + Tailwind (shadcn-style UI components in `src/components/ui`)
- `backend/` — Express API with a JSON-file store (`backend/data/db.json`), entity schemas in `backend/schemas/`

## Run

```bash
npm run install:all
npm run build     # builds frontend/dist
npm start         # http://localhost:4000 serves API + built frontend
```

Development: `npm run dev:backend` (port 4000) and `npm run dev:frontend` (port 5173, proxies `/api`).

Tests: `npm test` (backend) · Lint: `npm run lint`.

## Notes

- No login system: the nav bar has an "acting user" switcher. Roles: `admin`, `team_leader`, `team_member`. A default admin is seeded on first start.
- AI allocation uses the Anthropic API when `ANTHROPIC_API_KEY` is set (optional `ANTHROPIC_MODEL`); otherwise a balanced round-robin fallback is used.
- Env: `PORT` (default 4000), `DATA_DIR` (default `backend/data`).
- Google Sheets integration only stores the sheet ID/status; there is no live Google sync.
