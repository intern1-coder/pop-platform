# POP Platform — MVP 1 Build Plan

Property Operations Platform (POP) for managing ASB (Anti-Social Behaviour) cases.

---

## 1. Current State (as inspected)

### Backend (NestJS + Prisma)
- **DB driver mismatch:** `schema.prisma` declares `provider = "postgresql"`, but local dev uses SQLite (`DATABASE_URL=file:./dev.db`, `migration_lock.toml = sqlite`). Docker uses PostgreSQL. **Do not run `prisma generate` locally** or the SQLite workflow breaks.
- JWT auth with roles: `Admin`, `PropertyManager`, `Tenant` (dummy users seeded).
- Existing modules: `auth`, `property`, `case`, `people`, `timeline`, `complaint`, `incident`.

### Frontend (React + Vite + Tailwind)
- Pages: `Login`, `Register`, `Dashboard`, `Properties`, `Cases`.
- **No Complaint list/detail pages exist yet** — `ComplaintDetail.tsx` must be created.
- API calls use relative `/api/*`; Vite proxies `/api` → `http://localhost:3000` in dev.

### Existing backend endpoints (inventory)

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| POST | `/api/auth/register` | public | creates user w/ Tenant role |
| POST | `/api/auth/login` | public | returns tokens + user |
| POST | `/api/auth/refresh` | public | |
| POST | `/api/auth/logout` | public | |
| GET | `/api/auth/me` | auth | |
| POST | `/api/properties` | Admin, PropertyManager | |
| GET | `/api/properties` | all | staff = org scope; tenant = own units |
| GET | `/api/properties/:id` | all | |
| POST | `/api/cases` | all | creates ASB case |
| GET | `/api/cases` | all | |
| GET | `/api/cases/:id` | all | |
| POST | `/api/people` | auth | creates person + role |
| GET | `/api/people` | auth | |
| GET | `/api/people/:id` | auth | |
| GET | `/api/timeline/recent` | auth | |
| GET | `/api/timeline/case/:caseId` | auth | |
| POST | `/api/complaints` | all | auto risk scoring + timeline + audit |
| GET | `/api/complaints` | all | tenant sees only own; filters: status, category, severity |
| GET | `/api/complaints/:id` | all | |
| PUT | `/api/complaints/:id` | Admin, PropertyManager | |
| PUT | `/api/complaints/:id/status` | Admin, PropertyManager | |
| POST | `/api/complaints/:complaintId/incidents` | all | |
| GET | `/api/complaints/:complaintId/incidents` | all | |
| GET | `/api/complaints/:complaintId/incidents/:incidentId` | all | |

### Existing frontend API usage
- `AuthContext`: `GET /api/auth/me`, `POST /api/auth/logout`
- `Login`: `POST /api/auth/login`
- `Register`: `POST /api/auth/register`
- `Dashboard`: `GET /api/properties`, `GET /api/cases`, `GET /api/timeline/recent`
- `Properties`: `GET /api/properties`, `POST /api/properties`
- `Cases`: `GET /api/complaints`, `GET /api/properties`, `POST /api/complaints`

---

## 2. Docker Failure Analysis (diagnosed 2026-08-10)

Both app containers were crash-looping (`docker ps` → `Restarting`).

### Backend (`pop-backend`)
```
prisma:warn Prisma failed to detect the libssl/openssl version to use...
Error: Could not parse schema engine response: SyntaxError: Unexpected token 'E', "Error load"... is not valid JSON
```
**Cause:** Alpine (`node:20-alpine`) ships OpenSSL 3.x, but the Prisma engine needs a matching `libssl`; `apk add openssl` is not enough on Alpine. The schema engine binary fails to load → `prisma db push` fails → crash loop.

**Fix:** Switch backend build/runtime to **Debian slim** (`node:20-slim`) and install `openssl` via `apt-get`. (Chosen over `openssl1.1-compat` hack on Alpine.)

