# AI CFO ENTERPRISE — Migration & Launch Plan

**Date:** 2026-09-14
**Current commit:** `0d24438` on `origin/main`
**Working tree:** clean

---

## Context

- **Stack today:** Node.js + Express + SQLite (`better-sqlite3`) + React (Vite)
- **Payment provider:** Migrating from Flutterwave → **Paystack**
- **Target:** Production-ready for 10k+ users
- **Current state:** Retail/Wholesale industry fully working. Other 7 industries are frontend stubs with no backend.

---

## Agreed plan — Phase order

### Phase 1 — SQLite → PostgreSQL migration
**Why first:** Unlocks Render staging (Render free tier cannot run SQLite persistently), unlocks production scale (SQLite locks the whole DB on writes), and removes the "we'll migrate later" risk.

**Scope:**
- Add `pg` + connection pool
- Rewrite `connection.js` for Postgres
- Translate all 33 migration files to Postgres dialect
- Rewrite `BaseRepository` + every repository method (placeholders, dialect)
- Fix transaction handling (`BEGIN IMMEDIATE` → `BEGIN`, etc.)
- Update `scripts/migrate.js` for Postgres
- Test locally against a copy of `ai-cfo.db` data loaded into Postgres
- Verify all pages load, all writes work, reports match

**Time:** 1–2 days focused work
**Risk:** medium (touches every repository), but additive — SQLite data is preserved until proven

**Exit criteria:**
- App runs on Postgres locally with real data
- All pages, writes, reports behave identically
- Zero SQLite references in the runtime path

---

### Phase 2 — Deploy staging on Render
**Why:** Shareable URL for testers, safe place to build and test everything that follows.

**Scope:**
- Provision Render Postgres (free tier)
- Create `render.yaml` blueprint
- Deploy backend (Node web service) + frontend (static site)
- Set env vars: `DATABASE_URL`, `JWT_SECRET`, `PAYSTACK_*` (test mode), `NODE_ENV=staging`
- Verify end-to-end: register → log in → record purchase → see inventory

**Time:** ~1 day
**Risk:** low

**Exit criteria:**
- Public staging URL works
- Testers can sign up and use the app
- Paystack test mode callbacks reach the staging backend

---

### Phase 3 — Restrict signup to Retail/Wholesale only
**Why:** Prevent a broken experience for the other 7 industries (no backend, no routes).

**Scope:**
- Frontend: on registration, only show "Retail / Wholesale" as selectable (others marked "Coming soon")
- Backend: validate that `industry === 'RETAIL'` on register
- Existing businesses in other industries: no change (they're test data)

**Time:** 2–4 hours
**Risk:** very low

**Exit criteria:**
- No user can register as a non-Retail industry
- If they try via API, clean rejection

---

### Phase 4 — Paystack webhook hardening
**Why:** Money correctness. Webhook idempotency, retry, audit log. P0 for taking real payments.

**Scope:**
- Audit existing Flutterwave code and remove/retire it
- Paystack integration:
  - Webhook endpoint with signature verification (`x-paystack-signature` HMAC-SHA512)
  - Idempotency table (`paystack_webhook_events` with event id as unique key)
  - Retry + dead-letter handling for failed processing
  - Audit log for all events (received / processed / failed)
  - Wire `charge.success` → subscription activation / payment state update
- Build and test on staging first (Paystack test mode + public URL)
- Rehearse failure scenarios: duplicate webhooks, out-of-order events, dropped callbacks

**Time:** 1–2 days
**Risk:** high (money path) — hence staging

**Exit criteria:**
- Same webhook delivered twice → single state change
- Failed webhook → retried
- Every event visible in the audit table
- A real Paystack test-mode charge activates the correct subscription

---

### Phase 5 — Open to first testers
**Why:** Real users surface issues you can't find alone.

**Scope:**
- Invite 3–10 trusted testers to staging
- Watch for: UX friction, missing features, backend errors, payment flow issues
- Fix what breaks; iterate
- No new features until this is stable

**Time:** 1–2 weeks of observation
**Risk:** low

**Exit criteria:**
- Testers can complete full flows without help
- No error spikes in Sentry
- Feedback is about polish, not fundamentals

---

### Phase 6 — Load test rate limiters
**Why:** Confirm the app holds up under real traffic before opening to 10k.

**Scope:**
- Load test the API endpoints (k6, Artillery, or similar)
- Verify rate limiters behave (auth, writes, reads)
- Identify slow queries
- Add indexes if needed
- Verify DB connection pool handles concurrency

**Time:** 1 day
**Risk:** medium (may surface issues that need fixing before launch)

**Exit criteria:**
- App handles target concurrency (e.g. 100 concurrent users) with acceptable response times
- No crashes, no locked DB, no memory leaks

---

### Phase 7 — Email verification + domain
**Why:** Real onboarding signal at scale. Buy domain before onboarding public users.

**Scope:**
- Buy domain (e.g. `aicfo.app`)
- Wire Resend (or similar) for transactional email
- Email verification on registration
- Password reset flow
- Verify domain DNS + email deliverability (SPF, DKIM, DMARC)

**Time:** 4–5 hours
**Risk:** medium (email deliverability can be finicky)

**Exit criteria:**
- User registers → receives verification email
- Email arrives in inbox (not spam)
- Password reset works end-to-end

---

### Phase 8 — Post-launch: other industries (demand-driven)
**Why:** Don't build speculatively. Add industries as real customers from those verticals appear.

**Scope:**
- Per industry: backend domain + use cases + routes + frontend wiring (Manufacturing, Construction, Healthcare, Consultancy, Real Estate, Education, Logistics)
- Multi-day per industry
- Only start when demand justifies

**Time:** 2–4 days per industry
**Risk:** high (new backend surface each time)

**Exit criteria:** one industry fully working end-to-end before starting the next.

---

## Deferred (post-launch polish)

These are **not** required for launch and are explicitly on hold:

- **Route SSOT (`routes.js`)** — engineering hygiene, not production risk
- **Retail deep build** — one-click quick actions (currently two-click). UX polish.
- **Per-business document numbering** — invoice/PO numbers starting at 1 per business
- **`purchases.items` double-encoding cleanup** — some rows store JSON-in-JSON
- **Pre-existing startup warnings**:
  - `CashCalculator: paymentRepository is missing`
  - `[RiskOrchestrator] assess failed — getRiskPackage undefined`
  - `debtorRepository.findAllOverdue is not a function`

---

## Ground rules we're holding

1. **One phase at a time.** No starting N+1 until N is verified.
2. **Test after each batch.** No skipping verification.
3. **Commit at the end of every phase.** Clean tree = safe checkpoint.
4. **No silent failures.** If a write fails, throw — don't swallow.
5. **No hardcoded values that should be config.** Use env vars.
6. **Every phase is reversible in isolation.** One concern per commit.
7. **Staging before production** for anything touching money or scale.

---

## Status snapshot

| Phase | Status |
|---|---|
| 1 — SQLite → PostgreSQL | ▶ **starting now** |
| 2 — Render staging | pending |
| 3 — Restrict signup to Retail | pending |
| 4 — Paystack webhook hardening | pending |
| 5 — Open to first testers | pending |
| 6 — Load test rate limiters | pending |
| 7 — Email verification + domain | pending |
| 8 — Other industries (post-launch) | deferred |

---

**End of plan.**

Save this as `MIGRATION_AND_LAUNCH_PLAN.md` in the project root.

When you're ready, say **"start Phase 1"** and I'll begin the SQLite-specific audit — scanning every file for dialect issues and producing the exact list of changes before touching anything.