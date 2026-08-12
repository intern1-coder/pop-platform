# POP Platform — Session Log

## Session 1 — 2026-08-10
- Inspected full codebase.
- Created `prisma/seed.js` + `db:seed` script; seeded dummy users (local SQLite at the time).
- Diagnosed Docker crash-loops (backend = Prisma/OpenSSL on Alpine; frontend = nginx upstream "backend" not found).
- Created `PLAN.md` + `SESSION.md`.

## Session 2 — 2026-08-11 (MVP build)
### Decisions
- **DB unified on PostgreSQL** (schema provider stays `postgresql`). Local `.env` → `localhost:5433` (docker Postgres; native Windows Postgres owns 5432). Docker internal → `postgres:5432`.

### Backend — all 7 phases implemented
- Added `ComplaintMonitoring` model to `schema.prisma` (+ Person/Complaint relations) → `prisma db push`.
- New modules in `src/modules/`:
  - `evidence` — upload (multipart, ≤100MB, whitelisted types), list, download, delete. Files in `uploads/evidence/`.
  - `communication` — create/list/update.
  - `letter` — PDF generation via `pdfkit` (brands: Apollo/Redstone/Omnia/POP), mark-sent, list, file download. Files in `uploads/letters/`.
  - `witness` — create/list/update (anonymous + digital acknowledgement).
  - `action` — create/list/update with Pending→InProgress→Completed cycle.
  - `monitoring` — request/approve/reject/list (updates complaint.monitoringRequired/Status).
  - `escalation` — escalate (status → Escalated, risk → Critical, audit + timeline).
  - `dashboard` — `GET /api/dashboard/stats` (counts + recent activity).
- Registered all modules in `app.module.ts`.
- **Bug fixes:** `RolesGuard` now reads class-level `@Roles` (was handler-only → tenant could hit staff routes); pdfkit CommonJS import (`require`); letter download used stored `pdfUrl` not DB id.

### Frontend — all pages
- **NEW** `Complaints.tsx` (list + link to detail).
- **NEW** `ComplaintDetail.tsx` — evidence upload/list/delete, communications, letters (generate/download/mark-sent), witnesses (expandable), actions (status cycle), monitoring (request/approve/reject), escalate, incidents, timeline, audit. Staff vs tenant views.
- **NEW** routes `/complaints`, `/complaints/:id` in `App.tsx`; nav updated in `Layout.tsx`.
- **MODIFIED** `Dashboard.tsx` — 6 stat cards + recent activity from `/api/dashboard/stats`.

### Docker
- Rebuilt images (`node:20-slim` backend). All containers healthy: postgres, backend, frontend (nginx on :8080 proxying to backend).
- **Gotcha:** shell `$env:DATABASE_URL` leaked into compose interpolation → fixed by clearing env var before `docker compose up`.

### Verified end-to-end (via nginx :8080)
- Login (admin/manager/tenant), complaint detail returns all sections populated (evidence=1, comms=1, letters=2, witnesses=1, actions=1, monitoring=2, timeline=17, audit=2).
- Dashboard stats OK. Evidence upload/download/delete OK. Letter PDF valid (`%PDF`). RBAC OK (tenant 403 on letters).

### Open items / next
- `uploads/` dirs are inside the backend container (ephemeral) — files lost on container recreate. Consider a volume mount for persistence.
- Render deploy: update `render.yaml` env if needed; migrations via `prisma db push` (already the Dockerfile CMD).
- Optional: switch `prisma migrate` (real migration history) before v1.

## Session 3 — 2026-08-11 (ASB Full Parity)
### Scope
- Replicate the Omnia ASB app's **functionality only** (reference `ASB_APP-main.zip`); UI is intentionally not copied — a better UI will be built separately.
- Deployed POP stack already live on Render (frontend `pop-frontend-be1h`, backend `pop-backend-urfk`, nginx proxy fixed with `proxy_set_header Host $proxy_host`), demo data seeded (5 complaints, 2 properties, monitoring active).

### Deliverables
- Schema: `riskFactors`, `noticeGround/ServedDate/ExpiresDate`, `rentArrearsAmount`, `closedReason`, `outcome`, `branch`, `assignedPmEmail`, `landlordName/Address`, `propertyLevel` on `Complaint`; new `ComplaintTenant`, `ComplaintExternal`, `HousingCompany`; `ComplaintLetter.isGeneric`/`tenantName`.
- ASB letter templates (first_warning / final_warning / notice_seeking_possession) with Ground 12/14 notice periods, generic vs named modes, NSP guards (named-only + ground required), mark-sent with method + Certificate of Posting, email blocked w/o tenant email.
- Risk scoring (weighted factors → score → level), court pack checklist + `GET /complaints/:id/export`, external refs module.
- Monitoring hardening (warning-letter-sent precondition, +30d expiry, reject endReason, Expired/Broken states, break-on-new-incident).
- SLA cron (visit windows crit0/high3/med5/low7 working days → PM/BM reminder → Ops escalation; monitoring auto-expiry; audited steps) via `@nestjs/schedule`.
- Complaint create/update: multi-tenant, property-level, risk factors, notice fields, branch, landlord resolution, closedReason/outcome, per-field audit, critical-case alert.
- Frontend functional integration (risk factors, court pack + export, external refs, ASB letters + mark sent, notice fields, SLA status) — not a UI redesign.
- Local build + verify, seed, deploy to Render, online smoke test.

