# KS Accounting

Internal accounting SaaS for KS Contracting Ltd — invoices, quotations,
credit notes, payments, purchase bills, sub-contractor payments, and
reporting, built on Next.js (App Router) and Supabase.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React, TypeScript
- **Styling:** Tailwind CSS
- **Database / Auth:** Supabase (Postgres, Auth, RLS via service-role API routes)
- **PDF generation:** Playwright + `@sparticuz/chromium-min` (see "PDF export deployment note" below)

## Project structure

```
app/(auth)/        Login, forgot/reset password
app/(app)/          Authenticated app (dashboard, sales, contacts, reports, settings)
app/(public)/       Public, token-based invoice viewing (no login required)
app/api/            API routes (all business logic + permission checks live here)
lib/authz.ts        Role/permission resolution + requirePermission() helpers
lib/supabase/       Supabase client factories (server, admin, browser, middleware)
supabase/migrations/  SQL migrations — run these against your Supabase project
```

## Setup

1. **Install dependencies**

   ```bash
   npm ci
   ```

2. **Environment variables** — copy `.env.example` to `.env.local` and fill in real values:

   | Variable | Purpose |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (safe for client use) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-side only — full DB access. Never expose to the client or commit it. |
   | `KS_SYSTEM_USER_ID` | UUID used for system-generated records |
   | `NEXT_PUBLIC_APP_URL` / `APP_URL` | Public app URL, used for share links, metadata, and email redirects |

   **Never commit or zip `.env.local`.** If it's ever shared outside your control, rotate the Supabase service role key immediately (Project Settings → API → reset service role key) and change any passwords that were in the repo.

3. **Run the database migrations** — in the Supabase SQL editor, run, **in this exact order**:

   1. `supabase/migrations/0001_expand_rbac_permissions.sql` — permission keys + accountant role grants
   2. `supabase/migrations/0002_transactional_payment_functions.sql` — atomic payment/balance-update functions
   3. `supabase/migrations/0003_credit_note_application.sql` — credit note → invoice application workflow (adds `invoices.credited_amount`)
   4. `supabase/migrations/0004_fix_credited_amount_and_bill_status.sql` — fixes `record_invoice_payment()` to account for `credited_amount`, and blocks DRAFT/VOID purchase bills from payments

   These are idempotent (safe to re-run) but **order matters on a fresh database** — `0004` references `invoices.credited_amount`, which doesn't exist until `0003` has run. Also see `supabase/SCHEMA_REQUIRED.md` for the base tables this app assumes already exist.

   > **⚠️ Staging warning:** always run new migrations against a staging/copy of your database first, especially `0004`, which changes how outstanding balances are calculated. If you have existing invoices with credit notes already applied under the old (buggy) logic, their `balance_amount` may need a one-time recalculation after upgrading — recompute as `total_amount - paid_amount - credited_amount` for any invoice where a credit note was applied before this fix.

4. **Create your first admin user**

   - Create the user in Supabase Auth (Dashboard → Authentication → Users → Add user, or have them sign up if you build that flow).
   - Find the `admin` role's id: `select id from roles where key = 'admin';`
   - Assign it: `insert into user_roles (user_id, role_id, is_active) values ('<user-uuid>', <admin-role-id>, true);`
   - That user can now log in and manage everything, including assigning roles to other users from **Settings → Users**.

5. **Run the app**

   ```bash
   npm run dev
   ```

## RBAC model

Permissions are plain string keys (e.g. `invoices.create`, `reports.view`) stored in the `permissions` table, grouped into roles via `role_permissions`, and assigned to users via `user_roles`. `lib/authz.ts` exposes:

- `requirePermission(key)` — throws `Forbidden`/`Unauthorized` if the current user lacks it (role `admin` always passes)
- `requireAnyPermission([keys])` — passes if any one of the keys is granted
- `hasPermission(key)` — boolean check

Every API route that reads or writes business data calls one of these before touching the database — permission checks are enforced server-side, not just hidden in the sidebar.

