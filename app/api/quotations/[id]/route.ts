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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function normalizeStatus(v: any) {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "ACCEPTED") return "ACCEPTED";
  if (s === "VOID") return "VOID";
  return "DRAFT";
}

function isDraftStatus(v: any) {
  return String(v ?? "").trim().toUpperCase() === "DRAFT";
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
      .eq("created_by", userRes.user.id)
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

    const statusKey = String(quote.status ?? "DRAFT").toUpperCase();
    const isDraft = statusKey === "DRAFT";
    const isAccepted = statusKey === "ACCEPTED";
    const isVoid = statusKey === "VOID";
    const isConverted = !!quote.converted_invoice_id;

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
        customer_address:
          linkedCustomer?.address ?? quote.customer_address ?? null,

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

        can_edit_draft: isDraft && !isConverted && !isVoid,
        can_accept: isDraft && !isConverted && !isVoid,
        can_convert: isAccepted && !isConverted && !isVoid,

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

export async function PATCH(request: NextRequest, { params }: Ctx) {
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
    const body = await request.json().catch(() => ({}));

    const { data: existing, error: existingErr } = await admin
      .from("quotations")
      .select(`
        id,
        status,
        created_by,
        converted_invoice_id
      `)
      .eq("id", safeId)
      .eq("created_by", userRes.user.id)
      .maybeSingle();

    if (existingErr) {
      return jsonError(500, {
        error: "Failed to load quotation",
        supabaseError: safeError(existingErr),
      });
    }

    if (!existing) {
      return jsonError(404, { error: "Quotation not found" });
    }

    const currentStatus = String(existing.status ?? "DRAFT").toUpperCase();
    const nextStatus = normalizeStatus(body.status);

    if (existing.converted_invoice_id && nextStatus !== "VOID") {
      return jsonError(400, {
        error:
          "Converted quotations cannot be changed except voiding if your business allows it",
      });
    }

    if (currentStatus === "VOID" && nextStatus !== "VOID") {
      return jsonError(400, {
        error: "Void quotations cannot be changed",
      });
    }

    if (nextStatus === "ACCEPTED" && currentStatus !== "DRAFT") {
      return jsonError(400, {
        error: "Only draft quotations can be accepted",
      });
    }

    if (nextStatus === "DRAFT" && currentStatus !== "DRAFT") {
      return jsonError(400, {
        error: "Only draft quotations can remain draft",
      });
    }

    if (
      nextStatus === "VOID" &&
      currentStatus !== "DRAFT" &&
      currentStatus !== "ACCEPTED" &&
      currentStatus !== "VOID"
    ) {
      return jsonError(400, {
        error: "This quotation cannot be voided",
      });
    }

    const payload: Record<string, any> = {
      status: nextStatus,
    };

    const { data: updated, error: updateErr } = await admin
      .from("quotations")
      .update(payload)
      .eq("id", safeId)
      .eq("created_by", userRes.user.id)
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
        created_at,
        updated_at,
        converted_invoice_id
      `)
      .single();

    if (updateErr) {
      return jsonError(500, {
        error: "Failed to update quotation",
        supabaseError: safeError(updateErr),
      });
    }

    const updatedStatus = String(updated.status ?? "DRAFT").toUpperCase();
    const updatedIsDraft = updatedStatus === "DRAFT";
    const updatedIsAccepted = updatedStatus === "ACCEPTED";
    const updatedIsVoid = updatedStatus === "VOID";
    const updatedIsConverted = !!updated.converted_invoice_id;

    return NextResponse.json({
      ok: true,
      data: {
        ...updated,
        can_edit_draft: updatedIsDraft && !updatedIsConverted && !updatedIsVoid,
        can_accept: updatedIsDraft && !updatedIsConverted && !updatedIsVoid,
        can_convert: updatedIsAccepted && !updatedIsConverted && !updatedIsVoid,
      },
    });
  } catch (e: any) {
    console.error("[PATCH /api/quotations/[id]] fatal", e);
    return jsonError(500, {
      error: e?.message ?? "Internal error",
    });
  }
}