## Session 4 — 2026-08-12 (Role scoping + ASB parity shipped)
### Decision
- ASB full parity is **functionality-only** (no UI theme copy): keep the existing Tailwind white theme; a later UI refresh is a separate task.
- Backend auth/RBAC already role-scoped the API; the **"all roles see the same"** issue was a **frontend display** problem (shared list).

### What I built
- `frontend/src/context/AuthContext.tsx` — added exports: `UserRole` type, `ROLES`, `isStaff(user)`, `isTenant(user)`, and a `useRoles()` hook returning `{user, roles, isStaff, isTenant, isAdmin, isPropertyManager, hasRole}`.
- `frontend/src/pages/Cases.tsx` — imports `useRoles()` from `AuthContext` (fixes the old `import { AuthContext }` unused-context lint). Gates the "+ Report ASB" button behind `isStaff`; renders the header title as "ASB Cases" (staff) vs "My ASB Cases" (tenant); adds a "View case" link column. Tenant's `GET /api/complaints` is already server-scoped to `tenantEmail === user.email` (ComplaintService.findAll), so the list itself is tenant-scoped; the frontend now reflects that visibly.

### What I shipped to Render (live)
- commit `4288d09` (role-scoping fix + `ARCHITECTURE.md`) pushed to `main` → frontend autodeployed.
- commit `348ff31` (seed change) pushed to `main` → backend rebuilding + re-seeding.
- Added a 4th demo user to `backend/prisma/seed.js`:
  - `sarah@pop.test` / `Sarah123!` (role `Tenant`), so complaint ownership is split: Admin → 5 cases, `tenant@pop.test` → 3 (CMP-2025-0001/0002/0005), `sarah@pop.test` → 2 (CMP-2025-0003/0004). This makes the role-scoping **visibly different** online instead of all-complaints-owned-by-one-tenant.
- Build verified locally: `npx vite build` (frontend ✓) and `npx tsc --noEmit` (backend ✓).

### Verification done so far
- Frontend live, returns 200.
- `POST /api/auth/login` returns **201** for `admin@pop.test` (role `Admin`) and `manager@pop.test` (role `PropertyManager`).
- Backend is **sleeping/rebuilding** between requests (Render free tier) → first request after idle takes ~60 s. The role-visibility diff will become provably visible once the backend image with the new seed finishes deploying; I'm polling until `sarah@pop.test` logs in, then I re-run the Admin/Tenant-A/Tenant-B `/api/complaints` comparison in one warm pass and capture the counts.

### Live (public) URLs
- Frontend: https://pop-frontend-be1h.onrender.com
- Backend API: https://pop-backend-urfk.onrender.com

### Updated dummy logins (4 now)
| Role | Email | Password |
|---|---|---|
| Admin | admin@pop.test | Admin123! |
| Property Manager | manager@pop.test | Manager123! |
| Tenant (A) | tenant@pop.test | Tenant123! |
| Tenant (B) | sarah@pop.test | Sarah123! |

### Next
- Regenerate docs: `PLAN.md` (sync ASB-parity section, mark Phase 8 done), `README.md` (4 logins).

## Verification result
Cross-role complaint visibility + RBAC verified **locally against docker** (deterministic; Render free-tier backend sleeps/rebuilds between requests so the online check kept timing out, but the deployed code is identical):
- Admin → 5 complaints (org scope)
- Tenant A (tenant@pop.test) → 3 (CMP-2025-0001, 0002, 0005)
- Tenant B (sarah@pop.test) → 2 (CMP-2025-0003, 0004)
- RBAC: Tenant POST `/api/complaints/:id/monitoring/request` → **403 Forbidden** (staff-only correctly blocked)

### Commits pushed to `main` (Render auto-deploys from this branch)
- `4288d09` — `feat(frontend): role-scope Cases list + add useRoles helper`
- `348ff31` — `seed: add Tenant (B) sarah@pop.test / Sarah123! and split demo ownership`
- `8fe0aed` — `fix(seed): delete ComplaintTenant/External before recreating (FK constraint)`

### Open items
- Render backend free tier sleeps ~60s after idle; cold-start adds latency to first request. No action needed (just wait after deploy).
- `uploads/` dirs are inside the backend container (ephemeral). Fine for MVP demos on Render; consider a volume mount only if persistence across deploys matters.

