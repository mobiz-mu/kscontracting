-- Migration: expand permissions for RBAC hardening
-- Run this in the Supabase SQL editor (or via `supabase db push` if you've
-- set up the CLI) against your existing project. It is safe to re-run.
--
-- Context: the API now enforces a wider set of permission keys than before.
-- Your `permissions` table was likely seeded before these keys existed, so
-- without this migration, roles other than admin (e.g. accountant) will get
-- 403 Forbidden on the actions below even though the code path is correct.

-- 1) Add any missing permission keys.
insert into permissions (key, description)
values
  ('dashboard.view', 'View dashboard'),
  ('invoices.view', 'View invoices'),
  ('invoices.create', 'Create invoices'),
  ('invoices.edit', 'Edit invoices'),
  ('invoices.issue', 'Issue invoices'),
  ('invoices.void', 'Void invoices'),
  ('invoices.share', 'Create/revoke public invoice share links'),
  ('payments.view', 'View payments'),
  ('payments.create', 'Record payments'),
  ('quotations.view', 'View quotations'),
  ('quotations.create', 'Create quotations'),
  ('quotations.edit', 'Edit quotations'),
  ('quotations.convert', 'Convert quotations to invoices'),
  ('credit_notes.view', 'View credit notes'),
  ('credit_notes.create', 'Create credit notes'),
  ('credit_notes.issue', 'Issue credit notes'),
  ('contacts.view', 'View customers, suppliers, sub-contractors'),
  ('contacts.manage', 'Manage customers and suppliers'),
  ('purchase_bills.view', 'View purchase bills'),
  ('purchase_bills.create', 'Create purchase bills'),
  ('purchase_bills.delete', 'Delete purchase bills (admin only by default)'),
  ('reports.view', 'View reports'),
  ('settings.manage', 'Manage company settings'),
  ('users.manage', 'Manage users and role assignments'),
  ('access.manage', 'Manage the roles/permissions access matrix')
on conflict (key) do nothing;

-- 2) Make sure the core roles exist.
insert into roles (key, name)
values
  ('admin', 'Admin'),
  ('accountant', 'Accountant'),
  ('viewer', 'Viewer')
on conflict (key) do nothing;

-- 3) Grant the accountant role the permissions described in the spec:
--    view/create invoices, quotations, credit notes; issue invoices;
--    convert quotations; manage contacts; record payments; view/create
--    purchase bills; view all reports. Explicitly NOT granted: users.manage,
--    access.manage, settings.manage, invoices.void, purchase_bills.delete.
with accountant_role as (
  select id from roles where key = 'accountant'
),
wanted_perms as (
  select id from permissions where key in (
    'dashboard.view',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.issue', 'invoices.share',
    'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.convert',
    'credit_notes.view', 'credit_notes.create', 'credit_notes.issue',
    'contacts.view', 'contacts.manage',
    'payments.view', 'payments.create',
    'purchase_bills.view', 'purchase_bills.create',
    'reports.view'
  )
)
insert into role_permissions (role_id, permission_id)
select accountant_role.id, wanted_perms.id
from accountant_role, wanted_perms
on conflict do nothing;

-- 4) Make sure admin has every permission (admin also bypasses checks in
--    code, but keeping the matrix accurate makes the Settings > Access UI
--    correct too).
with admin_role as (
  select id from roles where key = 'admin'
)
insert into role_permissions (role_id, permission_id)
select admin_role.id, permissions.id
from admin_role, permissions
on conflict do nothing;
