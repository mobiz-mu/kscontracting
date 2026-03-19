import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

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

function normalizeMethod(v: any) {
  const raw = String(v ?? "").trim().toUpperCase();
  if (raw === "CASH") return "CASH";
  if (raw === "CHEQUE") return "CHEQUE";
  if (raw === "BANK_TRANSFER") return "BANK_TRANSFER";
  return "BANK_TRANSFER";
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

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
        total_amount,
        paid_amount,
        balance_amount,
        created_by
      `)
      .eq("id", invoice_id)
      .maybeSingle();

    if (invoiceErr) {
      return jsonError(500, {
        error: "Failed to load invoice",
        supabaseError: safeError(invoiceErr),
      });
    }

    if (!invoice) {
      return jsonError(404, { error: "Invoice not found" });
    }

    if (String(invoice.created_by) !== String(userRes.user.id)) {
      return jsonError(403, { error: "Forbidden" });
    }

    if (!invoice.customer_id) {
      return jsonError(400, {
        error: "This invoice has no linked customer_id. Payment requires a linked customer.",
      });
    }

    const currentBalance = n2(invoice.balance_amount);
    if (amount > currentBalance && currentBalance > 0) {
      return jsonError(400, {
        error: `Payment amount exceeds invoice balance (${currentBalance.toFixed(2)})`,
      });
    }

    const { data: payment, error: payErr } = await admin
      .from("payments")
      .insert({
        invoice_id,
        customer_id: invoice.customer_id,
        payment_date,
        method,
        reference_no,
        amount,
        notes,
        created_by: userRes.user.id,
      })
      .select(`
        id,
        invoice_id,
        customer_id,
        payment_date,
        method,
        reference_no,
        amount,
        notes,
        created_at
      `)
      .single();

    if (payErr) {
      return jsonError(500, {
        error: "Failed to create payment",
        supabaseError: safeError(payErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...payment,
        invoice_no: invoice.invoice_no ?? null,
        customer_name: invoice.customer_name ?? null,
        site_address: invoice.site_address ?? null,
      },
    });
  } catch (e: any) {
    console.error("[POST /api/payments] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

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
      .eq("created_by", userRes.user.id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (paymentErr) {
      return jsonError(500, {
        error: "Failed to load payments",
        supabaseError: safeError(paymentErr),
      });
    }

    const payments = paymentBase ?? [];

    const invoiceIds = Array.from(
      new Set(
        payments
          .map((r: any) => String(r.invoice_id ?? "").trim())
          .filter(Boolean)
      )
    );

    const customerIds = Array.from(
      new Set(
        payments
          .map((r: any) => Number(r.customer_id))
          .filter((v: any) => Number.isFinite(v) && v > 0)
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
        return jsonError(500, {
          error: "Failed to load payment invoices",
          supabaseError: safeError(invErr),
        });
      }

      invoiceMap = new Map(
        (invoices ?? []).map((r: any) => [
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
        return jsonError(500, {
          error: "Failed to load payment customers",
          supabaseError: safeError(custErr),
        });
      }

      customerMap = new Map(
        (customers ?? []).map((r: any) => [
          Number(r.id),
          { id: Number(r.id), name: r.name ?? null },
        ])
      );
    }

    let rows = payments.map((r: any) => {
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
        (r: any) => String(r.method ?? "").toUpperCase() === methodFilter
      );
    }

    if (q) {
      rows = rows.filter((r: any) => {
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
  } catch (e: any) {
    console.error("[GET /api/payments] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}