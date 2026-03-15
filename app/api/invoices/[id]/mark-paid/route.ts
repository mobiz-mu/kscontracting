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

export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const safeId = String(id ?? "").trim();

    if (!safeId) return jsonError(400, { error: "Missing invoice id" });
    if (!isUuid(safeId)) return jsonError(400, { error: "Invalid invoice id" });

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, { error: "Unauthorized", supabaseError: safeError(userErr) });
    }

    const admin = createSupabaseAdminClient();

    const { data: existing, error: checkErr } = await admin
      .from("invoices")
      .select("id, invoice_no, total_amount, paid_amount, balance_amount, status, created_by")
      .eq("id", safeId)
      .maybeSingle();

    if (checkErr) {
      return jsonError(500, {
        error: "Failed to load invoice",
        supabaseError: safeError(checkErr),
      });
    }

    if (!existing) {
      return jsonError(404, { error: "Invoice not found" });
    }

    if (String(existing.created_by) !== String(userRes.user.id)) {
      return jsonError(403, { error: "Forbidden" });
    }

    const currentStatus = String(existing.status ?? "").toUpperCase();

    if (currentStatus === "VOID") {
      return jsonError(400, { error: "Cannot mark a void invoice as paid" });
    }

    if (currentStatus === "PAID" && n2(existing.balance_amount) <= 0) {
      return NextResponse.json({
        ok: true,
        data: existing,
        message: "Invoice already marked as paid",
      });
    }

    const totalAmount = n2(existing.total_amount);

    const { data, error } = await admin
      .from("invoices")
      .update({
        status: "PAID",
        paid_amount: totalAmount,
        balance_amount: 0,
      })
      .eq("id", safeId)
      .eq("created_by", userRes.user.id)
      .select("id, invoice_no, status, total_amount, paid_amount, balance_amount")
      .maybeSingle();

    if (error) {
      return jsonError(500, {
        error: "Failed to mark invoice as paid",
        supabaseError: safeError(error),
      });
    }

    if (!data) {
      return jsonError(404, { error: "Invoice not found" });
    }

    return NextResponse.json({
      ok: true,
      message: "Invoice marked as paid",
      data,
    });
  } catch (e: any) {
    console.error("[POST /api/invoices/[id]/mark-paid] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}