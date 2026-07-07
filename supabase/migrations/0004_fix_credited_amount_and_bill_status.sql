-- Migration: fix invoice payment balance to include credited_amount,
-- and block DRAFT/VOID purchase bills from receiving payments.
--
-- Must run AFTER 0002 and 0003 (uses invoices.credited_amount, added in 0003).
--
-- Bug fixed: record_invoice_payment() computed balance as
-- `total_amount - paid_amount`, ignoring credit notes already applied via
-- apply_credit_note() (migration 0003). Example: total 100, credit note
-- applied 20, customer pays 80 -> should be balance 0 / status PAID, but
-- the old function left balance at 20 / PARTIALLY_PAID because it never
-- looked at credited_amount.
--
-- Also fixed: record_sub_contractor_payment() didn't block DRAFT/VOID
-- purchase bills the way record_invoice_payment() already blocked
-- DRAFT/VOID invoices.

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

  -- Outstanding balance always reflects BOTH cash received (paid_amount)
  -- and credit notes applied (credited_amount). Recompute from first
  -- principles rather than trusting the stored balance_amount, so this
  -- stays correct even if balance_amount ever drifts.
  v_current_balance := greatest(
    0,
    v_invoice.total_amount - coalesce(v_invoice.paid_amount, 0) - coalesce(v_invoice.credited_amount, 0)
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
  v_new_balance := greatest(
    0,
    v_invoice.total_amount - v_new_paid - coalesce(v_invoice.credited_amount, 0)
  );
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
    'credited_amount', coalesce(v_invoice.credited_amount, 0),
    'balance_amount', v_new_balance,
    'status', v_new_status
  );
end;
$$;

grant execute on function record_invoice_payment(uuid, date, text, text, numeric, text, uuid) to service_role;

-- ============================================================
-- Sub-contractor payments: block DRAFT/VOID purchase bills
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

    if v_bill.status = 'VOID' then
      raise exception 'BILL_VOID';
    end if;

    if v_bill.status = 'DRAFT' then
      raise exception 'BILL_DRAFT';
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
