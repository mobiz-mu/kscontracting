import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
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

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function parseTrailingNumber(value: string) {
  const m = String(value ?? "").match(/(\d+)\s*$/);
  return m ? Number(m[1]) : NaN;
}

async function generateNextInvoiceNo(admin: any) {
  const prefix = "PFI";

  const { data, error } = await admin
    .from("invoices")
    .select("invoice_no, invoice_type")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message || "Failed to generate invoice number");
  }

  const filtered = (data ?? []).filter((r: any) => {
    const t = String(r.invoice_type ?? "").toUpperCase();
    return t === "PRO_FORMA" || t === "PROFORMA";
  });

  let maxNo = 0;
  for (const row of filtered) {
    const n = parseTrailingNumber(row.invoice_no);
    if (Number.isFinite(n) && n > maxNo) maxNo = n;
  }

  return `${prefix}-${pad4(maxNo + 1)}`;
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const quotationId = String(id ?? "").trim();

    if (!quotationId) {
      return jsonError(400, { error: "Missing quotation id" });
    }

    if (!isUuid(quotationId)) {
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
    const body = await req.json().catch(() => ({}));

    const invoiceType = "PRO_FORMA";

    const requestedInvoiceNo =
      typeof body.invoice_no === "string" ? body.invoice_no.trim() : "";

    const requestedInvoiceDate =
      typeof body.invoice_date === "string" ? body.invoice_date.trim() : "";

    const requestedDueDate =
      typeof body.due_date === "string" ? body.due_date.trim() : "";

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
        site_address,
        vat_rate,
        created_by,
        converted_invoice_id
      `)
      .eq("id", quotationId)
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

    if (quote.converted_invoice_id) {
      return NextResponse.json({
        ok: true,
        alreadyConverted: true,
        data: {
          quotation_id: quote.id,
          invoice_id: quote.converted_invoice_id,
        },
      });
    }

    if (String(quote.status ?? "").toUpperCase() !== "ACCEPTED") {
      return jsonError(400, {
        error: "Only accepted quotations can be converted to Pro Forma invoice",
      });
    }

    if (!quote.customer_id || !Number.isFinite(Number(quote.customer_id))) {
      return jsonError(400, {
        error: "Quotation must have a valid linked customer_id before conversion",
      });
    }

    const { data: qItems, error: itemsErr } = await admin
      .from("quotation_items")
      .select(`
        id,
        description,
        qty,
        unit_price_excl_vat,
        vat_rate,
        vat_amount,
        line_total
      `)
      .eq("quotation_id", quotationId)
      .order("id", { ascending: true });

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to load quotation items",
        supabaseError: safeError(itemsErr),
      });
    }

    const items = qItems ?? [];

    if (items.length === 0) {
      return jsonError(400, { error: "Quotation has no items to convert" });
    }

    const invoiceDate = requestedInvoiceDate || quote.quote_date;
    const dueDate = requestedDueDate || quote.valid_until || null;

    if (!invoiceDate) {
      return jsonError(400, { error: "invoice_date is required for conversion" });
    }

    let invoiceNo = requestedInvoiceNo;
    if (!invoiceNo) {
      invoiceNo = await generateNextInvoiceNo(admin);
    }

    const invoicePayload: Record<string, any> = {
      invoice_no: invoiceNo,
      customer_id: Number(quote.customer_id),
      customer_name: quote.customer_name ?? null,
      customer_vat: quote.customer_vat ?? null,
      customer_brn: quote.customer_brn ?? null,
      customer_address: quote.customer_address ?? null,
      invoice_type: invoiceType,
      invoice_date: invoiceDate,
      due_date: dueDate,
      site_address: quote.site_address ?? null,
      status: "DRAFT",
      notes: quote.notes ?? null,
      subtotal: n2(quote.subtotal),
      vat_amount: n2(quote.vat_amount),
      total_amount: n2(quote.total_amount),
      paid_amount: 0,
      balance_amount: 0,
      created_by: userRes.user.id,
    };

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .insert(invoicePayload)
      .select(`
        id,
        invoice_no,
        customer_id,
        customer_name,
        customer_vat,
        customer_brn,
        customer_address,
        invoice_type,
        invoice_date,
        due_date,
        site_address,
        status,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        balance_amount,
        created_at,
        issued_at
      `)
      .single();

    if (invErr) {
      return jsonError(500, {
        error: "Failed to create Pro Forma invoice from quotation",
        supabaseError: safeError(invErr),
      });
    }

    const invoiceItemsPayload = items.map((item: any) => ({
      invoice_id: invoice.id,
      description: String(item.description ?? "").trim(),
      qty: n2(item.qty),
      unit_price_excl_vat: n2(item.unit_price_excl_vat),
      vat_rate: n2(item.vat_rate || quote.vat_rate || 0.15) || 0.15,
      vat_amount: n2(item.vat_amount),
      line_total: n2(item.line_total),
    }));

    const { error: invItemsErr } = await admin
      .from("invoice_items")
      .insert(invoiceItemsPayload);

    if (invItemsErr) {
      await admin.from("invoices").delete().eq("id", invoice.id);

      return jsonError(500, {
        error: "Pro Forma invoice created but failed to insert invoice items",
        invoice_id: invoice.id,
        supabaseError: safeError(invItemsErr),
      });
    }

    const { error: updQuoteErr } = await admin
      .from("quotations")
      .update({
        status: "ACCEPTED",
        converted_invoice_id: invoice.id,
      })
      .eq("id", quotationId)
      .eq("created_by", userRes.user.id);

    if (updQuoteErr) {
      return jsonError(500, {
        error: "Pro Forma invoice created but failed to update quotation conversion status",
        invoice_id: invoice.id,
        supabaseError: safeError(updQuoteErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        quotation_id: quotationId,
        invoice_id: invoice.id,
        invoice_no: invoice.invoice_no,
        invoice,
      },
    });
  } catch (e: any) {
    console.error("[POST /api/quotations/[id]/convert] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}