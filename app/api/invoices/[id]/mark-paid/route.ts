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

export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const safeId = String(id ?? "").trim();

    if (!safeId) return jsonError(400, { error: "Missing invoice id" });
    if (!isUuid(safeId)) return jsonError(400, { error: "Invalid invoice id" });

    await requirePermission("payments.create");

    const admin = createSupabaseAdminClient();

    const { data: existing, error: checkErr } = await admin
      .from("invoices")
      .select(
        "id, invoice_no, invoice_type, total_amount, paid_amount, credited_amount, balance_amount, status, created_by"
      )
      .eq("id", safeId)
      .maybeSingle();

    if (checkErr) {
      console.error("[invoices/[id]/mark-paid]", checkErr);
      return jsonError(500, { error: "Failed to load invoice" });
    }

    if (!existing) {
      return jsonError(404, { error: "Invoice not found" });
    }

    const currentStatus = String(existing.status ?? "").toUpperCase();
    const invoiceType = String(existing.invoice_type ?? "").toUpperCase();

    if (currentStatus === "VOID") {
      return jsonError(400, { error: "Cannot mark a void invoice as paid" });
    }

    if (currentStatus === "DRAFT") {
      return jsonError(400, {
        error: "Cannot mark a draft invoice as paid. Issue it first.",
      });
    }

    if (invoiceType === "PRO_FORMA" || invoiceType === "PROFORMA") {
      return jsonError(400, {
        error: "Pro Forma invoices are not receivables and cannot be marked as paid.",
      });
    }

    if (currentStatus === "PAID" && n2(existing.balance_amount) <= 0) {
      return NextResponse.json({
        ok: true,
        data: existing,
        message: "Invoice already marked as paid",
      });
    }

    const totalAmount = n2(existing.total_amount);
    const creditedAmount = n2(existing.credited_amount);

    // Mark Paid means "cash received covers whatever isn't already covered
    // by applied credit notes" — it must not overstate cash received when a
    // credit note has already reduced the balance.
    const newPaidAmount = Math.max(0, totalAmount - creditedAmount);

    const { data, error } = await admin
      .from("invoices")
      .update({
        status: "PAID",
        paid_amount: newPaidAmount,
        balance_amount: 0,
      })
      .eq("id", safeId)
      .select("id, invoice_no, status, total_amount, paid_amount, credited_amount, balance_amount")
      .maybeSingle();

    if (error) {
      console.error("[invoices/[id]/mark-paid]", error);
      return jsonError(500, { error: "Failed to mark invoice as paid" });
    }

    if (!data) {
      return jsonError(404, { error: "Invoice not found" });
    }

    return NextResponse.json({
      ok: true,
      message: "Invoice marked as paid",
      data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[POST /api/invoices/[id]/mark-paid] fatal", e);
    return jsonError(500, { error: "Internal error" });
  }
}