**Accountant role** (seeded by migration 0001) can: view the dashboard; view/create/edit/issue/share invoices; view/create/edit/convert quotations; view/create/issue/apply credit notes; view/manage contacts; view/create payments; view/create purchase bills; view all reports.

**Accountant cannot:** manage users, manage the access matrix, change company settings, void invoices, or delete purchase bills — those require permissions only granted to `admin` by default.

If you add new roles beyond `admin`/`accountant`, assign their permissions from **Settings → Access** (admin only).

## Security notes

- `.env.local` and any file containing secrets must never be committed or zipped for sharing. See `SECURITY_NOTICE.md` if you're recovering from a previous exposure.
- API routes never return raw Supabase error objects (`message`/`code`/`details`/`hint`) to the client — errors are logged server-side via `console.error` and a generic message is returned.
- Public invoice links (`/public-invoice/[token]`) are token-gated and checked for expiry and revocation on every request, both server-rendered page and the underlying API.
- `scripts/reset-user-password.js` takes credentials via CLI flags or interactive prompt — never hard-code a password into it.

## Payments & balances

Invoice payments, sub-contractor payments, and credit-note applications all go through Postgres functions (see `supabase/migrations/0002_...`, `0003_...`, `0004_...`) so the payment/credit row and the balance update happen in one transaction — a failure partway through rolls back cleanly instead of leaving a payment recorded with a stale balance.

- Payments cannot be made against `DRAFT` or `VOID` invoices or purchase bills, and cannot exceed the outstanding balance.
- Pro Forma invoices are excluded from revenue/outstanding totals; only VAT invoices count as receivables.
- Deleting a sub-contractor payment automatically rolls back the linked purchase bill's balance.
- **Accounting rule, everywhere in the app:** `paid_amount` is actual cash received. `credited_amount` is value settled via credit notes — it is real money owed no longer, but it is **not cash**. `balance_amount` (outstanding) is always `total_amount - paid_amount - credited_amount`. Never derive "paid"/"collected" as `total - balance`, since that silently folds credited amounts in as if they were cash. This rule applies to the invoice detail/list pages, the SOA report, and the public invoice pages — all fixed to follow it as of this pass.

## Reports

The shared filter system (`lib/reports/period.ts` — quick filters, custom range, financial year, monthly/quarterly/yearly grouping — and `components/reports/ReportFilterBar.tsx` — the UI, with CSV export and print) is applied to:

