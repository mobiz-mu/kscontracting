import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

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
    const { token } = await ctx.params;
    const safeToken = String(token ?? "").trim();

    if (!safeToken) {
      return jsonError(400, { error: "Missing token" });
    }

    const admin = createSupabaseAdminClient();

    const { data: share, error: shareErr } = await admin
      .from("invoice_share_tokens")
      .select("token, invoice_id, expires_at")
      .eq("token", safeToken)
      .maybeSingle();

    if (shareErr) {
      return jsonError(500, {
        error: "Failed to load share token",
        supabaseError: safeError(shareErr),
      });
    }

    if (!share) {
      return jsonError(404, { error: "Share link not found" });
    }

    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
      return jsonError(410, { error: "Share link expired" });
    }

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select(`
        id,
        invoice_no,
        status,
        invoice_type,
        invoice_date,
        due_date,
        site_address,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        balance_amount,
        customer_id,
        customer_name,
        customer_vat,
        customer_brn,
        customer_address
      `)
      .eq("id", share.invoice_id)
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

    const { data: items, error: itemsErr } = await admin
      .from("invoice_items")
      .select(`
        id,
        invoice_id,
        description,
        qty,
        unit_price_excl_vat,
        vat_rate,
        vat_amount,
        line_total
      `)
      .eq("invoice_id", invoice.id)
      .order("id", { ascending: true });

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to load invoice items",
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        invoice,
        items: items ?? [],
        share: {
          token: share.token,
          expires_at: share.expires_at,
        },
      },
    });
  } catch (e: any) {
    return jsonError(500, {
      error: e?.message ?? "Internal error",
    });
  }
}