Confirmed: **no `routes.js` anywhere.** Empty output = clean slate.

Here's the new phase summary, with `routes.js` as its own standalone refactor phase. This is the doc we hold to strictly.

---

# 📋 AI CFO ENTERPRISE — Phase Plan (locked)

**Date locked:** 2026-09-13
**Current commit:** `7736323`
**Working tree:** clean

---

## 🔹 PHASE 1 — Fix 4 broken Retail quick actions
**Scope:** `frontend/src/config/industryConfig.js` — **4 lines only**, inside `RETAIL.quickActions`.

| Quick action | From (broken) | To (exists) |
|---|---|---|
| Record Sale | `/sales/record` | `/sales` |
| Add Stock | `/inventory/add` | `/inventory` |
| Record Payment | `/debtors/pay` | `/debtors` |
| View Reports | `/reports/daily` | `/reports` |

**Touches:** 1 file, 4 lines.
**Does NOT touch:** sidebars, stats, features, other 7 industries, `App.jsx`.
**Time:** 5 min.
**Risk:** minimal.
**Exit test:** click all 4 quick actions on dashboard → land on correct pages, no fallback to Landing.
**Commit:** `fix(retail): point quickActions at existing routes`

---

## 🔹 PHASE 2 — Back buttons on 16 pages
**Scope:** 16 page files get `<PageHeader title subtitle />` at top of return. Remove duplicate `<h1>`.

Files: Sales, Income, Expenses, Purchases, Inventory, Debtors, Creditors, Customers, Suppliers, Reports, Analytics, Forecast, Risk, Decisions, Advisor, Payments.

**Touches:** 16 files, ~2 lines each.
**Does NOT touch:** any logic, hooks, styles beyond header insertion.
**Time:** 30–45 min (in batches of 3–4).
**Risk:** low.
**Exit test:** every page shows consistent header, back button works, no duplicate titles.
**Commit:** `feat(ui): add PageHeader back buttons to 16 pages`

---

## 🔹 PHASE 3 — Route SSOT refactor (`routes.js`)
**Scope:** Introduce `frontend/src/config/routes.js` as the single source of truth for every route string in the app.

**Why it's standalone:**
- It's a refactor, not a bug fix. Mixing it with feature work breaks rollback and review.
- Touches many files → needs its own commit, its own test pass.
- Do it **once**, cleanly, across every file that hardcodes a route string.

**Touches (expected):**
- New: `frontend/src/config/routes.js`
- `frontend/src/config/industryConfig.js` — replace all hardcoded href strings with `ROUTES.*`
- `frontend/src/App.jsx` — optionally use `ROUTES.*` in `<Route path=...>` (defensive)
- Any component that hardcodes a route string (`WelcomeMessage.jsx`, feature chips, sidebar)

**Entry criteria:** Phases 1 + 2 committed, tree clean, app fully clickable.
**Time:** 1–2 hours.
**Risk:** medium (many small edits, but each trivially verifiable).
**Exit test:** every link in the app navigates correctly; zero string regressions; `grep` for `href="/` or `to="/` in `frontend/src` returns nothing hardcoded.
**Commit:** `refactor(routes): introduce route SSOT, remove hardcoded paths`

---

## 🔹 PHASE 4 — Retail/Wholesale deep build (industry 1 of 8)
**Scope:** Build the real sub-routes that quick actions *want* to point to:
- `/sales/record` (or modal) — record a sale
- `/inventory/add` (or modal) — add stock
- `/debtors/pay` (or modal) — record payment
- `/reports/daily` (or filter) — daily report

Then **re-point** Retail quickActions to these real targets (now that they exist).

**Decision needed at start of this phase:** modal vs. separate page for each action. My recommendation: **modal** — fewer routes, better UX, less navigation. But decide explicitly.

**Entry criteria:** Phase 3 committed (so hrefs use `ROUTES.*`).
**Time:** 1–2 days.
**Risk:** medium (new UI, but isolated to Retail).
**Exit test:** each quick action performs its named action, not just navigates.
**Commit:** multiple, per action.

---

## 🔹 PHASE 5 — Industry expansion (industries 2–8)
**Scope:** Repeat the industry-by-industry pattern for:
Manufacturing, Construction, Healthcare, Consultancy, Real Estate, Education, Logistics.

**Per industry, the sub-phase is:**
1. Decide quick-action UX (modal vs page)
2. Build missing sub-routes / modals
3. Build missing backend (projects, materials, vehicles, raw_materials, students, properties — as needed)
4. Point `quickActions.href` at `ROUTES.*` entries (Phase 3 made these clean)
5. Test end-to-end
6. Commit

**Rule:** **one industry at a time.** No starting industry N+1 until N is committed + tested.
**Time:** multi-day per industry.
**Risk:** high (new backend surface each time).

---

## 🔹 PHASE 6 — Payment webhook hardening
**Scope:** Flutterwave webhooks → idempotency keys, retry, dead-letter, audit log.
**Entry:** Phase 5 (or at least Phase 4) committed.
**Time:** 1–2 days.
**Risk:** high (money path). Design reviewed before code.

---

## 🔹 PHASE 7 — SQLite → PostgreSQL
**Scope:** Migrate backend to PostgreSQL. Repos, migrations, connection pooling, backup story.
**Entry:** Phase 6 committed.
**Time:** 2–5 days.
**Risk:** very high.

---

## 🔹 PHASE 8 — Production readiness (deferred)
Sentry confirm · domain · email verification (Resend) · load test rate limiters.
Only when onboarding real users.

---

# 🔒 Ground rules (hold strictly)

1. **One phase at a time.** No starting N+1 until N is committed + tested + pushed.
2. **One industry at a time** within Phase 5.
3. **No mixing refactors with bug fixes.** `routes.js` lives in Phase 3, alone.
4. **No code before design approval** on Phases 4, 6, 7.
5. **No hardcoded route strings** after Phase 3 — everything through `routes.js`.
6. **Commit at the end of every phase.** Clean tree = safe checkpoint.
7. **Never add a quickAction href that points to a nonexistent route.** Fallback to nearest existing page + `// TODO` comment if needed.
8. **If something breaks mid-phase, fix it before moving on.** No band-aids.

---

# 📊 Phase summary table

| # | Phase | Time | Risk | Status |
|---|-------|------|------|--------|
| 1 | Fix 4 Retail quick actions | 5 min | minimal | ⏳ next |
| 2 | Back buttons (16 pages) | 30–45 min | low | pending |
| 3 | Route SSOT refactor (`routes.js`) | 1–2 hrs | medium | pending |
| 4 | Retail deep build (real sub-routes) | 1–2 days | medium | pending |
| 5 | Industries 2–8 (one at a time) | multi-day each | high | pending |
| 6 | Payment webhook hardening | 1–2 days | high | pending |
| 7 | SQLite → PostgreSQL | 2–5 days | very high | pending |
| 8 | Production readiness | ~2 days | med | deferred |

---

# 📁 Files to save

Save the above as **`PHASES.md`** in the project root. That's our contract. Every session starts by reading it and ends by updating the status column.

---

## Next action

Say **go** and I'll produce the Phase 1 diff: exactly 4 lines in `industryConfig.js`, nothing else.

Then you apply, click-test the 4 quick actions, and we commit. Phase 1 closed. Then Phase 2.