-- Migration: credit note application workflow
--
-- Adds the ability to apply an issued credit note against a specific
-- invoice, reducing that invoice's outstanding balance, with a proper
-- transactional function (mirrors the payment functions in migration 0002).
--
-- Design notes:
-- * `invoices.credited_amount` is tracked separately from `paid_amount` so
--   "cash received" (payments) and "credit applied" (credit notes) remain
--   distinguishable in reports — outstanding balance is reduced by both,
--   but only `paid_amount` represents actual money received.
-- * A credit note can be applied across multiple invoices for the same
--   customer, in multiple partial applications, as long as
--   `remaining_amount` allows it.

alter table invoices
  add column if not exists credited_amount numeric not null default 0;

-- New permission for applying/unapplying credit notes.
insert into permissions (key, description)
values ('credit_notes.apply', 'Apply or unapply a credit note against an invoice')
on conflict (key) do nothing;

with accountant_role as (select id from roles where key = 'accountant'),
     perm as (select id from permissions where key = 'credit_notes.apply')
insert into role_permissions (role_id, permission_id)
select accountant_role.id, perm.id from accountant_role, perm
on conflict do nothing;

with admin_role as (select id from roles where key = 'admin'),
     perm as (select id from permissions where key = 'credit_notes.apply')
insert into role_permissions (role_id, permission_id)
select admin_role.id, perm.id from admin_role, perm
on conflict do nothing;

-- Table tracking each individual application of a credit note to an
-- invoice, so a credit note can be partially applied to more than one
-- invoice and each application can be individually reversed.
create table if not exists credit_note_applications (
  id bigint generated always as identity primary key,
  credit_note_id uuid not null references credit_notes(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric not null check (amount > 0),
  applied_by uuid,
  applied_at timestamptz not null default now(),
  reversed_at timestamptz
);

create index if not exists idx_credit_note_applications_credit_note
  on credit_note_applications (credit_note_id);
create index if not exists idx_credit_note_applications_invoice
  on credit_note_applications (invoice_id);

-- ============================================================
-- Apply a credit note to an invoice
-- ============================================================
create or replace function apply_credit_note(
  p_credit_note_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_applied_by uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit_note credit_notes%rowtype;
  v_invoice invoices%rowtype;
  v_invoice_balance numeric;
  v_application_id bigint;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_credit_note from credit_notes where id = p_credit_note_id for update;
  if not found then
    raise exception 'CREDIT_NOTE_NOT_FOUND';
  end if;

  if v_credit_note.status <> 'ISSUED' then
    raise exception 'CREDIT_NOTE_NOT_ISSUED';
  end if;

  if p_amount > coalesce(v_credit_note.remaining_amount, 0) then
    raise exception 'AMOUNT_EXCEEDS_REMAINING';
  end if;

  select * into v_invoice from invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'INVOICE_NOT_FOUND';
  end if;

  if v_invoice.status in ('VOID', 'DRAFT') then
    raise exception 'INVOICE_NOT_APPLICABLE';
  end if;

  if v_credit_note.customer_id is not null
     and v_invoice.customer_id is not null
     and v_credit_note.customer_id is distinct from v_invoice.customer_id then
    raise exception 'CUSTOMER_MISMATCH';
  end if;

  v_invoice_balance := greatest(
    0,
    v_invoice.total_amount - coalesce(v_invoice.paid_amount, 0) - coalesce(v_invoice.credited_amount, 0)
  );

  if v_invoice_balance <= 0 then
    raise exception 'INVOICE_ALREADY_SETTLED';
  end if;

  if p_amount > v_invoice_balance then
    raise exception 'AMOUNT_EXCEEDS_INVOICE_BALANCE';
  end if;

  insert into credit_note_applications (credit_note_id, invoice_id, amount, applied_by)
  values (p_credit_note_id, p_invoice_id, p_amount, p_applied_by)
  returning id into v_application_id;

  update credit_notes
    set applied_amount = coalesce(applied_amount, 0) + p_amount,
        remaining_amount = greatest(0, coalesce(remaining_amount, 0) - p_amount),
        invoice_id = coalesce(invoice_id, p_invoice_id)
    where id = p_credit_note_id;

  update invoices
    set credited_amount = coalesce(credited_amount, 0) + p_amount,
        balance_amount = greatest(0, total_amount - coalesce(paid_amount, 0) - (coalesce(credited_amount, 0) + p_amount)),
        status = case
          when greatest(0, total_amount - coalesce(paid_amount, 0) - (coalesce(credited_amount, 0) + p_amount)) <= 0 then 'PAID'
          when coalesce(paid_amount, 0) + coalesce(credited_amount, 0) + p_amount > 0 then 'PARTIALLY_PAID'
          else status
        end
    where id = p_invoice_id;

  return jsonb_build_object('application_id', v_application_id);
end;
$$;

grant execute on function apply_credit_note(uuid, uuid, numeric, uuid) to service_role;

-- ============================================================
-- Reverse (unapply) a credit note application
-- ============================================================
create or replace function unapply_credit_note(p_application_id bigint) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app credit_note_applications%rowtype;
  v_invoice invoices%rowtype;
  v_new_credited numeric;
  v_new_balance numeric;
begin
  select * into v_app from credit_note_applications where id = p_application_id for update;
  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;

  if v_app.reversed_at is not null then
    raise exception 'ALREADY_REVERSED';
  end if;

  update credit_note_applications
    set reversed_at = now()
    where id = p_application_id;

  update credit_notes
    set applied_amount = greatest(0, coalesce(applied_amount, 0) - v_app.amount),
        remaining_amount = coalesce(remaining_amount, 0) + v_app.amount
    where id = v_app.credit_note_id;

  select * into v_invoice from invoices where id = v_app.invoice_id for update;
  if found then
    v_new_credited := greatest(0, coalesce(v_invoice.credited_amount, 0) - v_app.amount);
    v_new_balance := greatest(0, v_invoice.total_amount - coalesce(v_invoice.paid_amount, 0) - v_new_credited);

    update invoices
      set credited_amount = v_new_credited,
          balance_amount = v_new_balance,
          status = case
            when v_new_balance <= 0 then status
            when coalesce(v_invoice.paid_amount, 0) + v_new_credited > 0 then 'PARTIALLY_PAID'
            else 'ISSUED'
          end
      where id = v_invoice.id;
  end if;

  return jsonb_build_object('reversed_application_id', p_application_id);
end;
$$;

grant execute on function unapply_credit_note(bigint) to service_role;
