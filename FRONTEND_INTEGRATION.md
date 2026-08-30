# GuardRail Frontend ↔ API Integration

_Last updated: 2026-08-26_

The existing Next.js UI (`guard-rail/`) is now fully wired to the Rails API
(`guardrail-api/`). Every page that previously rendered mock data from
`lib/data.ts` now calls the real backend. This document explains how to run the
two together and how each page maps to the API.

> For an honest, feature-by-feature account of what the API does **not** support
> (and how the UI handles it), see **`FRONTEND_GAPS.md`**.

---

## 1. How the two apps talk

- **Backend (`guardrail-api`)** runs on **`http://localhost:3000`** (Rails,
  API-only).
- **Frontend (`guard-rail`)** runs on **`http://localhost:3001`** (Next.js App
  Router). It must be `:3001` because the backend's CORS config allows
  `:3000`, `:3001`, and `:5173`.
- The frontend reads its API base from the environment variable
  **`NEXT_PUBLIC_API_URL`**, defaulting to `http://localhost:3000` when unset.

### Authentication (Devise + JWT)

1. `POST /api/v1/login` (or `/signup`) returns the JWT in the **`Authorization`
   response header** as `Bearer <token>` — not in the JSON body.
2. The client reads that header and stores the token in `localStorage`
   (`guardrail_token`, plus the user in `guardrail_user`).
3. Every subsequent request sends `Authorization: Bearer <token>`.
4. Any `401` clears local auth, broadcasts a `guardrail:unauthorized` event, and
   the auth provider redirects to `/login`.

> **CORS requirement:** `rack-cors` must **expose** the `Authorization` header,
> or the browser can't read the token off the login response. The backend is
> already configured for this — just don't remove it.

---

## 2. Running locally

Start the backend first:

```bash
# in guardrail-api/
bin/rails db:setup      # first time only
bin/rails server        # serves on http://localhost:3000
```

Then the frontend, on port 3001:

```bash
# in guard-rail/
npm install             # first time only
# optional: echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
npm run dev -- -p 3001  # serves on http://localhost:3001
```

Open `http://localhost:3001`, sign up or log in, and the UI runs against live
data.

> The frontend's root config files (`package.json`, `next.config`, `.env.local`)
> live outside the folders shared with this integration, so the exact `dev`
> script wasn't modified here. If `npm run dev` doesn't accept `-p`, set the port
> another way (e.g. `PORT=3001 npm run dev`, or a `dev` script that passes
> `-p 3001`). The only hard requirement is that the browser origin is
> `http://localhost:3001`.

---

## 3. Page → endpoint map

| Page | Route | Backend endpoint(s) |
|---|---|---|
| Login / Sign up | `/login`, `/register` | `POST /login`, `POST /signup` |
| Dashboard | `/` | `GET /dashboard` |
| Projects list | `/projects` | `GET /projects` |
| Project detail | `/projects/:id` | `GET /projects/:id`, `/security`, `/dashboard`, `/security/history`, `/vulnerabilities/recent`, `/security_policies` |
| Repositories | `/repositories` | `GET/POST/PATCH/DELETE /repositories` |
| Security | `/security` | `GET /vulnerabilities` (+ project security) |
| Alerts | `/alerts` | `GET /vulnerabilities`, `PATCH /vulnerabilities/:id` |
| Deployments | `/deployments` | `GET /scans`, `GET /scans/:id/security_summary` |
| Pipelines | `/pipelines` | `GET /scans`, `GET /scans/:id/gate` |
| Webhook Events | `/events` | `GET /dashboard` (`webhooks.recent_events`, `activity_24h`) |
| Webhooks | `/webhooks` | `GET /projects` (per-project inbound config) |
| Settings | `/settings` | current user (from auth) |
| Audit Logs | `/audit-logs` | — (no endpoint; honest notice) |
| Forgot password | `/forgot-password` | — (no endpoint; honest notice) |

---

## 4. Where the integration code lives

- **`lib/api-types.ts`** — TypeScript interfaces mirroring the API's JSON
  shapes (verified field-by-field against the controllers and `db/schema.rb`).
- **`lib/api.ts`** — the fetch layer: `API_BASE`, auth header injection, `401`
  handling, and one typed function per endpoint (`getScans`, `getScanSummary`,
  `getScanGate`, `getDashboard`, `getProjects`, `getVulnerabilities`, …).
- **`lib/auth.tsx`** — auth provider, `useAuth()`, token storage, redirect logic.
- **`components/ui/states.tsx`** — shared `PageLoading` / `ErrorState` /
  `EmptyState` / `InlineSpinner` / **`NotImplementedNotice`** used to flag
  unbacked features honestly.
- **`app/**/page.tsx`** — each page fetches through `lib/api.ts`; none import
  `lib/data.ts` any longer.

---

## 5. Design principle followed throughout

Where the backend genuinely lacks a feature the original mock implied, the UI
does **not** fabricate data. It either removes the control or renders a
`NotImplementedNotice` explaining what's missing and why, and — where a real
adjacent capability exists — points to it. The full list is in
`FRONTEND_GAPS.md`.
