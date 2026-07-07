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

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const safeId = String(id ?? "").trim();

    if (!safeId || !isUuid(safeId)) {
      return jsonError(400, { error: "Invalid credit note id" });
    }

    await requirePermission("credit_notes.view");

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("credit_note_applications")
      .select(
        "id, credit_note_id, invoice_id, amount, applied_at, reversed_at, invoices ( invoice_no )"
      )
      .eq("credit_note_id", safeId)
      .order("applied_at", { ascending: false });

    if (error) {
      console.error("[credit-notes/[id]/apply GET]", error);
      return jsonError(500, { error: "Failed to load credit note applications" });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[credit-notes/[id]/apply GET]", e);
    return jsonError(500, { error: "Internal error" });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const safeId = String(id ?? "").trim();

    if (!safeId || !isUuid(safeId)) {
      return jsonError(400, { error: "Invalid credit note id" });
    }

    const authz = await requirePermission("credit_notes.apply");

    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body?.invoice_id ?? "").trim();
    const amount = n2(body?.amount);

    if (!invoiceId || !isUuid(invoiceId)) {
      return jsonError(400, { error: "A valid invoice_id is required" });
    }

    if (amount <= 0) {
      return jsonError(400, { error: "amount must be greater than 0" });
    }

    const admin = createSupabaseAdminClient();

    const { data: rpcResult, error: rpcErr } = await admin.rpc("apply_credit_note", {
      p_credit_note_id: safeId,
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_applied_by: authz.userId,
    });

    if (rpcErr) {
      const msg = String(rpcErr.message ?? "");
      if (msg.includes("CREDIT_NOTE_NOT_FOUND")) {
        return jsonError(404, { error: "Credit note not found" });
      }
      if (msg.includes("CREDIT_NOTE_NOT_ISSUED")) {
        return jsonError(400, { error: "Only issued credit notes can be applied" });
      }
      if (msg.includes("AMOUNT_EXCEEDS_REMAINING")) {
        return jsonError(400, { error: "Amount exceeds the credit note's remaining balance" });
      }
      if (msg.includes("INVOICE_NOT_FOUND")) {
        return jsonError(404, { error: "Invoice not found" });
      }
      if (msg.includes("INVOICE_NOT_APPLICABLE")) {
        return jsonError(400, { error: "Cannot apply a credit note to a draft or void invoice" });
      }
      if (msg.includes("CUSTOMER_MISMATCH")) {
        return jsonError(400, { error: "This credit note belongs to a different customer" });
      }
      if (msg.includes("INVOICE_ALREADY_SETTLED")) {
        return jsonError(400, { error: "Invoice has no outstanding balance" });
      }
      if (msg.includes("AMOUNT_EXCEEDS_INVOICE_BALANCE")) {
        return jsonError(400, { error: "Amount exceeds the invoice's outstanding balance" });
      }
      if (msg.includes("INVALID_AMOUNT")) {
        return jsonError(400, { error: "amount must be greater than 0" });
      }
      console.error("[credit-notes/[id]/apply POST]", rpcErr);
      return jsonError(500, { error: "Failed to apply credit note" });
    }

    return NextResponse.json({ ok: true, data: rpcResult });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[credit-notes/[id]/apply POST]", e);
    return jsonError(500, { error: "Internal error" });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const safeId = String(id ?? "").trim();

    if (!safeId || !isUuid(safeId)) {
      return jsonError(400, { error: "Invalid credit note id" });
    }

    await requirePermission("credit_notes.apply");

    const body = await req.json().catch(() => ({}));
    const applicationId = Number(body?.application_id ?? 0);

    if (!Number.isFinite(applicationId) || applicationId <= 0) {
      return jsonError(400, { error: "A valid application_id is required" });
    }

    const admin = createSupabaseAdminClient();

    const { data: rpcResult, error: rpcErr } = await admin.rpc("unapply_credit_note", {
      p_application_id: applicationId,
    });

    if (rpcErr) {
      const msg = String(rpcErr.message ?? "");
      if (msg.includes("APPLICATION_NOT_FOUND")) {
        return jsonError(404, { error: "Application not found" });
      }
      if (msg.includes("ALREADY_REVERSED")) {
        return jsonError(400, { error: "This application was already reversed" });
      }
      console.error("[credit-notes/[id]/apply DELETE]", rpcErr);
      return jsonError(500, { error: "Failed to reverse credit note application" });
    }

    return NextResponse.json({ ok: true, data: rpcResult });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[credit-notes/[id]/apply DELETE]", e);
    return jsonError(500, { error: "Internal error" });
  }
}