### Frontend (`pop-frontend`)
```
nginx: [emerg] host not found in upstream "backend" in /etc/nginx/conf.d/default.conf:12
```
**Cause:** The built image contains a stale template referencing `http://backend`. The source `nginx.conf.template` hardcodes `https://pop-backend-urfk.onrender.com` (Render URL), so it works neither locally nor via the intended `${BACKEND_URL}` substitution (envsubst var was never referenced in the template).

**Fix:** Make `nginx.conf.template` use `${BACKEND_URL}`, default it in `docker-entrypoint.sh`, and pass `BACKEND_URL=http://backend:3000` in docker-compose.

---

## 3. Phase 0 — Infrastructure fixes (this session)

- [x] Create `PLAN.md` + `SESSION.md`
- [x] Backend Dockerfile: Debian slim + apt openssl; keep `prisma db push` then `start:prod`
- [x] Frontend: env-driven nginx proxy via `${BACKEND_URL}`
- [x] `docker-compose.yml`: pass `BACKEND_URL` to frontend
- [x] Rebuild + `docker compose up -d`
- [x] Verify endpoints via `curl http://localhost:8080/api/...` and `localhost:3000/api/...`
- [x] DB unified on PostgreSQL (local `.env` → `localhost:5433`; docker internal `postgres:5432`)
- [x] `ComplaintMonitoring` model added to `schema.prisma` + `prisma db push`
- [x] Fixed `RolesGuard` to respect class-level `@Roles` metadata
- [x] Fixed pdfkit CommonJS import + letter download path lookup

---

## 4. MVP Phases (Feature Build)

> Schema note: `ComplaintEvidence`, `ComplaintCommunication`, `ComplaintLetter`, `ComplaintWitness`, `ComplaintAction`, `ComplaintAudit` already exist in `schema.prisma`. **`ComplaintMonitoring` is MISSING and must be added** (Phase 6).

### Phase 1 — Evidence Management
**Backend** `backend/src/modules/evidence/` — [x] DONE
- `evidence.module.ts`, `evidence.service.ts`, `evidence.controller.ts`
- `upload(complaintId, file, description, userId)` → row in `ComplaintEvidence` (fileName, fileType, fileSize, r2Key, description)
- `findAll(complaintId)`, `download(complaintId, evidenceId)`, `delete(complaintId, evidenceId, userId)`
- Validation: ≤100MB; JPEG, PNG, HEIC, MP4, QuickTime, MP3, M4A, WAV, PDF, DOC, DOCX
- Routes (all under `/api/complaints/:complaintId/evidence`): POST (multipart, `@UploadedFile`), GET, GET `/:evidenceId/file`, DELETE `/:evidenceId`
- File storage: local `uploads/evidence/` (dev); metadata `r2Key` stores the stored filename
- Register `EvidenceModule` in `app.module.ts`

**Frontend** `frontend/src/pages/ComplaintDetail.tsx`
- Upload button (accepts images/PDF/docs), file list w/ download links, delete button

### Phase 2 — Communication Tracking
**Backend** `backend/src/modules/communication/` — [x] DONE
- `create(complaintId, data, userId)`, `findAll(complaintId)`, `update(complaintId, communicationId, data)`
- Fields: type (Email/Phone/Letter/SMS/Visit/Other), direction (Inbound/Outbound), date, summary, details
- Routes: POST `/api/complaints/:complaintId/communications`, GET, PUT `/:communicationId`

**Frontend:** "Add Communication" form + timeline view in `ComplaintDetail.tsx` — [x] DONE

### Phase 3 — Letter Generation
**Backend** `backend/src/modules/letter/` — [x] DONE (`pdfkit` installed)
- `generate(complaintId, letterType, userId)` → PDF via pdfkit (branded letterheads: Apollo, Redstone, Omnia, POP), stored on disk, `pdfUrl` + `content` saved
- `markSent(complaintId, letterId)`, `findAll(complaintId)`
- Routes: POST `/api/complaints/:complaintId/letters`, PUT `/:letterId/sent`, GET, GET `/:letterId/file`