- `/reports/sub-contractor-payables`
- `/reports/sales` (includes a grouped period breakdown table)
- `/reports/vat` (includes a grouped period breakdown table)
- `/reports/soa` (grouping disabled — it's a customer-balance snapshot, not period-bucketed; quick filters/custom range/CSV/print still apply)
- `/payments/report` (filtered/grouped client-side, since the payments API doesn't yet support server-side date params)

Not yet updated: the dashboard's report cards (`components/dashboard/DashboardClient.tsx`), which has its own baked-in "this month vs last month" comparison logic that would need a larger, separate rework to support the shared period selector without risking regressions.

## PDF export deployment note

`app/api/public/invoice-pdf/[token]/route.ts` renders the public invoice page in a headless Chromium instance (via Playwright + `@sparticuz/chromium-min`) and downloads a Chromium binary pack from GitHub releases at runtime. This requires:

- Outbound internet access from your server/serverless function to `github.com` (to fetch the Chromium pack) on first use
- A Node.js serverless runtime with enough memory/time budget for headless Chromium (this route sets `export const runtime = "nodejs"`)

If your hosting platform blocks outbound requests to GitHub or has tight function size/memory limits (e.g. some edge runtimes), this route will fail — either allowlist the domain, pre-bundle the Chromium binary, or replace this approach with a PDF library that doesn't need a browser.

## Final Launch Checklist

### 1. Supabase migrations (run in this exact order)

1. `supabase/migrations/0001_expand_rbac_permissions.sql` — permission keys + accountant role grants
2. `supabase/migrations/0002_transactional_payment_functions.sql` — atomic payment/balance-update functions
3. `supabase/migrations/0003_credit_note_application.sql` — credit note → invoice application workflow (adds `invoices.credited_amount`)
4. `supabase/migrations/0004_fix_credited_amount_and_bill_status.sql` — fixes `record_invoice_payment()` to account for `credited_amount`, blocks DRAFT/VOID purchase bills from payments

All four are idempotent — safe to re-run. Order matters on a fresh database (`0004` references a column added in `0003`). See `supabase/SCHEMA_REQUIRED.md` for the base tables this app assumes already exist (not created by these migrations).

### 2. Required Vercel environment variables

Set these in your Vercel project (Settings → Environment Variables), for both Production and Preview:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe for client-side use |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only — never expose to the client |
| `KS_SYSTEM_USER_ID` | UUID for system-generated records |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://ks-accounting.vercel.app` |
| `APP_URL` | Same as above, used server-side |

### 3. Supabase Auth redirect URLs

In Supabase → Authentication → URL Configuration, add all environments you actually use:

- **Local dev:** `http://localhost:3000/reset-password`
- **Vercel production:** `https://<your-production-domain>/reset-password`
- **Vercel preview deployments** (if used): `https://*.vercel.app/reset-password`, or add each preview URL individually since Supabase doesn't support full wildcard matching on the domain
- **Site URL:** set to your production `NEXT_PUBLIC_APP_URL`

The forgot-password flow (`/forgot-password` → Supabase sends an email → `/reset-password`) will fail silently or redirect incorrectly if these aren't registered.

### 4. Admin/accountant test checklist

**As Admin:** dashboard; settings; users; access matrix; company settings; full invoice lifecycle (create/edit/issue/share/void); all reports.

**As Accountant:** dashboard; view/create/edit/issue/share invoices; view/create payments; view/create/edit/convert quotations; view/create/issue/apply credit notes; view/manage contacts; view/create purchase bills; all reports. Confirm they're **blocked** from: user management, access matrix, company settings, and voiding invoices.

### 5. Accounting correctness checklist

Run this exact scenario after deploying, on a test customer/invoice:

1. Create and issue a VAT invoice for **Rs 100**.
2. Issue a credit note for **Rs 20** and apply it to that invoice.
3. Record a cash payment of **Rs 80** against the same invoice.
4. Verify:
   - `paid_amount` = **Rs 80** (actual cash collected)
   - `credited_amount` = **Rs 20** (credit note applied — not cash)
   - `balance_amount` = **Rs 0**
   - Invoice status = **PAID**

This exercises the fix in migration `0004`, where the payment function computes balance as `total_amount − paid_amount − credited_amount` rather than just `total_amount − paid_amount`.

Also confirm: Pro Forma invoices never appear in revenue/outstanding totals on the dashboard or SOA report (only `VAT_INVOICE` type counts).

### 6. Public invoice sharing checklist

- Generate a share link from an issued invoice and open it in a private/incognito window (no login) — it should render correctly with company branding from `company_settings`.
- Revoke the link and confirm it now shows a clear "revoked" state, not a generic error.
- Let a link expire (or manually set `expires_at` in the past) and confirm it shows an "expired" state.
- Try a garbage token and confirm a clean "not found" state — no stack traces or Supabase error details.
- Confirm the PDF download works, or see the PDF export deployment note above if your host can't run headless Chromium.

### 7. Reports checklist

For each of: Sales, VAT, SOA, Sub-contractor Payables, Payments Report — confirm:
- Quick filters (this/last month, this/last quarter, this/last year, financial year) return sensible data
- Custom date range works
- CSV export downloads a valid file
- Print produces a clean, readable layout
- Mobile view doesn't overflow horizontally

### 8. Final deploy commands

```bash
git status --short        # review before committing — see Task 5 below
npm ci
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
git add .
git commit -m "Production-ready cleanup: lint clean, typecheck clean, build verified"
git push
```

Then deploy on Vercel (either via Git integration auto-deploy, or `vercel --prod` if using the CLI). After the first deploy, run the migrations (step 1) against your production Supabase project **before** real users log in.

## Build reliability fixes

### This pass: a concrete code bug, not just a framework quirk

Isolation testing (removing `app/(public)`, `app/api/public`, the print pages, and `app/(app)` one at a time and rebuilding) never reproduced a hang in this sandbox — we still cannot force this failure to happen here, so we can't claim certainty. But a direct code audit of everything you asked us to check (module-scope Supabase clients, `cookies()`/`headers()`/`redirect()` usage, network calls, dynamic-rendering config) turned up a real, structural bug:

**`app/(app)/layout.tsx` — the layout wrapping every single protected page (~40 pages: dashboard, invoices, quotations, credit notes, payments, purchase bills, settings, etc.) — made a live network call to Supabase Auth (`supabase.auth.getUser()`) on every render, with no timeout, and had no explicit `export const dynamic`.** It relied entirely on Next's *implicit* dynamic-rendering detection (using `cookies()` is supposed to auto-opt a route into dynamic rendering). That implicit detection has been inconsistent across Next versions and configurations. If Next's build process attempts to evaluate this layout for even a subset of the ~40 pages it wraps during "Collecting page data" — to determine whether they *can* be static — every one of those attempts fires a real, unbounded network request to your Supabase project's auth endpoint. On a machine/network where that request doesn't fail fast (wrong/missing credentials in a clean checkout without `.env.local`, DNS behavior that differs from this sandbox, a corporate proxy, etc.), each attempt hangs, and with multiple build workers evaluating different pages in parallel, this exactly matches "hangs at Collecting page data using N workers."

**Fix, in `app/(app)/layout.tsx`:**
1. Added `export const dynamic = "force-dynamic"; export const revalidate = 0;` explicitly — no longer relying on implicit detection.
2. Wrapped the `getUser()` call in an 8-second timeout (`Promise.race` against a timer that resolves with "no user"), so even in the worst case this layout can never hang the build (or a real request) indefinitely again — it will time out and redirect to `/login` instead.

We also audited (and found clean): `lib/supabase/server.ts` (only plain functions, nothing runs at module scope), the root layout and `(auth)` layout (no data fetching), all print pages (client components, no server-side work), and confirmed no route exports `generateStaticParams` anywhere in the app.

### Also still in place from previous passes (not the root cause, but not harmful)

- `NEXT_TELEMETRY_DISABLED=1` via `cross-env` on all scripts (a real, documented upstream Next.js bug — [vercel/next.js#70755](https://github.com/vercel/next.js/issues/70755) — where a telemetry-flush POST request with no timeout can hang the very end of a build on restricted networks)
- `experimental.cpus: 4` in `next.config.ts` (caps build worker count)
- Lazy-loaded Playwright/Chromium imports in the PDF route
- `npm run build:stable` fallback (webpack + `NEXT_IGNORE_BUILD_ERRORS=1`, with `npm run typecheck` as a separate mandatory gate)

### Isolation test results (this sandbox — for transparency, not proof)

| Test | Result |
|---|---|
| Baseline (full app, `build:stable`) | ✅ 68s |
| Remove `app/(public)` | ✅ 65s |
| Remove `app/api/public` | ✅ 62s |
| Remove all 3 print pages | ✅ 66s |
| Remove `app/(app)` entirely | ✅ 41s (noticeably faster — consistent with `app/(app)` containing the bulk of the pages, but not proof of a hang there since nothing hangs here regardless) |

None of these reproduced a hang here, which is why the fix above came from static code audit rather than dynamic reproduction. If `NEXT_TELEMETRY_DISABLED=1` plus the layout fix still doesn't resolve it on your machine, the next most useful thing you can do is tell us **exactly which of `npm run build` / `npm run build:webpack` / `npm run build:stable` still hangs, and whether it's immediately after "Collecting page data" starts or after some delay** — that distinguishes "a specific page's data collection is stuck" from "the whole worker pool is stuck," which point to different remaining causes.

## Known remaining work

- **Lint:** `npm run lint` is now **fully clean — 0 errors, 0 warnings** (was 287 → 178 → 57 → 0 across this cleanup pass). All `@typescript-eslint/no-explicit-any` and `react/no-unescaped-entities` errors resolved with real types (row interfaces, `unknown` + narrowing, a shared `getErrorMessage()` helper in `lib/utils.ts`) — no rule was disabled and no fake broad types were used to silence errors. `npm run typecheck` is clean throughout.
- **npm audit:** 2 moderate vulnerabilities remain, confirmed unavoidable — verified `16.2.10` is the latest stable Next.js release directly via `npm view next versions`; it still bundles a vulnerable `postcss` internally. `npm audit fix --force` only "fixes" this by downgrading to `next@9.3.3`, which was **not** applied, per instruction. Revisit when Next.js ships a release with a patched `postcss`.
- **Dashboard:** the original "this month vs last month" comparison KPI cards use their original, unchanged, fixed-period logic (revenue = paid VAT invoices only, Pro Forma excluded). The **Period Summary** panel above them is a separate, additional, user-selectable-period view — same accounting rules (paid = cash, credited = credit notes, outstanding = balance_amount, Pro Forma excluded from revenue/receivables) — but it does not replace or alter the original cards.
- **Bug fixed in this pass:** `GET /api/invoices/[id]` selected `credited_amount` from the database but never included it in the JSON response, so the invoice detail page's "Credited" figure was silently always showing 0. Now fixed — `credited_amount` is returned correctly.
- **Mobile/UI:** re-scanned every page with a `<table>` for missing scroll wrappers (one intentional exception: the sub-contractor-payables report's desktop table, hidden below `sm` in favor of mobile cards). Confirmed print-preview scaling and the shared `ReportFilterBar` already handle narrow viewports.
- **Reports:** sales, VAT, sub-contractor-payables, SOA, and payments report use the shared filter system; dashboard's original KPI cards don't, by design (see above).
- **Public invoice routes:** consolidated in an earlier pass — `/share/invoice/[token]` redirects to the canonical `/public-invoice/[token]`.

## Troubleshooting

- **Build hangs at "Running TypeScript..." or "Collecting page data...":** see "Build reliability fixes" above. Try, in order:
  1. Confirm you're using the updated scripts (`npm run build`, not a raw `next build` call that bypasses the `cross-env` telemetry flag).
  2. Try `npm run build:stable` as a documented fallback.
  3. Antivirus (especially Windows Defender) real-time-scanning `node_modules`/`.next` — add an exclusion for the project folder.
  4. The project folder living inside OneDrive/Dropbox/a synced folder — move it outside any synced folder.
  5. A leftover `next dev` process still running — stop it before running a build.
  6. Increase Node's memory headroom: `set NODE_OPTIONS=--max-old-space-size=4096`.
  7. If it hangs specifically at "Collecting page data" with an EPIPE, try lowering `experimental.cpus` in `next.config.ts` further (e.g. to `2`).
  8. If it still hangs after all of the above, please report exactly which script hangs and how long it sits before you give up — that's the single most useful piece of information for isolating whatever's left.

- **"Forbidden" errors for an accountant on an action the spec says they should have** — confirm migration `0001_expand_rbac_permissions.sql` has been run against your database; without it, new permission keys don't exist yet even though the code checks for them.
- **User's assigned role doesn't show up in Settings → Users** — Supabase can return a joined foreign row as either an object or a one-element array depending on query shape/client version; this is handled, but if you see it again, check `lib/authz.ts` and `app/api/settings/users/route.ts` for the normalization logic.
- **PDF download fails** — see the PDF export deployment note above.
