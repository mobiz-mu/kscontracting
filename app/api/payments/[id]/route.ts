import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import {
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const paymentId = String(id ?? "").trim();

    if (!paymentId) {
      return jsonError(400, { error: "Missing payment id" });
    }

    await requirePermission("payments.view");

    const admin = createSupabaseAdminClient();

    const { data: payment, error: paymentErr } = await admin
      .from("payments")
      .select(`
        id,
        invoice_id,
        customer_id,
        payment_date,
        method,
        reference_no,
        amount,
        notes,
        created_at,
        created_by
      `)
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentErr) {
      console.error("[payments/[id]]", paymentErr);
      return jsonError(500, { error: "Failed to load payment" });
    }

    if (!payment) {
      return jsonError(404, { error: "Payment not found" });
    }

    const [{ data: invoice }, { data: customer }] = await Promise.all([
      admin
        .from("invoices")
        .select("id, invoice_no, invoice_date, site_address")
        .eq("id", payment.invoice_id)
        .maybeSingle(),
      admin
        .from("customers")
        .select("id, name")
        .eq("id", payment.customer_id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        id: payment.id,
        invoice_id: payment.invoice_id,
        invoice_no: invoice?.invoice_no ?? null,
        invoice_date: invoice?.invoice_date ?? null,
        customer_id: payment.customer_id,
        customer_name: customer?.name ?? null,
        payment_date: payment.payment_date,
        method: payment.method,
        reference_no: payment.reference_no ?? null,
        amount: payment.amount ?? 0,
        description: payment.notes ?? null,
        notes: payment.notes ?? null,
        site_address: invoice?.site_address ?? null,
        created_at: payment.created_at,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[GET /api/payments/[id]] fatal", e);
    return jsonError(500, { error: "Internal error" });
  }
}