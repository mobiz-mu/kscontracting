-- Migration: transactional payment + balance update functions
--
-- Problem: previously, the API inserted a payment row and then ran a
-- separate UPDATE on the invoice/purchase_bill balance as two independent
-- statements. If the second statement failed (network blip, RLS issue,
-- concurrent update, etc.) the payment would exist but the balance would be
-- wrong, with no automatic way to recover.
--
-- Fix: do both writes inside a single Postgres function, wrapped in the
-- function's implicit transaction, with `select ... for update` to guard
-- against two concurrent payments racing on the same invoice/bill. If
-- anything raises, the whole function rolls back and no payment row is
-- left behind.
--
-- Run this in the Supabase SQL editor. Safe to re-run (uses `create or
-- replace function`).

-- ============================================================
-- Invoice payments
-- ============================================================
create or replace function record_invoice_payment(
  p_invoice_id uuid,
  p_payment_date date,
  p_method text,
  p_reference_no text,
  p_amount numeric,
  p_notes text,
  p_created_by uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice invoices%rowtype;
  v_current_balance numeric;
  v_new_paid numeric;
  v_new_balance numeric;
  v_new_status text;
  v_payment payments%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- Lock the invoice row so two concurrent payments can't both read the
  -- same balance and both succeed, overdrawing it.
  select * into v_invoice from invoices where id = p_invoice_id for update;

  if not found then
    raise exception 'INVOICE_NOT_FOUND';
  end if;

  if v_invoice.status = 'VOID' then
    raise exception 'INVOICE_VOID';
  end if;

  if v_invoice.status = 'DRAFT' then
    raise exception 'INVOICE_DRAFT';
  end if;

  v_current_balance := coalesce(
    v_invoice.balance_amount,
    v_invoice.total_amount - coalesce(v_invoice.paid_amount, 0)
  );

  if v_current_balance <= 0 then
    raise exception 'INVOICE_ALREADY_PAID';
  end if;

  if p_amount > v_current_balance then
    raise exception 'AMOUNT_EXCEEDS_BALANCE';
  end if;

  insert into payments (
    invoice_id, customer_id, payment_date, method, reference_no, amount, notes, created_by
  ) values (
    p_invoice_id, v_invoice.customer_id, p_payment_date, p_method, p_reference_no, p_amount, p_notes, p_created_by
  )
  returning * into v_payment;

  v_new_paid := coalesce(v_invoice.paid_amount, 0) + p_amount;
  v_new_balance := greatest(0, v_invoice.total_amount - v_new_paid);
  v_new_status := case when v_new_balance <= 0 then 'PAID' else 'PARTIALLY_PAID' end;

  update invoices
    set paid_amount = v_new_paid,
        balance_amount = v_new_balance,
        status = v_new_status
    where id = p_invoice_id;

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'invoice_id', p_invoice_id,
    'paid_amount', v_new_paid,
    'balance_amount', v_new_balance,
    'status', v_new_status
  );
end;
$$;

grant execute on function record_invoice_payment(uuid, date, text, text, numeric, text, uuid) to service_role;

-- ============================================================
-- Sub-contractor payments
-- ============================================================
create or replace function record_sub_contractor_payment(
  p_sub_contractor_id int,
  p_purchase_bill_id int,
  p_payment_no text,
  p_payment_date date,
  p_payment_method text,
  p_reference_no text,
  p_amount numeric,
  p_notes text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bill purchase_bills%rowtype;
  v_new_paid numeric;
  v_new_balance numeric;
  v_new_status text;
  v_payment sub_contractor_payments%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_purchase_bill_id is not null then
    select * into v_bill from purchase_bills where id = p_purchase_bill_id for update;

    if not found then
      raise exception 'BILL_NOT_FOUND';
    end if;

    if v_bill.sub_contractor_id is distinct from p_sub_contractor_id then
      raise exception 'BILL_CONTRACTOR_MISMATCH';
    end if;

    if p_amount > coalesce(v_bill.balance_amount, 0) then
      raise exception 'AMOUNT_EXCEEDS_BALANCE';
    end if;
  end if;

  insert into sub_contractor_payments (
    payment_no, sub_contractor_id, purchase_bill_id, payment_date,
    payment_method, reference_no, amount, notes
  ) values (
    p_payment_no, p_sub_contractor_id, p_purchase_bill_id, p_payment_date,
    p_payment_method, p_reference_no, p_amount, p_notes
  )
  returning * into v_payment;

  if p_purchase_bill_id is not null then
    v_new_paid := coalesce(v_bill.paid_amount, 0) + p_amount;
    v_new_balance := greatest(0, v_bill.total_amount - v_new_paid);
    v_new_status := case when v_new_balance <= 0 then 'PAID' else 'PARTIALLY_PAID' end;

    update purchase_bills
      set paid_amount = v_new_paid,
          balance_amount = v_new_balance,
          status = v_new_status
      where id = p_purchase_bill_id;
  end if;

  return jsonb_build_object('payment', to_jsonb(v_payment));
end;
$$;

grant execute on function record_sub_contractor_payment(int, int, text, date, text, text, numeric, text) to service_role;

create or replace function delete_sub_contractor_payment(p_payment_id bigint) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment sub_contractor_payments%rowtype;
  v_bill purchase_bills%rowtype;
  v_new_paid numeric;
  v_new_balance numeric;
  v_new_status text;
begin
  select * into v_payment from sub_contractor_payments where id = p_payment_id for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  delete from sub_contractor_payments where id = p_payment_id;

  if v_payment.purchase_bill_id is not null then
    select * into v_bill from purchase_bills where id = v_payment.purchase_bill_id for update;

    if found then
      v_new_paid := greatest(0, coalesce(v_bill.paid_amount, 0) - v_payment.amount);
      v_new_balance := greatest(0, v_bill.total_amount - v_new_paid);
      v_new_status := case
        when v_new_paid <= 0 then 'ISSUED'
        when v_new_balance <= 0 then 'PAID'
        else 'PARTIALLY_PAID'
      end;

      update purchase_bills
        set paid_amount = v_new_paid,
            balance_amount = v_new_balance,
            status = v_new_status
        where id = v_bill.id;
    end if;
  end if;

  return jsonb_build_object('deleted_payment_id', p_payment_id);
end;
$$;

grant execute on function delete_sub_contractor_payment(bigint) to service_role;
