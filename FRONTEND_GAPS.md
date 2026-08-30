# GuardRail Frontend — Integration Gaps & Honesty Report

_Last updated: 2026-08-26_

This document is the honest companion to the frontend↔backend integration. The
existing Next.js UI (`guard-rail/`) was designed against mock data in
`lib/data.ts` and imagined a broader product than the current Rails API
(`guardrail-api/`) actually implements. Every page has now been wired to **real**
API endpoints, and every feature the mock showed that the backend does **not**
support has been **removed and replaced with an in-app `NotImplementedNotice`**
rather than filled with fake data.

This report enumerates exactly what is and isn't backed, so there are no
surprises.

---

## 1. What the backend actually exposes

Routes (`config/routes.rb`, all under `/api/v1`):

| Area | Endpoints |
|---|---|
| Auth (Devise + JWT) | `POST /login`, `POST /signup`, `DELETE /logout` |
| Dashboard | `GET /dashboard` |
| Projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id` |
| Project security | `GET /projects/:id/security`, `GET /projects/:id/dashboard`, `GET /projects/:id/security/history`, `GET /projects/:id/vulnerabilities/recent` |
| Security policies | `GET/POST /projects/:id/security_policies`, `GET/PATCH/DELETE /security_policies/:id` |
| Repositories | `GET/POST /repositories`, `GET/PATCH/DELETE /repositories/:id` |
| Scans | `GET /scans`, `GET /scans/:id`, `GET /scans/:id/vulnerabilities`, `GET /scans/:id/security_summary`, `GET /scans/:id/policy_results`, `GET /scans/:id/gate` |
| Vulnerabilities | `GET /vulnerabilities`, `GET /vulnerabilities/:id`, `PATCH /vulnerabilities/:id` |
| Webhooks (inbound) | `POST /webhooks/github` |

Everything in the UI is now built on exactly these endpoints.

---

## 2. Features shown in the mock that the API does NOT support

Each item below was in the original design and has been removed (with an
explanatory notice left in its place).

### Deployments (`/deployments`)
There is **no deployment or infrastructure model** in the backend — no
environments (production/staging/development), no Kubernetes namespaces or pods
(name, CPU, memory, restarts, age), no ArgoCD sync state, no replica-set or
container counts, and no deploy-duration / success-rate / avg-deploy-time
metrics.

**Reframed to:** the security **scan runs** the backend records (one per commit,
via push / PR / CI). Each row expands to the real `security_summary` (score,
severity breakdown, score penalties, open/resolved/ignored counts).

### Pipelines (`/pipelines`)
There is **no CI/CD pipeline model** — no build/test/deploy stages, no per-stage
status or duration, and no stored job logs. There is also **no scan-trigger
endpoint**, so the mock's "Trigger Pipeline" action was removed (scans are
created by inbound webhooks, not on demand).

**Reframed to:** scan runs, each expanding to the real security **gate**
(`/scans/:id/gate`) — a passed/warning/failed decision with security score, open
findings by severity, and per-policy evaluation results (including
`block_on_failure`).

### Webhook Events (`/events`)
There is **no event-log endpoint** and **no per-event payload access**. The only
webhook data the API surfaces is inside `GET /dashboard`: the **five most recent**
deliveries (`webhooks.recent_events`) and 24-hour activity buckets
(`webhooks.activity_24h`).

**Removed:** the search box, event-type dropdown, delivery-ID column, per-event
payload viewer, and pagination. **Kept (real):** recent deliveries table + 24h
activity chart + total count.

### Webhooks (`/webhooks`)
There are **no webhook-management endpoints** — you cannot register, rotate,
enable/disable, or delete individual webhooks through the API, and there are no
per-hook delivery counts, failure rates, or response-time metrics. The only real
concepts are the single inbound receiver (`POST /webhooks/github`) and a
**per-project `webhook_secret`** used to verify signatures.

**Reframed to:** per-project inbound configuration (delivery endpoint URL +
whether a signing secret is set). The secret **value is never rendered** — only
its configured/not-configured state.

### Repositories (`/repositories`)
The API tracks repositories, languages, and applicable scanners, but exposes
**no GitHub-native data**: no commit history, open pull requests, stars, forks,
or watchers. Those sections were removed.

### Security (`/security`)
The API records vulnerabilities and computes scores but generates **no
remediation recommendations**, prioritized guidance, or one-click fixes. That
section was removed; triage happens per-finding on `/alerts`.

### Settings (`/settings`)
The backend authenticates with **email + password only**. There is no endpoint
to edit a display name or avatar, manage an organization, invite teammates, issue
API keys, configure notifications, or connect integrations. The page shows the
real account (email, user id) and sign-out; everything else was removed.

### Audit Logs (`/audit-logs`)
There is **no audit-log endpoint**. The page is intentionally empty and points to
the closest real signals (scan/security history and webhook events).

### Forgot Password (`/forgot-password`)
Devise's `recoverable` columns exist in the schema, but **no password routes are
wired** (`devise_for` only mounts sessions and registrations). Self-service
password reset is therefore not available; the page explains this.

---

## 3. Data-model gaps within pages that ARE wired

- **Project fields:** the `projects` table has only `name`, `description`,
  `repository_url`, `status`, `github_repo`, `default_branch`, `active`,
  `user_id`, `webhook_secret`. Mock concepts like per-project language,
  environment, health, deployment strategy, and environment variables don't
  exist and were dropped.
- **Editable project fields:** `projects#update` only permits
  `name, description, repository_url, status, github_repo`. So `default_branch`
  and `active` are **read-only from the UI** (shown but not editable in the
  project Settings tab), because the API won't accept them.
