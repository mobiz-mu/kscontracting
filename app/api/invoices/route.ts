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

function qtyForCalc(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return 1;
  const x = Number(s);
  return Number.isFinite(x) ? x : 1;
}

function normalizeInvoiceType(v: any) {
  const s = String(v ?? "").trim().toUpperCase();

  if (s === "PRO_FORMA" || s === "PROFORMA") return "PRO_FORMA";
  if (s === "VAT_INVOICE" || s === "VAT") return "VAT_INVOICE";
  if (s === "STANDARD") return "STANDARD";

  return "VAT_INVOICE";
}

function normalizeStatus(v: any) {
  const raw = String(v ?? "").trim().toUpperCase();

  if (raw === "ALL") return "ALL";
  if (raw === "DRAFT") return "DRAFT";
  if (raw === "ISSUED") return "ISSUED";
  if (raw === "PAID") return "PAID";
  if (raw === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  if (raw === "VOID") return "VOID";

  return "DRAFT";
}

/**
 * Body from UI:
 * {
 *   id?: string,
 *   status?: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "VOID",
 *   invoice_type?: "STANDARD" | "VAT" | "PROFORMA" | legacy values,
 *   invoice_date: string,
 *   customer_id?: number | null,
 *   customer_name?: string | null,
 *   customer_vat?: string | null,
 *   customer_brn?: string | null,
 *   customer_address?: string | null,
 *   site_address?: string | null,
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

    const invoice_no = String(body.invoice_no ?? "").trim();
    if (!invoice_no) {
      return jsonError(400, { error: "invoice_no is required" });
    }

    const invoiceId = String(body.id ?? "").trim() || null;

    const rawCustomerId = body.customer_id;
    const customerIdNum =
      rawCustomerId === null || rawCustomerId === undefined || rawCustomerId === ""
        ? null
        : Number(rawCustomerId);

    const customer_name =
      typeof body.customer_name === "string" ? body.customer_name.trim() || null : null;

    const customer_vat =
      typeof body.customer_vat === "string" ? body.customer_vat.trim() || null : null;

    const customer_brn =
      typeof body.customer_brn === "string" ? body.customer_brn.trim() || null : null;

    const customer_address =
      typeof body.customer_address === "string" ? body.customer_address.trim() || null : null;

    const invoice_date = String(body.invoice_date ?? "").trim();
    if (!invoice_date) {
      return jsonError(400, { error: "invoice_date is required (yyyy-mm-dd)" });
    }

    const hasCustomerId = Number.isFinite(customerIdNum as number) && (customerIdNum as number) > 0;
    const hasManualCustomer = !!customer_name;

    if (!hasCustomerId && !hasManualCustomer) {
      return jsonError(400, {
        error: "Either customer_id or customer_name is required",
      });
    }

    const invoice_type = normalizeInvoiceType(body.invoice_type);
    const status = normalizeStatus(body.status);

    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    const site_address =
      typeof body.site_address === "string" ? body.site_address.trim() || null : null;

    const vat_rate = 0.15;

    const rows = Array.isArray(body.rows) ? body.rows : [];
    const cleanRows = rows
    .map((r: any) => {
    const description = String(r.description ?? "").trim();
    const rawQty = String(r.qty ?? "").trim();
    const rawPrice = String(r.price ?? "").trim();

    return {
      description,
      qty: rawQty === "" ? 1 : qtyForCalc(r.qty),
      unit_price_excl_vat: n2(r.price),
      hasAnyValue: description.length > 0 || rawQty !== "" || rawPrice !== "",
    };
  })
  .filter((r: any) => r.hasAnyValue && r.description.length > 0 && r.qty > 0);

if (cleanRows.length === 0) {
  return jsonError(400, {
    error: "At least one invoice item is required.",
  });
}

    const computedSubtotal = cleanRows.reduce(
      (s: number, r: any) => s + n2(r.qty) * n2(r.unit_price_excl_vat),
      0
    );
    const computedVat = computedSubtotal * vat_rate;
    const computedTotal = computedSubtotal + computedVat;

    const paid_amount = n2(body.paid_amount ?? 0);
    const balance_amount = Math.max(0, computedTotal - paid_amount);

    let finalStatus = status;
    if (balance_amount <= 0 && computedTotal > 0) {
      finalStatus = "PAID";
    } else if (paid_amount > 0 && balance_amount > 0) {
      finalStatus = "PARTIALLY_PAID";
    }

    let savedInvoice: any = null;

    const invoicePayload = {
      invoice_no,
      customer_id: hasCustomerId ? customerIdNum : null,
      customer_name,
      customer_vat,
      customer_brn,
      customer_address,
      invoice_type,
      invoice_date,
      site_address,
      status: finalStatus,
      notes,
      subtotal: computedSubtotal,
      vat_amount: computedVat,
      total_amount: computedTotal,
      paid_amount,
      balance_amount,
    };

    if (!invoiceId) {
      const { data, error } = await admin
        .from("invoices")
        .insert({
          ...invoicePayload,
          created_by: userRes.user.id,
        })
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
          site_address,
          status,
          notes,
          subtotal,
          vat_amount,
          total_amount,
          paid_amount,
          balance_amount,
          created_at
        `)
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
        .update(invoicePayload)
        .eq("id", invoiceId)
        .eq("created_by", userRes.user.id)
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
          site_address,
          status,
          notes,
          subtotal,
          vat_amount,
          total_amount,
          paid_amount,
          balance_amount,
          created_at
        `)
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

    const admin = createSupabaseAdminClient();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const rawStatus = normalizeStatus(url.searchParams.get("status") ?? "ALL");

    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      200,
      Math.max(10, Number(url.searchParams.get("pageSize") ?? "25") || 25)
    );

    const { data: invoiceBase, error: baseErr } = await admin
      .from("invoices")
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
        site_address,
        status,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        balance_amount,
        created_at
      `)
      .eq("created_by", userRes.user.id)
      .order("created_at", { ascending: false });

    if (baseErr) {
      console.error("[GET /api/invoices] base invoices error", baseErr);
      return jsonError(500, {
        error: "Failed to load invoices",
        supabaseError: safeError(baseErr),
      });
    }

    const invoices = invoiceBase ?? [];
    const customerIds = Array.from(
      new Set(
        invoices
          .map((r: any) => Number(r.customer_id))
          .filter((v: any) => Number.isFinite(v) && v > 0)
      )
    );

    let customerMap = new Map<number, { id: number; name: string | null }>();

    if (customerIds.length > 0) {
      const { data: customers, error: custErr } = await admin
        .from("customers")
        .select("id, name")
        .in("id", customerIds);

      if (custErr) {
        console.error("[GET /api/invoices] customers error", custErr);
        return jsonError(500, {
          error: "Failed to load customers",
          supabaseError: safeError(custErr),
        });
      }

      customerMap = new Map(
        (customers ?? []).map((c: any) => [Number(c.id), { id: Number(c.id), name: c.name ?? null }])
      );
    }

    const allRows = invoices.map((r: any) => {
      const linkedCustomer = r.customer_id ? customerMap.get(Number(r.customer_id)) : null;
      const resolvedName = linkedCustomer?.name ?? r.customer_name ?? null;

      return {
        id: r.id,
        invoice_no: r.invoice_no,
        customer_id: r.customer_id,
        customer_name: resolvedName,
        customer_vat: r.customer_vat ?? null,
        customer_brn: r.customer_brn ?? null,
        customer_address: r.customer_address ?? null,
        invoice_type: r.invoice_type ?? "STANDARD",
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
      };
    });

    let filtered = allRows;

    if (q) {
      const needle = q.toLowerCase();
      filtered = filtered.filter((r: any) => {
        const invoiceNo = String(r.invoice_no ?? "").toLowerCase();
        const customerName = String(r.customer_name ?? "").toLowerCase();
        const siteAddress = String(r.site_address ?? "").toLowerCase();
        return (
          invoiceNo.includes(needle) ||
          customerName.includes(needle) ||
          siteAddress.includes(needle)
        );
      });
    }

    if (rawStatus !== "ALL") {
      filtered = filtered.filter(
        (r: any) => String(r.status ?? "").toUpperCase() === rawStatus
      );
    }

    const byStatus: Record<string, number> = {
      DRAFT: 0,
      ISSUED: 0,
      PAID: 0,
      PARTIALLY_PAID: 0,
      VOID: 0,
    };

    for (const r of filtered) {
      const s = String(r.status ?? "").toUpperCase();
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    const totalInvoices = filtered.length;
    const totalValue = filtered.reduce((s: number, r: any) => s + n2(r.total_amount), 0);
    const totalOutstanding = filtered.reduce((s: number, r: any) => s + n2(r.balance_amount), 0);

    const today = new Date();
    const overdueCount = filtered.filter((r: any) => {
      const bal = n2(r.balance_amount);
      if (bal <= 0) return false;
      if (!r.invoice_date) return false;

      const d = new Date(r.invoice_date);
      if (Number.isNaN(d.getTime())) return false;

      return d < today && !["PAID", "VOID"].includes(String(r.status ?? "").toUpperCase());
    }).length;

    const total = filtered.length;
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paged = filtered.slice(from, to);

    return NextResponse.json({
      ok: true,
      data: paged,
      meta: {
        page,
        pageSize,
        total,
        hasMore: to < total,
      },
      kpi: {
        totalInvoices,
        totalValue,
        totalOutstanding,
        overdueCount,
        byStatus,
      },
    });
  } catch (e: any) {
    console.error("[GET /api/invoices] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}