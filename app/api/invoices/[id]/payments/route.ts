import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(status: number, payload: any) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

function safeError(err: any) {
  return {
    message: err?.message ?? "Unknown error",
    code: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  };
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function normalizePaymentMethod(v: any) {
  const s = String(v ?? "").trim().toUpperCase();

  if (s === "BANK_TRANSFER" || s === "BANK TRANSFER") return "BANK_TRANSFER";
  if (s === "CASH") return "CASH";
  if (s === "CHEQUE" || s === "CHECK") return "CHEQUE";
  if (s === "JUICE") return "JUICE";
  if (s === "CARD") return "CARD";
  if (s === "OTHER") return "OTHER";

  return "BANK_TRANSFER";
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const safeId = String(id ?? "").trim();

    if (!safeId) return jsonError(400, { error: "Missing invoice id" });
    if (!isUuid(safeId)) return jsonError(400, { error: "Invalid invoice id" });

    const body = await req.json().catch(() => ({}));

    const amount = n2(body?.amount);
    const paymentDate = String(body?.payment_date || new Date().toISOString().slice(0, 10)).trim();
    const method = normalizePaymentMethod(body?.method ?? body?.payment_method);
    const referenceNo = String(body?.reference_no || "").trim() || null;
    const notes = String(body?.notes || "").trim() || null;

    if (amount <= 0) {
      return jsonError(400, { error: "Payment amount must be greater than 0" });
    }

    if (!paymentDate) {
      return jsonError(400, { error: "payment_date is required" });
    }

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, { error: "Unauthorized", supabaseError: safeError(userErr) });
    }

    const admin = createSupabaseAdminClient();

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select(`
        id,
        invoice_no,
        customer_id,
        total_amount,
        paid_amount,
        balance_amount,
        status,
        created_by
      `)
      .eq("id", safeId)
      .maybeSingle();

    if (invErr) {
      return jsonError(500, {
        error: "Failed to load invoice",
        supabaseError: safeError(invErr),
      });
    }

    if (!invoice) {
      return jsonError(404, { error: "Invoice not found" });
    }

    if (String(invoice.created_by) !== String(userRes.user.id)) {
      return jsonError(403, { error: "Forbidden" });
    }

    const currentStatus = String(invoice.status ?? "").toUpperCase();

    if (currentStatus === "VOID") {
      return jsonError(400, { error: "Cannot add payment to a void invoice" });
    }

    const totalAmount = n2(invoice.total_amount);
    const currentPaid = n2(invoice.paid_amount);
    const currentBalance =
      invoice.balance_amount == null
        ? Math.max(0, totalAmount - currentPaid)
        : n2(invoice.balance_amount);

    if (currentBalance <= 0) {
      return jsonError(400, { error: "Invoice is already fully paid" });
    }

    if (amount > currentBalance) {
      return jsonError(400, {
        error: `Payment amount cannot exceed balance amount (${currentBalance.toFixed(2)})`,
      });
    }

    const { data: payment, error: paymentErr } = await admin
      .from("payments")
      .insert({
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        payment_date: paymentDate,
        method,
        reference_no: referenceNo,
        amount,
        notes,
        created_by: userRes.user.id,
      })
      .select("*")
      .maybeSingle();

    if (paymentErr) {
      return jsonError(500, {
        error: "Failed to create payment",
        supabaseError: safeError(paymentErr),
      });
    }

    const newPaidAmount = currentPaid + amount;
    const newBalanceAmount = Math.max(0, totalAmount - newPaidAmount);

    let newStatus = "PARTIALLY_PAID";
    if (newBalanceAmount <= 0) {
      newStatus = "PAID";
    } else if (newPaidAmount <= 0 && currentStatus === "DRAFT") {
      newStatus = "DRAFT";
    } else if (newPaidAmount <= 0) {
      newStatus = "ISSUED";
    }

    const { data: updatedInvoice, error: updErr } = await admin
      .from("invoices")
      .update({
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        status: newStatus,
      })
      .eq("id", invoice.id)
      .eq("created_by", userRes.user.id)
      .select(`
        id,
        invoice_no,
        status,
        total_amount,
        paid_amount,
        balance_amount
      `)
      .maybeSingle();

    if (updErr) {
      return jsonError(500, {
        error: "Payment saved but failed to update invoice totals",
        supabaseError: safeError(updErr),
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Payment added successfully",
      data: {
        payment,
        invoice: updatedInvoice,
      },
    });
  } catch (e: any) {
    console.error("[POST /api/invoices/[id]/payments] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}