**Frontend:** "Generate Letter" dropdown (Warning, Legal, Notice, Right to Rent), list w/ download + "Mark as Sent" — [x] DONE

### Phase 4 — Witness Management
**Backend** `backend/src/modules/witness/` — [x] DONE
- `create`, `findAll`, `update` → `ComplaintWitness` (name, contactDetails, statement, anonymous, digitalAcknowledgement)
- Routes: POST, GET, PUT `/api/complaints/:complaintId/witnesses[/:witnessId]`

**Frontend:** "Add Witness" form (anonymous + digital ack checkboxes), expandable statements — [x] DONE

### Phase 5 — Action Tracking
**Backend** `backend/src/modules/action/` — [x] DONE
- `create`, `findAll`, `update` → `ComplaintAction` (description, owner, dueDate, status: Pending→InProgress→Completed, completedAt)
- Routes: POST, GET, PUT `/api/complaints/:complaintId/actions[/:actionId]`

**Frontend:** "Add Action" form + status toggle — [x] DONE

### Phase 6 — Monitoring & Escalation
**Backend** — requires NEW schema model `ComplaintMonitoring`
```prisma
model ComplaintMonitoring {
  id            String   @id @default(cuid())
  complaintId   String
  complaint     Complaint @relation(fields: [complaintId], references: [id])
  status        String   // Requested, Approved, Rejected, Active, Expired
  justification String?
  requestedById String?
  requestedBy   Person?  @relation("MonitoringRequests", fields: [requestedById], references: [id])
  approvedById  String?
  approvedBy    Person?  @relation("MonitoringApprovals", fields: [approvedById], references: [id])
  expiresAt     DateTime?
  endReason     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```
- `backend/src/modules/monitoring/`: `request`, `approve`, `reject`, `findAll` — [x] DONE
  - Routes: POST `/monitoring/request`, POST `/monitoring/:id/approve`, POST `/monitoring/:id/reject`, GET `/monitoring`
- `backend/src/modules/escalation/`: `escalate(complaintId, userId)` (audit + status bump + timeline) — [x] DONE
  - Route: POST `/api/complaints/:complaintId/escalation`
- **DB migration:** `ComplaintMonitoring` model added to schema + `prisma db push` applied — [x] DONE

**Frontend:** Monitoring section w/ Request + Approve/Reject (managers), Escalate button (managers) — [x] DONE

### Phase 7 — Dashboard Stats
**Backend** `backend/src/modules/dashboard/` — [x] DONE
- `getStats(orgId)` → total properties, open cases, pending actions, incidents, active monitoring, recent activity
- Route: GET `/api/dashboard/stats`

**Frontend** `Dashboard.tsx`: enhanced stat cards + recent activity — [x] DONE

---

## 5. Frontend pages to build/modify
- [x] **NEW** `pages/Complaints.tsx` — list w/ link to detail
- [x] **NEW** `pages/ComplaintDetail.tsx` — all phase features (evidence, comms, letters, witnesses, actions, monitoring, escalate, incidents, timeline, audit)
- [x] **NEW** routes in `App.tsx`: `/complaints`, `/complaints/:id`
- [x] **NEW** nav entries in `Layout.tsx`
- [x] **MODIFY** `Dashboard.tsx` (Phase 7)
- [x] **MODIFY** `Cases.tsx` — linked to complaint detail via Complaints page

---

## 5b. Phase 8 — ASB Full Parity (reference: Omnia ASB App)

> Reference implementation: `ASB_APP-main.zip` (Cloudflare Worker + D1 + PWA). We replicate **functionality & the problems it solves only** — NOT the UI (a better UI will be built separately).

