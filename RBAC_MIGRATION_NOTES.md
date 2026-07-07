# RBAC & Security Hardening — What Changed and What You Must Do

This document covers the API permission-enforcement pass. See `SECURITY_NOTICE.md`
for the credential-rotation steps (do those first if you haven't already).

## 1. Run the new migration

`supabase/migrations/0001_expand_rbac_permissions.sql` adds permission keys
that the API now checks for (e.g. `invoices.void`, `invoices.share`,
`quotations.convert`, `credit_notes.issue`, `purchase_bills.view/create/delete`,
`contacts.view`, `users.manage`, `access.manage`) and grants the accountant
role the ones described in your spec.

Run it in the Supabase SQL editor (Project → SQL Editor → paste → Run), or
via the Supabase CLI if you use one. It's idempotent — safe to run more than
once.

**Without this migration, accountants will get 403 Forbidden on actions like
issuing/voiding invoices, converting quotations, or creating purchase bills**,
because those permission keys don't exist in your current `permissions`
table yet. Admins are unaffected (admin bypasses permission checks in code).

## 2. What's now enforced

Every API route listed in your spec now calls `requirePermission(...)` (or
`requireAnyPermission([...])` for the shared invoice create/update endpoint)
before touching data. Previously, several of these routes only checked "is
someone logged in", not "does this person have the right role". In
particular:

- `settings/access` and `settings/company` (the routes that control the
  entire permission matrix) were previously reachable by **any** logged-in
  user, not just admins. This is now locked to `access.manage` /
  `settings.manage`.
- `settings/users` now requires the dedicated `users.manage` permission
  instead of overloading `settings.manage`.

## 3. A design change worth knowing about: removed per-user data siloing

The previous code scoped many queries with `.eq("created_by", <current user>)`
— meaning each accountant could only see/edit/void/pay *their own* invoices,
quotations, credit notes, and payments, not the company's full books. That
directly conflicts with the spec ("Accountant must be able to view all
invoices/quotations/credit notes/reports"), so those filters have been
removed across:

- `invoices` (list, detail, issue, void, mark-paid, share-link, payments)
- `quotations` (list, detail, convert)
- `credit-notes` (list, detail, issue)
- `payments` (create)
- `notifications/unpaid-overdue`

Visibility and write access are now governed entirely by the permission
system, which is the correct model for a shared company ledger. If you
actually wanted per-staff data isolation for some of these, tell me and I'll
scope it differently (e.g. "own records + admin/accountant see all").

## 4. Accounting logic fixes bundled into this pass

While in these files, I also fixed two balance bugs from your spec:

- `POST /api/payments` now updates the linked invoice's `paid_amount`,
  `balance_amount`, and `status` (it previously only inserted the payment
  row and left the invoice untouched). It also blocks payments against
  void/draft invoices and rejects overpayment.
- `POST /api/sub-contractor-payments` now updates the linked purchase bill's
  `paid_amount`/`balance_amount`/`status`, and `DELETE
  /api/sub-contractor-payments/[id]` rolls the bill balance back when a
  payment is removed.
- `GET /api/dashboard/summary` now excludes Pro Forma invoices from revenue
  and outstanding totals, per your Pro Forma business rule.

I have **not** yet touched: full credit-note-application-to-invoice
workflow, the reports module upgrade, or the UI/mobile redesign — those are
separate phases we haven't started.

## 5. Manual checks in Supabase after running the migration

1. Confirm your existing users each have exactly one role assigned
   (Settings → Users in the app, or `select * from user_roles`).
2. Spot-check the `role_permissions` table for the `accountant` role — it
   should now include the keys listed in section 3 of the migration file,
   and should **not** include `users.manage`, `access.manage`,
   `settings.manage`, `invoices.void`, or `purchase_bills.delete`.
3. If you have roles beyond admin/accountant (e.g. "sales", "viewer" from
   the old seed data), decide what permissions they should get — the
   migration only touches `admin` and `accountant`.
