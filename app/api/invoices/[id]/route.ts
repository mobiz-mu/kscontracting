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

export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safeId = String(id ?? "").trim();

  if (!safeId) return jsonError(400, { error: "Missing invoice id" });
  if (!isUuid(safeId)) return jsonError(400, { error: "Invalid invoice id" });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, { error: "Unauthorized", supabaseError: safeError(uErr) });
    }

    const admin = createSupabaseAdminClient();

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select(`
        id,
        invoice_no,
        invoice_type,
        status,
        invoice_date,
        site_address,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        balance_amount,
        created_at,
        issued_at,
        customer_id,
        created_by
      `)
      .eq("id", safeId)
      .eq("created_by", userRes.user.id)
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

    let customer: any = null;
    if (invoice.customer_id != null) {
      const { data: cust, error: custErr } = await admin
        .from("customers")
        .select("id, name, brn, vat_no, address")
        .eq("id", invoice.customer_id)
        .maybeSingle();

      if (custErr) {
        return jsonError(500, {
          error: "Failed to load customer",
          supabaseError: safeError(custErr),
        });
      }

      customer = cust ?? null;
    }

    const { data: items, error: itemsErr } = await admin
      .from("invoice_items")
      .select("id, invoice_id, description, qty, unit_price_excl_vat, vat_rate, vat_amount, line_total")
      .eq("invoice_id", safeId)
      .order("id", { ascending: true });

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to load invoice items",
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          invoice: {
            ...invoice,
            customers: customer,
          },
          items: items ?? [],
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return jsonError(500, {
      error: "Failed to load invoice",
      details: e?.message ?? String(e),
    });
  }
}