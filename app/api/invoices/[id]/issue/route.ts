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

export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const safeId = String(id ?? "").trim();

    if (!safeId) return jsonError(400, { error: "Missing invoice id" });
    if (!isUuid(safeId)) return jsonError(400, { error: "Invalid invoice id" });

    await requirePermission("invoices.issue");

    const admin = createSupabaseAdminClient();

    const { data: existing, error: checkErr } = await admin
      .from("invoices")
      .select("id, invoice_no, invoice_type, status, created_by")
      .eq("id", safeId)
      .maybeSingle();

    if (checkErr) {
      console.error("[invoices/[id]/issue]", checkErr);
      return jsonError(500, { error: "Failed to load invoice" });
    }

    if (!existing) {
      return jsonError(404, { error: "Invoice not found" });
    }

    if (String(existing.status ?? "").toUpperCase() === "ISSUED") {
      return NextResponse.json({
        ok: true,
        data: existing,
        message: "Invoice already issued",
      });
    }

    const { data, error } = await admin
      .from("invoices")
      .update({
        status: "ISSUED",
        issued_at: new Date().toISOString(),
      })
      .eq("id", safeId)
      .select("id, invoice_no, invoice_type, status, issued_at")
      .maybeSingle();

    if (error) {
      console.error("[invoices/[id]/issue]", error);
      return jsonError(500, { error: "Failed to issue invoice" });
    }

    if (!data) {
      return jsonError(404, { error: "Invoice not found" });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[POST /api/invoices/[id]/issue] fatal", e);
    return jsonError(500, { error: "Internal error" });
  }
}