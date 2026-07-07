import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import {
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

function n2(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function normalizeMethod(v: unknown) {
  const raw = String(v ?? "").trim().toUpperCase();
  if (raw === "CASH") return "CASH";
  if (raw === "CHEQUE") return "CHEQUE";
  if (raw === "BANK_TRANSFER") return "BANK_TRANSFER";
  return "BANK_TRANSFER";
}

export async function POST(req: Request) {
  try {
    const authz = await requirePermission("payments.create");

    const body = await req.json().catch(() => ({}));
    const admin = createSupabaseAdminClient();

    const invoice_id = String(body.invoice_id ?? "").trim();
    const payment_date = String(body.payment_date ?? "").trim();
    const method = normalizeMethod(body.method);
    const reference_no =
      typeof body.reference_no === "string" ? body.reference_no.trim() || null : null;
    const notes =
      typeof body.notes === "string" ? body.notes.trim() || null : null;
    const amount = n2(body.amount);

    if (!invoice_id) {
      return jsonError(400, { error: "invoice_id is required" });
    }

    if (!payment_date) {
      return jsonError(400, { error: "payment_date is required" });
    }

    if (!(amount > 0)) {
      return jsonError(400, { error: "amount must be greater than 0" });
    }

    const { data: invoice, error: invoiceErr } = await admin
      .from("invoices")
      .select(`
        id,
        invoice_no,
        customer_id,
        customer_name,
        site_address,
        status,
        total_amount,
        paid_amount,
        balance_amount,
        created_by
      `)
      .eq("id", invoice_id)
      .maybeSingle();

    if (invoiceErr) {
      console.error("[payments]", invoiceErr);
      return jsonError(500, { error: "Failed to load invoice" });
    }

    if (!invoice) {
      return jsonError(404, { error: "Invoice not found" });
    }

    const invoiceStatus = String(invoice.status ?? "").toUpperCase();
    if (invoiceStatus === "VOID") {
      return jsonError(400, { error: "Cannot add a payment to a void invoice" });
    }
    if (invoiceStatus === "DRAFT") {
      return jsonError(400, {
        error: "Cannot add a payment to a draft invoice. Issue it first.",
      });
    }

    if (!invoice.customer_id) {
      return jsonError(400, {
        error: "This invoice has no linked customer_id. Payment requires a linked customer.",
      });
    }

    const { data: rpcResult, error: rpcErr } = await admin.rpc(
      "record_invoice_payment",
      {
        p_invoice_id: invoice_id,
        p_payment_date: payment_date,
        p_method: method,
        p_reference_no: reference_no,
        p_amount: amount,
        p_notes: notes,
        p_created_by: authz.userId,
      }
    );

    if (rpcErr) {
      const msg = String(rpcErr.message ?? "");
      if (msg.includes("INVOICE_NOT_FOUND")) {
        return jsonError(404, { error: "Invoice not found" });
      }
      if (msg.includes("INVOICE_VOID")) {
        return jsonError(400, { error: "Cannot add a payment to a void invoice" });
      }
      if (msg.includes("INVOICE_DRAFT")) {
        return jsonError(400, {
          error: "Cannot add a payment to a draft invoice. Issue it first.",
        });
      }
      if (msg.includes("INVOICE_ALREADY_PAID")) {
        return jsonError(400, { error: "Invoice is already fully paid" });
      }
      if (msg.includes("AMOUNT_EXCEEDS_BALANCE")) {
        return jsonError(400, { error: "Payment amount exceeds invoice balance" });
      }
      if (msg.includes("INVALID_AMOUNT")) {
        return jsonError(400, { error: "amount must be greater than 0" });
      }
      console.error("[payments]", rpcErr);
      return jsonError(500, { error: "Failed to record payment" });
    }

    const payment = rpcResult?.payment ?? {};

    return NextResponse.json({
      ok: true,
      data: {
        ...payment,
        invoice_no: invoice.invoice_no ?? null,
        customer_name: invoice.customer_name ?? null,
        site_address: invoice.site_address ?? null,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[POST /api/payments] fatal", e);
    return jsonError(500, { error: "Internal error" });
  }
}

export async function GET(req: Request) {
  try {
    await requirePermission("payments.view");

    const admin = createSupabaseAdminClient();
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const methodFilter = String(url.searchParams.get("method") ?? "ALL")
      .trim()
      .toUpperCase();

    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      200,
      Math.max(10, Number(url.searchParams.get("pageSize") ?? "25") || 25)
    );

    const { data: paymentBase, error: paymentErr } = await admin
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
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (paymentErr) {
      console.error("[payments]", paymentErr);
      return jsonError(500, { error: "Failed to load payments" });
    }

    type PaymentBaseRow = {
      id: string;
      invoice_id: string | null;
      customer_id: number | null;
      payment_date: string | null;
      method: string | null;
      reference_no: string | null;
      amount: number | null;
      notes: string | null;
      created_at: string | null;
    };

    const payments = (paymentBase ?? []) as PaymentBaseRow[];

    const invoiceIds = Array.from(
      new Set(
        payments
          .map((r) => String(r.invoice_id ?? "").trim())
          .filter(Boolean)
      )
    );

    const customerIds = Array.from(
      new Set(
        payments
          .map((r) => Number(r.customer_id))
          .filter((v) => Number.isFinite(v) && v > 0)
      )
    );

    let invoiceMap = new Map<
      string,
      { id: string; invoice_no: string | null; site_address: string | null }
    >();

    let customerMap = new Map<number, { id: number; name: string | null }>();

    if (invoiceIds.length > 0) {
      const { data: invoices, error: invErr } = await admin
        .from("invoices")
        .select("id, invoice_no, site_address")
        .in("id", invoiceIds);

      if (invErr) {
        console.error("[payments]", invErr);
      return jsonError(500, { error: "Failed to load payment invoices" });
      }

      invoiceMap = new Map(
        (invoices ?? []).map((r: { id: string | number; invoice_no: string | null; site_address: string | null }) => [
          String(r.id),
          {
            id: String(r.id),
            invoice_no: r.invoice_no ?? null,
            site_address: r.site_address ?? null,
          },
        ])
      );
    }

    if (customerIds.length > 0) {
      const { data: customers, error: custErr } = await admin
        .from("customers")
        .select("id, name")
        .in("id", customerIds);

      if (custErr) {
        console.error("[payments]", custErr);
      return jsonError(500, { error: "Failed to load payment customers" });
      }

      customerMap = new Map(
        (customers ?? []).map((r: { id: string | number; name: string | null }) => [
          Number(r.id),
          { id: Number(r.id), name: r.name ?? null },
        ])
      );
    }

    let rows = payments.map((r) => {
      const inv = invoiceMap.get(String(r.invoice_id));
      const cus = customerMap.get(Number(r.customer_id));

      return {
        id: r.id,
        invoice_id: r.invoice_id,
        invoice_no: inv?.invoice_no ?? null,
        customer_id: r.customer_id,
        customer_name: cus?.name ?? null,
        payment_date: r.payment_date,
        method: r.method,
        reference_no: r.reference_no ?? null,
        amount: r.amount ?? 0,
        description: r.notes ?? null,
        notes: r.notes ?? null,
        site_address: inv?.site_address ?? null,
        created_at: r.created_at,
      };
    });

    if (methodFilter !== "ALL") {
      rows = rows.filter(
        (r) => String(r.method ?? "").toUpperCase() === methodFilter
      );
    }

    if (q) {
      rows = rows.filter((r) => {
        const invoiceNo = String(r.invoice_no ?? "").toLowerCase();
        const customerName = String(r.customer_name ?? "").toLowerCase();
        const description = String(r.description ?? "").toLowerCase();
        const siteAddress = String(r.site_address ?? "").toLowerCase();
        const referenceNo = String(r.reference_no ?? "").toLowerCase();

        return (
          invoiceNo.includes(q) ||
          customerName.includes(q) ||
          description.includes(q) ||
          siteAddress.includes(q) ||
          referenceNo.includes(q)
        );
      });
    }

    const byMethod: Record<string, number> = {
      CASH: 0,
      CHEQUE: 0,
      BANK_TRANSFER: 0,
    };

    let totalAmount = 0;

    for (const r of rows) {
      const m = String(r.method ?? "").toUpperCase();
      byMethod[m] = (byMethod[m] ?? 0) + 1;
      totalAmount += n2(r.amount);
    }

    const total = rows.length;
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paged = rows.slice(from, to);

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
        totalPayments: total,
        totalAmount,
        byMethod,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[GET /api/payments] fatal", e);
    return jsonError(500, { error: "Internal error" });
  }
}