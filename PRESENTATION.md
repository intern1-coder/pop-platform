# POP Platform — MVP Presentation Script

How to explain this MVP to an audience (copy-paste presentable).

---

## Step 1 — The opening line (say this first)

> "I'm going to show you POP — Property Operations Platform. It's an online case-management system for housing teams handling anti-social behaviour (ASB). In one sentence: **it takes a tenant complaint from report all the way to a court-ready eviction pack, with proof and an audit trail at every step.**"

---

## Step 2 — The problem (2 sentences, don't drag)

> "Right now, housing teams run ASB on spreadsheets, emails and memory. Cases get scattered, warnings get sent but can't be proven, deadlines get missed, and when a case reaches court they have to rebuild the whole history from scratch. POP fixes exactly that."

*(Optional one-liner if they ask "why does this matter"): "For eviction on ASB grounds, you legally MUST show a warning was served — and ideally a proper Section 8 notice. That proof is what this system records automatically."*

---

## Step 3 — The demo (follow the case story — this is the meat)

Walk through live following one case. Start at the login screen.

> "Let me show you with a real case."

1. **Login as Property Manager** → `manager@pop.test` / `Manager123!`
   - *Say:* "Every person has a role. I'm logging in as a Property Manager — the person who actually works the cases."
2. **Dashboard**
   - *Say:* "This is the at-a-glance view — open cases, incidents, things under monitoring, pending actions. Management can see if the team is slipping in 2 seconds."
3. **Cases list**
   - *Say:* "Every complaint is here with a colored risk chip — red means Critical, so work it first."
4. **Open one case** (pick the Critical or High one)
   - **Header:** "References, status, risk score, monitoring badge."
   - **ASB Details:** "Risk factors are weighted — threats/violence scores high, so this case climbs to Critical automatically."
   - **Incidents + Evidence:** "Each reported event and each photo/PDF is logged and time-stamped."
   - **Communications:** "Every call and email is recorded — we can prove we tried to help."
   - **Letters:** *This is the money moment.* "We generate a real First Warning PDF — either to the whole building or to named tenants — and mark it **sent**. If it's posted, we record a **Certificate of Posting date**. This is the legal proof that a warning was served."
   - **Monitoring:** "A manager can put a case under monitoring — but only after a warning letter is actually sent, and approval sets a 30-day expiry. If a new incident happens, monitoring automatically breaks."
   - **Visit SLA:** "Each case has a deadline by risk — High gets 3 working days. If it's not touched, the nightly job reminds the manager and can escalate to Ops."
   - **Court Pack:** "This checklist shows if the case is **Court Ready**. When it is, we export the full case pack — everything we just saw — to hand to legal."
   - **Timeline / Audit:** "Every single action is here with who and when. Total transparency."

---

## Step 4 — Roles (do this *second*, logged out or freshly logged in)

Switch login to show the difference is real, not cosmetic.

> "Now let me show the other two roles."

- **Log in as Tenant** → `tenant@pop.test` / `Tenant123!`
  - *Say:* notice — no "+ Report ASB", page is titled **"My ASB Cases"**, and they only see their **own 3 cases**. Open one → they can **download** their letters and evidence, but no edit, no letters, no monitoring, no court pack.
  - *Say:* "The system hides what you can't do — and even if a tenant tries staff features directly, the server blocks it with a 403."
- **(Optional) Log in as Admin** → `admin@pop.test` / `Admin123!`
  - *Say:* "Admin sees everything — all 5 cases, monitoring approvals, and the landlord-company list that makes letter footers legally correct."

---

## Step 5 — The automation (only if time allows / asked)

> "There's also a nightly job: it checks every case against its visit deadline, expires monitoring that's over 30 days, and escalates critical cases that nobody's touched. So even without a person remembering, the process keeps moving."

---

## Step 6 — Closing line

> "So what we've built is the end-to-end engine: **report → investigate → warn with proof → monitor with rules → escalate automatically → and export a court-ready pack.** It's live online, all demo accounts work, and this is the foundation we'll grow the full platform on — property, people, finance, compliance, and AI later."

---

## Cheat-sheet (if you need it in 10 lines)

1. It's a **case engine for ASB in housing**.
2. Problem: scattered cases, unprovable warnings, missed deadlines, no court pack.
3. **Risk-scored** cases (weighted factors).
4. **Generated letters** — First/Final Warning + Section 8 NSP, **marked sent with Proof of Posting**.
5. **Monitoring** with justification, approval, 30-day expiry, auto-break on new incident.
6. **Visit SLA** + nightly **auto-escalation** cron.
7. **Court Pack checklist + export** — the final deliverable.
8. **Full audit + timeline** behind everything.
9. **3+1 roles**: Admin/Manager full control, Tenant read-only on their own cases (verified live).
10. Live at https://pop-frontend-be1h.onrender.com — 4 demo logins, 5 pre-seeded cases.

---

## Demo accounts (for quick reference)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@pop.test` | `Admin123!` |
| Property Manager | `manager@pop.test` | `Manager123!` |
| Tenant (A) | `tenant@pop.test` | `Tenant123!` |
| Tenant (B) | `sarah@pop.test` | `Sarah123!` |

> Note: the live Render free-tier backend sleeps after ~15 min of inactivity — the first load after idle takes ~60 s to wake.