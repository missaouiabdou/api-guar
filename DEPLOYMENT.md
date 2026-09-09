# 🚀 GuardRail Production Deployment Architecture & Runbook

This document defines the production topology, infrastructure requirements, and deployment procedures for the **GuardRail DevSecOps Platform**.

---

## 🏗️ Architecture Overview

GuardRail separates high-performance HTTP API handling, interactive web console hosting, and resource-intensive security scanning workers into distinct tiers:

```
                  ┌───────────────────────────────┐
                  │  Vercel Edge Network (SPA)    │
                  │  React 18 + Tailwind Console  │
                  └──────────────┬────────────────┘
                                 │ HTTPS / JWT
                                 ▼
                  ┌───────────────────────────────┐
                  │   Rails 8 Production API      │
                  │   Puma + Thruster (HTTP/2)    │
                  └──────────────┬────────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
┌──────────────────┐                           ┌──────────────────┐
│  PostgreSQL 16   │                           │ Solid Queue      │
│  Primary DB      │                           │ Background Worker│
└──────────────────┘                           └────────┬─────────┘
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    │ Executed Scanners on Cloned Repo:     │
                                    │ • Brakeman (Ruby SAST)                │
                                    │ • Semgrep (Multi-language SAST)       │
                                    │ • Bundler Audit (Ruby SCA)            │
                                    │ • npm Audit (Node SCA)                │
                                    │ • Gitleaks (Secret Detection)         │
                                    └───────────────────────────────────────┘
```

> [!IMPORTANT]
> **Why Scanners Never Run on Vercel Serverless Functions:**
> Security engines (Semgrep, Brakeman, Gitleaks, npm audit) require Git binaries, persistent disk access for repository cloning, and extensive CPU/memory limits during deep AST evaluation. They strictly run within containerized Solid Queue worker processes on dedicated host nodes.

---

## 1. Frontend Deployment (Vercel)

1. **Framework:** Vite / React Single Page Application (SPA).
2. **Build Settings:**
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
   * **Install Command:** `npm install`
3. **Environment Variables on Vercel:**
   * `VITE_API_URL`: Full HTTPS URL of the Rails API backend (e.g. `https://api.guardrail.security`).
4. **SPA Rewrites:**
   Handled automatically by [`frontend/vercel.json`](file:///c:/Users/missaoui.DESKTOP-4LNHLUC/RubymineProjects/guardrail-api/frontend/vercel.json) to support client-side routing.

---

## 2. Backend Deployment (Rails 8 API + Docker / Kamal)

### Dockerfile & Worker Container
The production container runs with:
* Ruby 3.4+
* Git, libvips, libjemalloc2, postgresql-client
* Scanner CLI tools (`brakeman`, `bundle-audit`, `npm`, `gitleaks`)

### Required Production Environment Variables
| Variable | Description | Example |
|---|---|---|
| `RAILS_ENV` | Must be `production` | `production` |
| `DATABASE_URL` | PostgreSQL connection URI | `postgres://user:pass@db-host:5432/guardrail_production` |
| `DEVISE_JWT_SECRET_KEY` | 64+ character random secret for JWT signing | `openssl rand -hex 64` |
| `SECRET_KEY_BASE` | Rails application secret key base | `openssl rand -hex 64` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend domains | `https://console.guardrail.security,https://guardrail.vercel.app` |
| `APP_HOST_URL` | Base URL of frontend for GitHub status check links | `https://console.guardrail.security` |
| `GITHUB_TOKEN` | GitHub PAT or GitHub App token (scope: `repo:status`) | `ghp_...` |
| `RAILS_MAX_THREADS` | Puma thread pool size | `5` |
| `SOLID_QUEUE_IN_PUMA` | Run Solid Queue inside Puma or separate worker | `true` |

---

## 3. Production Healthcheck & Gate

GuardRail provides a dedicated unauthenticated healthcheck endpoint for load balancers and container orchestrators:

* **Endpoint:** `GET /api/v1/health`
* **Expected Response:** `200 OK` $\rightarrow$ `{"status": "ok"}`
* **CI/CD Security Gate:** `GET /api/v1/scans/:id/gate` $\rightarrow$ Evaluates policies and returns `"PASS"`, `"WARNING"`, or `"FAIL"`.
