# Required base schema

This project's `supabase/migrations/` folder contains **patch migrations
only** (RBAC permissions, transactional payment functions, credit note
application). None of those create the core business tables — this app
assumes a base schema already exists in your Supabase project.

This document lists every table and the columns this codebase actually
reads or writes, gathered directly from the API routes. **Treat this as a
reference to reconcile against your live database, not as a substitute
schema migration** — column types, defaults, and constraints (especially
foreign keys and `not null`) aren't fully specified here since they weren't
all recoverable from application code alone. If you're standing up a fresh
database, use this as a checklist and add appropriate types/constraints/RLS
for your setup.

## Reference / lookup tables

**`roles`** — `id`, `key` (e.g. `admin`, `accountant`), `name`

**`permissions`** — `id`, `key` (e.g. `invoices.create`), `description`

**`role_permissions`** — `role_id` → roles, `permission_id` → permissions

**`user_roles`** — `user_id` (uuid, → auth.users), `role_id` → roles, `is_active` (bool), `created_at`

**`company_settings`** — single-row table: `id`, `company_name`, `currency`, `vat_rate`, `invoice_prefix`, `quote_prefix`, `credit_note_prefix` (assumed, verify), `brn`, `vat_no`, `address`, `phone`, `email`, plus numbering counters (verify exact column names against `app/api/settings/company/route.ts`)

## Contacts

**`customers`** — `id`, `name`, `brn`, `vat_no`, `email`, `phone`, `address`, `contact_person`, `notes`, `is_active`, `created_at`

**`suppliers`** — `id`, `name`, `brn`, `vat_no`, `email`, `phone`, `address`, `created_at`

**`sub_contractors`** — `id`, `name`, `brn`, `vat_no`, `email`, `phone`, `address`, `contact_person`, `notes`, `is_active`, `created_at`, `updated_at`

## Sales documents

**`invoices`** — `id` (uuid), `invoice_no`, `invoice_type` (`STANDARD` | `PRO_FORMA` | `VAT_INVOICE`/`VAT`), `status` (`DRAFT` | `ISSUED` | `PARTIALLY_PAID` | `PAID` | `VOID`), `invoice_date`, `due_date`, `site_address`, `notes`, `subtotal`, `vat_amount`, `total_amount`, `paid_amount`, **`credited_amount`** (added by migration `0003`), `balance_amount`, `customer_id` → customers, `customer_name`, `customer_vat`, `customer_brn`, `customer_address`, `created_by` (uuid), `created_at`, `issued_at`

**`invoice_items`** — `id`, `invoice_id` → invoices, `description`, `qty`, `unit_price_excl_vat`, `vat_rate`, `vat_amount`, `line_total`

**`quotations`** — `id` (uuid), `quotation_no`/`quote_no` (verify exact name), `status` (`DRAFT` | `ACCEPTED` | ...), `customer_id`, `customer_name`, `converted_invoice_id` → invoices, `created_by`, `created_at`, plus subtotal/vat/total fields mirroring invoices

**`quotation_items`** — mirrors `invoice_items`, `quotation_id` → quotations

**`credit_notes`** — `id` (uuid), `credit_no`, `customer_id`, `customer_name`, `invoice_id` → invoices (nullable — set on first application), `credit_date`, `site_address`, `reason`, `notes`, `subtotal`, `vat_amount`, `total_amount`, `applied_amount`, `remaining_amount`, `status` (`DRAFT` | `ISSUED` | `VOID`), `created_at`, `issued_at`

**`credit_note_items`** — mirrors `invoice_items`, `credit_note_id` → credit_notes

**`credit_note_applications`** — created by migration `0003`: `id`, `credit_note_id` → credit_notes, `invoice_id` → invoices, `amount`, `applied_by`, `applied_at`, `reversed_at`

## Payments

**`payments`** — `id`, `invoice_id` → invoices, `customer_id`, `payment_date`, `method`, `reference_no`, `amount`, `notes`, `created_by`, `created_at`

## Purchases

**`purchase_bills`** — `id`, `bill_no`, `sub_contractor_id` → sub_contractors, `bill_date`, `due_date`, `status` (`DRAFT` | `ISSUED` | `PARTIALLY_PAID` | `PAID` | `VOID`), `description`, `subtotal`, `vat_amount`, `total_amount`, `paid_amount`, `balance_amount`, `notes`, `created_at`, `updated_at`

**`purchase_bill_items`** — mirrors `invoice_items`, `purchase_bill_id` → purchase_bills

**`sub_contractor_payments`** — `id`, `payment_no`, `sub_contractor_id` → sub_contractors, `purchase_bill_id` → purchase_bills (nullable), `payment_date`, `payment_method`, `reference_no`, `amount`, `notes`, `created_at`

## Public sharing

**`invoice_share_tokens`** — `token` (text, unique), `invoice_id` → invoices, `expires_at`, `revoked_at`, `created_at`

## What's actually migration-managed vs assumed

| Table/column | Managed by |
|---|---|
| `roles`, `permissions`, `role_permissions` seed data | `0001_expand_rbac_permissions.sql` |
| `invoices.credited_amount` | `0003_credit_note_application.sql` |
| `credit_note_applications` (whole table) | `0003_credit_note_application.sql` |
| `record_invoice_payment()`, `record_sub_contractor_payment()`, `delete_sub_contractor_payment()` | `0002` (fixed further in `0004`) |
| `apply_credit_note()`, `unapply_credit_note()` | `0003` |
| Everything else in this document | **Assumed pre-existing** — not created by any migration in this repo |

If you're setting this project up from scratch rather than inheriting an existing Supabase project, you'll need to create the base tables (with appropriate primary keys, foreign keys, `not null` constraints, and RLS policies for your security model) before running the migrations in `supabase/migrations/`.