### Gaps in POP vs ASB app (all to close)
1. **ASB letter templates** — `first_warning`, `final_warning`, `notice_seeking_possession` (Housing Act 1988 §8). Ground-driven notice periods: Ground 12 → 14 days, Ground 14 → immediate. Generic ("To The Occupiers", post-only) vs named per-tenant modes. NSP must name tenants + requires a §8 ground. PDF via pdfkit.
2. **Mark letter sent** — method (post / email / hand_delivered) + Certificate of Posting (PC2) date for post. Email blocked when no tenant email on file.
3. **Risk scoring** — risk factors with weights (`vulnerable_tenant`=2, `threats_violence`=5, `repeat_offender`=2, `police_involved`=2, `hate_crime`=3, `child_safeguarding`=3); score = Σ weights; level = 0-2 low / 3-4 medium / 5-7 high / 8+ critical. Audited as `risk_assessed`.
4. **Court pack checklist + export** — incident thresholds (critical 1 / high 1 / medium 2 / low 3), first warning, final warning **sent**, NSP, evidence, police ref (required for serious clause codes `3.6.7-3.6.10` + risk factors), witness, notice served date → `courtReady`. `GET /api/complaints/:id/export`.
5. **SLA visit windows + escalation cron** — critical 0 / high 3 / medium 5 / low 7 **working days**; if nothing logged (no incident/evidence) by window close → PM+BM reminder; Critical → Ops next calendar day, High → next working day, Medium/Low dashboard-only. Every step audited. Daily `@Cron`.
6. **Monitoring hardening** — request needs justification **and** a warning letter actually **sent**; approve → `expiresAt` = +30 days; reject records endReason; states `Requested/Approved/Rejected/Expired/Broken`. New incident **breaks** active monitoring. Cron auto-expires at 30 days.
7. **External agencies** — `ComplaintExternal` (bodyType: Police/Council/HA/Social Services/Other, CAD no., CRN, officer, force, date reported, status, notes).
8. **Property-level cases & multiple tenants** — `ComplaintTenant[]` (isPrimary), `propertyLevel` flag; letters generated generic or per-tenant.
9. **Notice fields** — `noticeGround`, `noticeServedDate`, `noticeExpiresDate`, `rentArrearsAmount`, `closedReason`, `outcome`, `branch`, `assignedPmEmail`, landlord name/address (resolved via `HousingCompany` alias table).
10. **Critical-case alert** — on creating a Critical case: audit entry + best-effort email to BM/Ops (MailService no-ops if no transport configured).

### Backend layout
- `src/modules/asb/` — risk weights, court checklist, letter templates (pure libs).
- Letter service reworked for ASB modes + mark-sent variants.
- New modules: `external`. New model relations on complaint.
- `SlaService` (`@nestjs/schedule`, `@Cron('0 2 * * *')`).
- Incident service breaks monitoring on create.

### Frontend (functional integration only — UI will be redesigned separately)
- Complaint detail: risk-factor editor, court pack checklist + export button, external refs, ASB letter types + generic/named + mark-sent with method & PC2, notice fields, SLA/visit status.
- New complaint: risk factors, multiple tenants, property-level toggle.

---

## 6. Database Migration Strategy
- **DECISION (2026-08-11):** unify on **PostgreSQL**. Local `.env` points at docker Postgres via host port **5433** (native Windows Postgres shadows 5432). Inside docker the backend uses `postgres:5432`. Schema changes applied with `prisma db push` (no migration-history sync needed for MVP).
- **Caution:** `docker-compose.yml` interpolates `${DATABASE_URL}` — ensure the shell env is cleared (`Remove-Item Env:DATABASE_URL`) or compose will inject a stray value into the container.

---

## 7. Verification Checklist (after each phase)
- [x] Backend compiles: `npm run build`
- [x] Endpoint smoke test via curl / frontend
- [x] Frontend builds: `npm run build`
- [x] Roles respected (Admin/PropertyManager vs Tenant) — verified: tenant gets 403 on staff-only routes
- [x] Audit log + timeline entry created for mutating actions
