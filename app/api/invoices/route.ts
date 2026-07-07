import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

function n2(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function qtyForCalc(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return 1;
  const x = Number(s);
  return Number.isFinite(x) ? x : 1;
}

function normalizeInvoiceType(v: unknown) {
  const s = String(v ?? "").trim().toUpperCase();

  if (s === "PRO_FORMA" || s === "PROFORMA") return "PRO_FORMA";
  if (s === "VAT_INVOICE" || s === "VAT") return "VAT_INVOICE";
  if (s === "STANDARD") return "STANDARD";

  return "VAT_INVOICE";
}

function normalizeStatus(v: unknown) {
  const raw = String(v ?? "").trim().toUpperCase();

  if (raw === "ALL") return "ALL";
  if (raw === "DRAFT") return "DRAFT";
  if (raw === "ISSUED") return "ISSUED";
  if (raw === "PAID") return "PAID";
  if (raw === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  if (raw === "VOID") return "VOID";

  return "DRAFT";
}

function pad4(n: number) {
  return String(Math.max(1, Math.floor(n))).padStart(4, "0");
}

function parseInvNo(inv: string) {
  const m = String(inv || "").match(/(\d{1,})$/);
  return m ? Number(m[1]) : NaN;
}

async function getNextFreeInvoiceNo(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  invoiceType: string,
  fallbackRequested?: string | null
) {
  const isProForma = invoiceType === "PRO_FORMA";
  const prefix = isProForma ? "PFI" : "INV";

  const { data: existingRows, error } = await admin
    .from("invoices")
    .select("invoice_no, invoice_type")
    .ilike("invoice_no", `${prefix}-%`);

  if (error) {
    throw new Error(
      error?.message ?? "Failed to inspect existing invoice numbers"
    );
  }

type InvoiceNoRow = { invoice_no: string | null; invoice_type: string | null };

  const filtered = ((existingRows ?? []) as InvoiceNoRow[]).filter((x) => {
    const type = String(x.invoice_type ?? "").toUpperCase();

    if (isProForma) {
      return type === "PRO_FORMA" || type === "PROFORMA";
    }

    return (
      type === "VAT_INVOICE" ||
      type === "VAT" ||
      type === "STANDARD"
    );
  });

  const nums = filtered
    .map((x) => parseInvNo(String(x.invoice_no ?? "")))
    .filter((n) => Number.isFinite(n)) as number[];

  const maxExisting = nums.length ? Math.max(...nums) : 0;

  const requestedNum = fallbackRequested ? parseInvNo(fallbackRequested) : NaN;
  const nextNum = Number.isFinite(requestedNum)
    ? Math.max(requestedNum, maxExisting + 1)
    : maxExisting + 1;

  return `${prefix}-${pad4(nextNum)}`;
}

async function bumpCompanySettingsCounter(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  invoiceType: string,
  invoiceNo: string
) {
  const parsed = parseInvNo(invoiceNo);
  if (!Number.isFinite(parsed)) return;

  if (invoiceType === "VAT_INVOICE" || invoiceType === "STANDARD") {
    await admin
      .from("company_settings")
      .update({ next_invoice_no: parsed + 1 })
      .eq("id", 1);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const requestedInvoiceNo = String(body.invoice_no ?? "").trim();
    const invoiceId = String(body.id ?? "").trim() || null;

    // Editing an existing invoice requires invoices.edit; creating a new one
    // requires invoices.create. A user with only one of these must not be
    // able to perform the other action through this shared endpoint.
    const authz = invoiceId
      ? await requirePermission("invoices.edit")
      : await requirePermission("invoices.create");

    const admin = createSupabaseAdminClient();

    const rawCustomerId = body.customer_id;
    const customerIdNum =
      rawCustomerId === null || rawCustomerId === undefined || rawCustomerId === ""
        ? null
        : Number(rawCustomerId);

    const customer_name =
      typeof body.customer_name === "string"
        ? body.customer_name.trim() || null
        : null;

    const customer_vat =
      typeof body.customer_vat === "string"
        ? body.customer_vat.trim() || null
        : null;

    const customer_brn =
      typeof body.customer_brn === "string"
        ? body.customer_brn.trim() || null
        : null;

    const customer_address =
      typeof body.customer_address === "string"
        ? body.customer_address.trim() || null
        : null;

    const invoice_date = String(body.invoice_date ?? "").trim();
    if (!invoice_date) {
      return jsonError(400, {
        error: "invoice_date is required (yyyy-mm-dd)",
      });
    }

    const hasCustomerId =
      Number.isFinite(customerIdNum as number) && (customerIdNum as number) > 0;
    const hasManualCustomer = !!customer_name;

    if (!hasCustomerId && !hasManualCustomer) {
      return jsonError(400, {
        error: "Either customer_id or customer_name is required",
      });
    }

    const invoice_type = normalizeInvoiceType(body.invoice_type);
    const status = normalizeStatus(body.status);

    const notes =
      typeof body.notes === "string" ? body.notes.trim() || null : null;

    const site_address =
      typeof body.site_address === "string"
        ? body.site_address.trim() || null
        : null;

    const due_date =
      typeof body.due_date === "string"
        ? body.due_date.trim() || null
        : null;

    const vat_rate = 0.15;

    type RawInvoiceItemInput = {
      description?: unknown;
      qty?: unknown;
      price?: unknown;
    };

    const rows: RawInvoiceItemInput[] = Array.isArray(body.rows) ? body.rows : [];
    const cleanRows = rows
      .map((r) => {
        const description = String(r.description ?? "").trim();
        const rawQty = String(r.qty ?? "").trim();
        const rawPrice = String(r.price ?? "").trim();

        return {
          description,
          qty: rawQty === "" ? 1 : qtyForCalc(r.qty),
          unit_price_excl_vat: n2(r.price),
          hasAnyValue:
            description.length > 0 || rawQty !== "" || rawPrice !== "",
        };
      })
      .filter(
        (r) => r.hasAnyValue && r.description.length > 0 && r.qty > 0
      );

    if (cleanRows.length === 0) {
      return jsonError(400, {
        error: "At least one invoice item is required.",
      });
    }

    const computedSubtotal = cleanRows.reduce(
      (s, r) => s + n2(r.qty) * n2(r.unit_price_excl_vat),
      0
    );
    const computedVat = computedSubtotal * vat_rate;
    const computedTotal = computedSubtotal + computedVat;

    const isProForma = invoice_type === "PRO_FORMA";

    const paid_amount = isProForma ? 0 : n2(body.paid_amount ?? 0);
    const balance_amount = isProForma
      ? 0
      : Math.max(0, computedTotal - paid_amount);

    let finalStatus = status;

    if (isProForma) {
      if (status === "VOID") {
        finalStatus = "VOID";
      } else {
        finalStatus = "ISSUED";
      }
    } else {
      if (status === "VOID") {
        finalStatus = "VOID";
      } else if (balance_amount <= 0 && computedTotal > 0) {
        finalStatus = "PAID";
      } else if (paid_amount > 0 && balance_amount > 0) {
        finalStatus = "PARTIALLY_PAID";
      }
    }

    let savedInvoice: Record<string, unknown> | null = null;

    if (!invoiceId) {
      let invoice_no =
        requestedInvoiceNo ||
        (await getNextFreeInvoiceNo(admin, invoice_type, requestedInvoiceNo));

      const basePayload = {
        customer_id: hasCustomerId ? customerIdNum : null,
        customer_name,
        customer_vat,
        customer_brn,
        customer_address,
        invoice_type,
        invoice_date,
        due_date,
        site_address,
        status: finalStatus,
        notes,
        subtotal: computedSubtotal,
        vat_amount: computedVat,
        total_amount: computedTotal,
        paid_amount,
        balance_amount,
        created_by: authz.userId,
      };

      let lastError: unknown = null;

      for (let attempt = 0; attempt < 6; attempt++) {
        const { data, error } = await admin
          .from("invoices")
          .insert({
            ...basePayload,
            invoice_no,
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
            due_date,
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

        if (!error) {
          savedInvoice = data;
          await bumpCompanySettingsCounter(admin, invoice_type, invoice_no);
          break;
        }

        lastError = error;

        const msg = String(error?.message ?? "").toLowerCase();
        const isDuplicate =
          msg.includes("duplicate key value") ||
          msg.includes("invoices_invoice_no_key") ||
          error?.code === "23505";

        if (!isDuplicate) {
          console.error("[invoices]", error);
          return jsonError(500, { error: "Failed to create invoice" });
        }

        invoice_no = await getNextFreeInvoiceNo(admin, invoice_type, invoice_no);
      }

      if (!savedInvoice) {
        console.error("[invoices]", lastError);
        return jsonError(500, { error: "Failed to create invoice" });
      }
    } else {
      const { data: existingInvoice, error: existingErr } = await admin
        .from("invoices")
        .select(`
          id,
          invoice_no,
          invoice_type,
          status,
          created_by
        `)
        .eq("id", invoiceId)
        .maybeSingle();

      if (existingErr) {
        console.error("[invoices/ts]", existingErr);
      return jsonError(500, { error: "Failed to load existing invoice" });
      }

      if (!existingInvoice) {
        return jsonError(404, {
          error: "Invoice not found",
        });
      }

      const existingStatus = String(existingInvoice.status ?? "").toUpperCase();
      if (existingStatus !== "DRAFT") {
        return jsonError(403, {
          error: "Only draft invoices can be edited",
        });
      }

      const invoice_no =
        requestedInvoiceNo || String(existingInvoice.invoice_no ?? "").trim();

      if (!invoice_no) {
        return jsonError(400, {
          error: "Invoice number is required for draft update",
        });
      }

      const invoicePayload = {
        invoice_no,
        customer_id: hasCustomerId ? customerIdNum : null,
        customer_name,
        customer_vat,
        customer_brn,
        customer_address,
        invoice_type,
        invoice_date,
        due_date,
        site_address,
        status: "DRAFT",
        notes,
        subtotal: computedSubtotal,
        vat_amount: computedVat,
        total_amount: computedTotal,
        paid_amount,
        balance_amount,
      };

      const { data, error } = await admin
        .from("invoices")
        .update(invoicePayload)
        .eq("id", invoiceId)
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
          created_at
        `)
        .single();

      if (error) {
        const msg = String(error?.message ?? "").toLowerCase();
        const isDuplicate =
          msg.includes("duplicate key value") ||
          msg.includes("invoices_invoice_no_key") ||
          error?.code === "23505";

        console.error("[invoices]", error);
        return jsonError(isDuplicate ? 409 : 500, {
          error: isDuplicate
            ? "Invoice number already exists"
            : "Failed to update invoice",
        });
      }

      savedInvoice = data;
    }

    const savedId = String(savedInvoice.id);

    const { error: delErr } = await admin
      .from("invoice_items")
      .delete()
      .eq("invoice_id", savedId);

    if (delErr) {
      console.error("[invoices]", delErr);
      return jsonError(500, {
        error: "Invoice saved but failed to clear existing items",
        invoice_id: savedId,
      });
    }

    const insertRows = cleanRows.map((x) => {
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
      .select(
        "id, invoice_id, description, qty, unit_price_excl_vat, vat_rate, vat_amount, line_total"
      )
      .order("id", { ascending: true });

    if (itemsErr) {
      console.error("[invoices]", itemsErr);
      return jsonError(500, {
        error: "Invoice saved but items insert failed",
        invoice_id: savedId,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        invoice: savedInvoice,
        items: itemsData ?? [],
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[POST /api/invoices] fatal", e);
    return jsonError(500, { error: "Internal error" });
  }
}

type InvoiceListRow = {
  id: string;
  invoice_no: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_vat: string | null;
  customer_brn: string | null;
  customer_address: string | null;
  invoice_type: string | null;
  invoice_date: string | null;
  due_date: string | null;
  site_address: string | null;
  status: string | null;
  notes: string | null;
  subtotal: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  paid_amount: number | null;
  credited_amount: number | null;
  balance_amount: number | null;
  created_at: string | null;
};

export async function GET(req: Request) {
  try {
    await requirePermission("invoices.view");

    const admin = createSupabaseAdminClient();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const rawStatus = normalizeStatus(url.searchParams.get("status") ?? "ALL");
    const customerIdFilter = url.searchParams.get("customerId");

    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      200,
      Math.max(10, Number(url.searchParams.get("pageSize") ?? "25") || 25)
    );

    let baseQuery = admin
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
        due_date,
        site_address,
        status,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        credited_amount,
        balance_amount,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (customerIdFilter) {
      const customerIdNum = Number(customerIdFilter);
      if (Number.isFinite(customerIdNum) && customerIdNum > 0) {
        baseQuery = baseQuery.eq("customer_id", customerIdNum);
      }
    }

    const { data: invoiceBase, error: baseErr } = await baseQuery;

    if (baseErr) {
      console.error("[GET /api/invoices] base invoices error", baseErr);
      console.error("[invoices/ts]", baseErr);
      return jsonError(500, { error: "Failed to load invoices" });
    }

    const invoices = invoiceBase ?? [];
    const customerIds = Array.from(
      new Set(
        invoices
          .map((r: InvoiceListRow) => Number(r.customer_id))
          .filter((v: number) => Number.isFinite(v) && v > 0)
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
        console.error("[invoices/ts]", custErr);
      return jsonError(500, { error: "Failed to load customers" });
      }

      customerMap = new Map(
        (customers ?? []).map((c: { id: number; name: string | null }) => [
          Number(c.id),
          { id: Number(c.id), name: c.name ?? null },
        ])
      );
    }

    const allRows = invoices.map((r: InvoiceListRow) => {
      const linkedCustomer = r.customer_id
        ? customerMap.get(Number(r.customer_id))
        : null;
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
        due_date: r.due_date ?? null,
        site_address: r.site_address ?? null,
        status: r.status,
        notes: r.notes ?? null,
        subtotal: r.subtotal,
        vat_amount: r.vat_amount,
        total_amount: r.total_amount,
        paid_amount: r.paid_amount,
        credited_amount: r.credited_amount ?? 0,
        balance_amount: r.balance_amount,
        created_at: r.created_at,
      };
    });

    let filtered = allRows;

    if (q) {
      const needle = q.toLowerCase();
      filtered = filtered.filter((r: InvoiceListRow) => {
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
        (r: InvoiceListRow) => String(r.status ?? "").toUpperCase() === rawStatus
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
    const totalValue = filtered.reduce(
      (s: number, r: InvoiceListRow) => s + n2(r.total_amount),
      0
    );

    const receivableVatInvoices = filtered.filter((r: InvoiceListRow) => {
      const type = String(r.invoice_type ?? "").toUpperCase();
      const status = String(r.status ?? "").toUpperCase();

      return (
        type === "VAT_INVOICE" &&
        !["DRAFT", "VOID"].includes(status)
      );
    });

    const totalOutstanding = receivableVatInvoices.reduce(
      (s: number, r: InvoiceListRow) => s + n2(r.balance_amount),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCount = receivableVatInvoices.filter((r: InvoiceListRow) => {
      const bal = n2(r.balance_amount);
      if (bal <= 0) return false;

      const baseDate = r.due_date || r.invoice_date;
      if (!baseDate) return false;

      const d = new Date(baseDate);
      if (Number.isNaN(d.getTime())) return false;

      d.setHours(0, 0, 0, 0);

      return d.getTime() < today.getTime();
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[GET /api/invoices] fatal", e);
    return jsonError(500, { error: "Internal error" });
  }
}