import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

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

export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const safeId = String(id ?? "").trim();

    if (!safeId) {
      return jsonError(400, { error: "Missing quotation id" });
    }

    if (!isUuid(safeId)) {
      return jsonError(400, { error: "Invalid quotation id" });
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

    const { data: quote, error: quoteErr } = await admin
      .from("quotations")
      .select(`
        id,
        quote_no,
        quotation_no,
        customer_id,
        customer_name,
        customer_vat,
        customer_brn,
        customer_address,
        quote_date,
        valid_until,
        status,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        vat_rate,
        site_address,
        created_by,
        created_at,
        updated_at,
        converted_invoice_id
      `)
      .eq("id", safeId)
      .maybeSingle();

    if (quoteErr) {
      return jsonError(500, {
        error: "Failed to load quotation",
        supabaseError: safeError(quoteErr),
      });
    }

    if (!quote) {
      return jsonError(404, { error: "Quotation not found" });
    }

    if (String(quote.created_by) !== String(userRes.user.id)) {
      return jsonError(403, { error: "Forbidden" });
    }

    let linkedCustomer: {
      id?: number;
      name?: string | null;
      vat_no?: string | null;
      brn?: string | null;
      address?: string | null;
    } | null = null;

    if (quote.customer_id) {
      const { data: customer, error: custErr } = await admin
        .from("customers")
        .select("id, name, vat_no, brn, address")
        .eq("id", quote.customer_id)
        .maybeSingle();

      if (custErr) {
        return jsonError(500, {
          error: "Failed to load quotation customer",
          supabaseError: safeError(custErr),
        });
      }

      linkedCustomer = customer ?? null;
    }

    const { data: items, error: itemsErr } = await admin
      .from("quotation_items")
      .select(`
        id,
        quotation_id,
        description,
        qty,
        unit_price_excl_vat,
        vat_rate,
        vat_amount,
        line_total
      `)
      .eq("quotation_id", safeId)
      .order("id", { ascending: true });

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to load quotation items",
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: quote.id,
        quote_no: quote.quote_no ?? quote.quotation_no ?? null,
        quotation_no: quote.quotation_no ?? quote.quote_no ?? null,

        customer_id: quote.customer_id ?? null,
        customer_name: linkedCustomer?.name ?? quote.customer_name ?? null,
        customer_vat: linkedCustomer?.vat_no ?? quote.customer_vat ?? null,
        customer_brn: linkedCustomer?.brn ?? quote.customer_brn ?? null,
        customer_address: linkedCustomer?.address ?? quote.customer_address ?? null,

        quote_date: quote.quote_date ?? null,
        valid_until: quote.valid_until ?? null,
        status: quote.status ?? "DRAFT",
        notes: quote.notes ?? null,

        subtotal: quote.subtotal ?? 0,
        vat_amount: quote.vat_amount ?? 0,
        total_amount: quote.total_amount ?? 0,
        vat_rate: quote.vat_rate ?? 0.15,

        site_address: quote.site_address ?? null,
        created_at: quote.created_at ?? null,
        updated_at: quote.updated_at ?? null,
        converted_invoice_id: quote.converted_invoice_id ?? null,

        items:
          (items ?? []).map((item: any) => ({
            id: item.id,
            quotation_id: item.quotation_id,
            description: item.description ?? "",
            qty: Number(item.qty ?? 0),
            unit_price_excl_vat: Number(item.unit_price_excl_vat ?? 0),
            vat_rate: Number(item.vat_rate ?? 0.15),
            vat_amount: Number(item.vat_amount ?? 0),
            line_total: Number(item.line_total ?? 0),

            // extra aliases so old UI pages still work
            price: Number(item.unit_price_excl_vat ?? 0),
            total: Number(item.line_total ?? 0),
          })) ?? [],
      },
    });
  } catch (e: any) {
    console.error("[GET /api/quotations/[id]] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}