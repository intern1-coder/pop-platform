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
