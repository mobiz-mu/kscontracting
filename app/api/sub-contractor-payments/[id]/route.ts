import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import {
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    await requirePermission("purchase_bills.view");

    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin
      .from("sub_contractor_payments")
      .select(`
        *,
        sub_contractors (
          id,
          name,
          brn,
          vat_no,
          phone,
          email
        ),
        purchase_bills (
          id,
          bill_no,
          bill_date,
          total_amount,
          balance_amount
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("[sub-contractor-payments/[id]]", error);
      return jsonError(404, { error: "Sub contractor payment not found" });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[sub-contractor-payments/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    await requirePermission("purchase_bills.delete");

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc(
      "delete_sub_contractor_payment",
      { p_payment_id: Number(id) }
    );

    if (rpcErr) {
      const msg = String(rpcErr.message ?? "");
      if (msg.includes("PAYMENT_NOT_FOUND")) {
        return jsonError(404, { error: "Payment not found" });
      }
      console.error("[sub-contractor-payments/[id]]", rpcErr);
      return jsonError(500, { error: "Failed to delete payment" });
    }

    return NextResponse.json({ ok: true, data: rpcResult });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[sub-contractor-payments/[id]]", e);
    return jsonError(500, { error: "Internal error" });
  }
}