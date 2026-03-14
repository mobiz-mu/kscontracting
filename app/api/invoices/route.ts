import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

/**
 * Body from UI:
 * {
 *   id?: string,
 *   status?: "DRAFT" | "ISSUED",
 *   invoice_type?: "VAT_INVOICE" | "PRO_FORMA",
 *   invoice_date: string,
 *   customer_id: number,
 *   site_address?: string,
 *   notes?: string,
 *   rows: [{ description, qty, price }]
 * }
 */
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, { error: "Unauthorized", supabaseError: safeError(uErr) });
    }

    const body = await req.json().catch(() => ({}));
    const admin = createSupabaseAdminClient();

    // -----------------------------
    // Validate + normalize
    // -----------------------------
    const invoiceId = String(body.id ?? "").trim() || null;

    const customerIdNum = Number(body.customer_id);
    if (!Number.isFinite(customerIdNum) || customerIdNum <= 0) {
      return jsonError(400, { error: "customer_id (bigint) is required" });
    }

    const invoice_date = String(body.invoice_date ?? "").trim();
    if (!invoice_date) {
      return jsonError(400, { error: "invoice_date is required (yyyy-mm-dd)" });
    }

    const invoice_type =
      String(body.invoice_type ?? "VAT_INVOICE").toUpperCase() === "PRO_FORMA"
        ? "PRO_FORMA"
        : "VAT_INVOICE";

    const status = String(body.status ?? "DRAFT").toUpperCase();
    const notes = typeof body.notes === "string" ? body.notes : null;
    const site_address = typeof body.site_address === "string" ? body.site_address.trim() : null;

    // KS rule: VAT is fixed at 15%
    const vat_rate = 0.15;

    const rows = Array.isArray(body.rows) ? body.rows : [];
    const cleanRows = rows
      .map((r: any) => ({
        description: String(r.description ?? "").trim(),
        qty: n2(r.qty),
        unit_price_excl_vat: n2(r.price),
      }))
      .filter((r: any) => r.description.length > 0 && r.qty > 0);

    if (cleanRows.length === 0) {
      return jsonError(400, {
        error: "At least one invoice item (description + qty) is required.",
      });
    }

    // -----------------------------
    // Always compute totals server-side
    // -----------------------------
    const computedSubtotal = cleanRows.reduce(
      (s: number, r: any) => s + n2(r.qty) * n2(r.unit_price_excl_vat),
      0
    );
    const computedVat = computedSubtotal * vat_rate;
    const computedTotal = computedSubtotal + computedVat;

    const paid_amount = n2(body.paid_amount ?? 0);
    const balance_amount = Math.max(0, computedTotal - paid_amount);

    // -----------------------------
    // Create or update invoice
    // -----------------------------
    let savedInvoice: any = null;

    if (!invoiceId) {
      const { data, error } = await admin
        .from("invoices")
        .insert({
          customer_id: customerIdNum,
          invoice_type,
          invoice_date,
          site_address,
          status,
          notes,
          subtotal: computedSubtotal,
          vat_amount: computedVat,
          total_amount: computedTotal,
          paid_amount,
          balance_amount,
          created_by: userRes.user.id,
        })
        .select(
          `
          id,
          invoice_no,
          customer_id,
          invoice_type,
          invoice_date,
          site_address,
          status,
          notes,
          subtotal,
          vat_amount,
          total_amount,
          paid_amount,
          balance_amount,
          created_at
        `
        )
        .single();

      if (error) {
        return jsonError(500, {
          error: "Failed to create invoice",
          supabaseError: safeError(error),
        });
      }

      savedInvoice = data;
    } else {
      const { data, error } = await admin
        .from("invoices")
        .update({
          customer_id: customerIdNum,
          invoice_type,
          invoice_date,
          site_address,
          status,
          notes,
          subtotal: computedSubtotal,
          vat_amount: computedVat,
          total_amount: computedTotal,
          paid_amount,
          balance_amount,
        })
        .eq("id", invoiceId)
        .eq("created_by", userRes.user.id)
        .select(
          `
          id,
          invoice_no,
          customer_id,
          invoice_type,
          invoice_date,
          site_address,
          status,
          notes,
          subtotal,
          vat_amount,
          total_amount,
          paid_amount,
          balance_amount,
          created_at
        `
        )
        .single();

      if (error) {
        return jsonError(500, {
          error: "Failed to update invoice",
          supabaseError: safeError(error),
        });
      }

      savedInvoice = data;
    }

    const savedId = String(savedInvoice.id);

    // -----------------------------
    // Replace invoice_items
    // -----------------------------
    const { error: delErr } = await admin.from("invoice_items").delete().eq("invoice_id", savedId);

    if (delErr) {
      return jsonError(500, {
        error: "Invoice saved but failed to clear existing items",
        invoice_id: savedId,
        supabaseError: safeError(delErr),
      });
    }

    const insertRows = cleanRows.map((x: any) => {
      const base = n2(x.qty) * n2(x.unit_price_excl_vat);
      const vAmt = base * vat_rate;
      const lineTotal = base + vAmt;

      return {
        invoice_id: savedId,
        description: x.description,
        qty: x.qty,
        unit_price_excl_vat: x.unit_price_excl_vat,
        vat_rate,
        vat_amount: vAmt,
        line_total: lineTotal,
      };
    });

    const { data: itemsData, error: itemsErr } = await admin
      .from("invoice_items")
      .insert(insertRows)
      .select("id, invoice_id, description, qty, unit_price_excl_vat, vat_rate, vat_amount, line_total")
      .order("id", { ascending: true });

    if (itemsErr) {
      return jsonError(500, {
        error: "Invoice saved but items insert failed",
        invoice_id: savedId,
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        invoice: savedInvoice,
        items: itemsData ?? [],
      },
    });
  } catch (e: any) {
    console.error("[POST /api/invoices] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, { error: "Unauthorized", supabaseError: safeError(uErr) });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "ALL").toUpperCase();

    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get("pageSize") ?? "25") || 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_no,
        customer_id,
        invoice_type,
        invoice_date,
        site_address,
        status,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        balance_amount,
        created_at,
        customers:customer_id ( name )
      `,
        { count: "exact" }
      )
      .eq("created_by", userRes.user.id)
      .order("created_at", { ascending: false });

    if (status !== "ALL") query = query.eq("status", status);

    if (q) {
      query = query.or(`invoice_no.ilike.%${q}%,customers.name.ilike.%${q}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("[GET /api/invoices] supabase error", error);
      return jsonError(500, {
        error: "Supabase query failed",
        supabaseError: safeError(error),
      });
    }

    const rows =
      (data ?? []).map((r: any) => ({
        id: r.id,
        invoice_no: r.invoice_no,
        customer_id: r.customer_id,
        customer_name: r.customers?.name ?? null,
        invoice_type: r.invoice_type ?? "VAT_INVOICE",
        invoice_date: r.invoice_date ?? null,
        site_address: r.site_address ?? null,
        status: r.status,
        notes: r.notes ?? null,
        subtotal: r.subtotal,
        vat_amount: r.vat_amount,
        total_amount: r.total_amount,
        paid_amount: r.paid_amount,
        balance_amount: r.balance_amount,
        created_at: r.created_at,
      })) ?? [];

    return NextResponse.json({
      ok: true,
      data: rows,
      meta: {
        page,
        pageSize,
        total: count ?? rows.length,
        hasMore: typeof count === "number" ? to + 1 < count : rows.length === pageSize,
      },
    });
  } catch (e: any) {
    console.error("[GET /api/invoices] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}