# POP Platform

**POP Platform** (Property Operations Platform) — an end-to-end Anti-Social Behaviour (ASB) & complaints management system for housing teams. Built as **MVP1** with full parity to the reference Omnia ASB app's workflow, deployed live on Render.

## What it does

POP lets housing staff (Admin / Property Manager) log and work ASB complaints end-to-end, and lets tenants report incidents and track their own cases. Every stage of the casework — from first report through formal warning letters, risk assessment, Section 8 notices, court-pack readiness, monitoring ("holding the complaint") and SLA-driven escalation — is captured with a full audit trail and timeline.

### Live (public) URLs
| Service | URL | Notes |
|---|---|---|
| Frontend | https://pop-frontend-be1h.onrender.com | nginx serves the React SPA and proxies `/api` → backend |
| Backend API | https://pop-backend-urfk.onrender.com | NestJS + PostgreSQL |
| Local (Docker) | http://localhost:8080 | full local stack via `docker compose up --build` |

> Note: the Render free-tier backend sleeps after ~15 min of inactivity, so the first request after idle takes ~60 s to wake.

---

## MVP1 — first release (core complaint engine)

Seven self-contained modules, each a NestJS module with controller + service, registered in `AppModule`:

1. **Evidence** — upload photos/PDFs/documents (≤100 MB, whitelisted types), list, download, delete, with a stored filename (`r2Key`) and GPS coordinates.
2. **Communications** — log every tenant/staff contact (Email, Phone, Letter, SMS, Visit, …) with direction, date, summary, details.
3. **Letters** — generate formal letter PDFs via `pdfkit` (branded letterheads: Apollo, Redstone, Omnia, POP), list, download, and mark as sent.
4. **Witnesses** — record witness statements, including anonymous witnesses with a digital-acknowledgement flag.
5. **Actions** — assign follow-up tasks with owners, due dates, and a Pending → In Progress → Completed lifecycle.
6. **Monitoring & Escalation** — request/approve/reject "Monitoring" (parking a compliant case) and escalate a case to the senior team, each recorded in the audit trail.
7. **Dashboard** — `GET /api/dashboard/stats` returns total properties, open cases, incidents, active monitoring, pending actions, total complaints + the 10 most recent timeline events.

**Auth model** — JWT issued on login; `RolesGuard` enforces class-level `@Roles` (`Admin`, `PropertyManager`, `Tenant`). Tenants are scoped to their own complaints everywhere and are denied staff-only routes with `403`.

**Data model** — Prisma schema on PostgreSQL (unified across local Docker and Render). Complaints roll up the sub-tables above plus incidents, audit log, and timeline events.

---

## ASB parity features (added on top of MVP1)

These close the gap with the reference ASB app — **functions only, not its UI** (a dedicated UI refresh is a separate step):

- **ASB letter templates** — `first_warning`, `final_warning`, `notice_seeking_possession` (Housing Act 1988 §8). A generic "To The Occupiers" mode is available for whole-property cases, while an NSP must name specific tenants and require a §8 ground (Ground 12 = 14 days, Ground 14 = immediate).
- **Mark letter sent** — choose the method (Post / Email / Hand Delivered); email is blocked when no tenant email is on record; a Certificate of Posting (PC2) date is captured for posted letters.
- **Risk scoring** — weighted risk factors (vulnerable tenant, threats/violence, repeat offender, police involved, hate crime, child safeguarding) sum to a score → Low / Medium / High / Critical. Each assessment is audited.
- **Court pack checklist + export** — `GET /complaints/:id/export` returns the full case plus a readiness checklist (incidents, warnings, NSP, evidence, police reference, witness, notice served) with a `courtReady` boolean.
- **External agencies** — log police CAD / crime-reference numbers, officer and force, date reported, and notes against a case.
- **Hardened monitoring** — a monitoring request now requires a justification **and** that a warning letter has actually been sent; approval carries a 30-day expiry; a new incident breaks active monitoring; the daily cron auto-expires overdue monitoring.
- **SLA escalation cron** — per-severity visit windows (Critical 0 / High 3 / Medium 5 / Low 7 working days); if nothing has been logged by the window close a reminder goes to the PM + Branch Manager; Critical/High cases with no follow-up escalate to Ops. Every step is an audit entry (`@Cron` daily 02:00 UTC; triggerable on demand via `POST /api/sla/run`).
- **Notice & outcome fields** — §8 ground, notice served/expires dates, rent arrears, branch, assigned-PM email, landlord resolution via a `HousingCompany` alias table, closed reason, outcome, and the critical-case alert on creation.
- **Property-level cases & multiple tenants** — a single case can target a whole property and name every affected tenant (`ComplaintTenant`); letters can be addressed to the whole property or per selected tenant.

---

## Architecture

```
POP-Platform/
├── backend/                 # NestJS + Prisma + PostgreSQL + pdfkit
│   ├── src/
│   │   ├── auth/            # JWT + role guards (@Roles)
│   │   ├── modules/{complaint,incident,evidence,communication,letter,witness,action,monitoring,escalation,dashboard,external,sla,meta,notify,timeline,property,case,people}
│   │   └── asb/             # pure libs: risk, dates, court-checklist, letter-templates
│   └── prisma/schema.prisma
├── frontend/                # React + Vite + Tailwind
│   └── src/pages/  Complaints, ComplaintDetail, Dashboard, Cases, Login, …
├── docker-compose.yml       # local stack: postgres:5433, backend:3000, frontend nginx:8080
└── render.yaml              # Render auto-deploy (backend + frontend services)
```

## Dummy logins (seeded on both local Docker and Render)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@pop.test` | `Admin123!` |
| Property Manager | `manager@pop.test` | `Manager123!` |
| Tenant (A) | `tenant@pop.test` | `Tenant123!` *(owns 3 of 5 cases)* |
| Tenant (B) | `sarah@pop.test` | `Sarah123!` *(owns 2 of 5 cases)* |

Tenants are server-scoped to their own complaints — logging in as Tenant A shows only 3 cases, Tenant B shows only 2 (Admin sees all 5).

## Run locally

```bash
# one command for the whole stack (api on :3000, pwa on :8080)
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue   # clear stray env so compose uses defaults
docker compose up --build -d
# seed the local DB with demo users + 5 ASB complaints
$env:DATABASE_URL = "postgresql://pop_user:pop_password@localhost:5433/pop_db"
cd backend; node prisma/seed.js
# open http://localhost:8080  -> log in with the dummy accounts above
```

The Render deployment auto-deploys on every push to `main` (GitHub), and the backend applies the Prisma schema on startup (`prisma db push`).
