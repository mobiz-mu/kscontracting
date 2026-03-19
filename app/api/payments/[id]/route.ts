import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

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

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const paymentId = String(id ?? "").trim();

    if (!paymentId) {
      return jsonError(400, { error: "Missing payment id" });
    }

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

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
      return jsonError(500, {
        error: "Failed to load payment",
        supabaseError: safeError(paymentErr),
      });
    }

    if (!payment) {
      return jsonError(404, { error: "Payment not found" });
    }

    if (String(payment.created_by) !== String(userRes.user.id)) {
      return jsonError(403, { error: "Forbidden" });
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
  } catch (e: any) {
    console.error("[GET /api/payments/[id]] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}