- **Vulnerability statuses** are `open` / `resolved` / `ignored` only — there is
  no "acknowledged" state. The alert triage UI uses Resolve / Ignore / Reopen.

---

## 4. Backend quirks the frontend deliberately works around

- **Filtered `meta`:** both `repositories#index` and `vulnerabilities#index`
  compute their `meta` block over the **filtered** result set, not the full set.
  To keep summary cards and language/severity chips stable, the frontend fetches
  **unfiltered** once and filters client-side.
- **Hardcoded dashboard trends:** the `change_percent` values in `GET /dashboard`
  (projects `+2`, repositories `0`, deployments `-12`, webhooks `+18`, pipelines
  `+3`) are constants in the controller, not computed trends. The dashboard
  renders them as provided — treat these percentages as placeholders.
- **`scans#show` shape:** returns `scan.as_json(include: :vulnerabilities)`, i.e.
  **raw** ActiveRecord columns (e.g. `cwe_id`, not the serialized `cwe` array the
  dedicated vulnerability endpoints return). The wired pages avoid depending on
  that nested shape — they use `/scans/:id/vulnerabilities` and
  `/vulnerabilities/:id` for properly serialized data, and the scan's own count
  columns for totals.
- **Auth scoping:** `scans#index` / `#show` fall back to `User.first` when there
  is no authenticated user, but `security_summary` / `gate` / `policy_results`
  require `current_user`. The client always sends the JWT, so this is fine in
  practice; those detail panels will error (gracefully handled) if a scan is
  viewed while logged out.

---

## 5. Auth & CORS requirements

- Login/signup return the JWT in the **`Authorization` response header**
  (`Bearer <token>`). `rack-cors` must **expose** that header or the token can't
  be read. The client stores it in `localStorage` (`guardrail_token`) and sends
  it as `Authorization: Bearer <token>` on every request.
- A `401` clears local auth and broadcasts a `guardrail:unauthorized` event; the
  auth provider then redirects to `/login`.
- CORS must allow the frontend origin. The frontend is expected to run on
  **`http://localhost:3001`** (the backend's CORS config already allows
  `:3000`, `:3001`, and `:5173`).

---

## 6. Summary

Every route in the app is wired to a real endpoint. Nine areas of the original
design (deployments infra, CI pipelines, event log, webhook management, repo
GitHub data, remediation guidance, account/team/billing settings, audit logs,
password reset) have **no backend** and are clearly marked in-app. Nothing in the
shipped UI displays fabricated data.
