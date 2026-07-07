import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function n2(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function normalizePaymentMethod(v: unknown) {
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

    const authz = await requirePermission("payments.create");

    const admin = createSupabaseAdminClient();

    const { data: rpcResult, error: rpcErr } = await admin.rpc(
      "record_invoice_payment",
      {
        p_invoice_id: safeId,
        p_payment_date: paymentDate,
        p_method: method,
        p_reference_no: referenceNo,
        p_amount: amount,
        p_notes: notes,
        p_created_by: authz.userId,
      }
    );

    if (rpcErr) {
      const msg = String(rpcErr.message ?? "");
      if (msg.includes("INVOICE_NOT_FOUND")) {
        return jsonError(404, { error: "Invoice not found" });
      }
      if (msg.includes("INVOICE_VOID")) {
        return jsonError(400, { error: "Cannot add payment to a void invoice" });
      }
      if (msg.includes("INVOICE_DRAFT")) {
        return jsonError(400, {
          error: "Cannot add a payment to a draft invoice. Issue it first.",
        });
      }
      if (msg.includes("INVOICE_ALREADY_PAID")) {
        return jsonError(400, { error: "Invoice is already fully paid" });
      }
      if (msg.includes("AMOUNT_EXCEEDS_BALANCE")) {
        return jsonError(400, { error: "Payment amount cannot exceed the invoice balance" });
      }
      if (msg.includes("INVALID_AMOUNT")) {
        return jsonError(400, { error: "Payment amount must be greater than 0" });
      }
      console.error("[invoices/[id]/payments]", rpcErr);
      return jsonError(500, { error: "Failed to record payment" });
    }

    return NextResponse.json({
      ok: true,
      message: "Payment added successfully",
      data: {
        payment: rpcResult?.payment ?? null,
        invoice: {
          id: rpcResult?.invoice_id,
          paid_amount: rpcResult?.paid_amount,
          balance_amount: rpcResult?.balance_amount,
          status: rpcResult?.status,
        },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[POST /api/invoices/[id]/payments] fatal", e);
    return jsonError(500, { error: "Internal error" });
  }
}