import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

/* ---------------------------------------
Helpers
--------------------------------------- */

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

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* =========================================
POST → Create quotation
========================================= */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const customer_id = Number(body.customer_id);
    const quote_date = body.quote_date ?? null;
    const valid_until = body.valid_until ?? null;
    const notes =
      typeof body.notes === "string" ? body.notes.trim() || null : null;
    const site_address =
      typeof body.site_address === "string"
        ? body.site_address.trim() || null
        : null;

    const items = Array.isArray(body.items) ? body.items : [];

    if (!Number.isFinite(customer_id) || customer_id <= 0) {
      return jsonError(400, { error: "customer_id is required" });
    }

    if (items.length === 0) {
      return jsonError(400, { error: "Quotation must contain items" });
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

    let subtotal = 0;

    const itemsInsert = items.map((it: any) => {
      const qty = n2(it.qty);
      const price = n2(it.price);
      const total = round2(qty * price);

      subtotal += total;

      return {
        description: String(it.description ?? "").trim(),
        qty,
        price,
        total,
      };
    });

    subtotal = round2(subtotal);

    const vatRate = 0.15;
    const vatAmount = round2(subtotal * vatRate);
    const totalAmount = round2(subtotal + vatAmount);

    const { data: quote, error: quoteErr } = await admin
      .from("quotations")
      .insert({
        customer_id,
        quote_date,
        valid_until,
        notes,
        site_address,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        vat_rate: vatRate,
        status: "DRAFT",
        created_by: userRes.user.id,
      })
      .select(`
        id,
        quote_no,
        customer_id,
        quote_date,
        valid_until,
        status,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        site_address,
        created_at
      `)
      .single();

    if (quoteErr) {
      return jsonError(500, {
        error: "Failed to create quotation",
        supabaseError: safeError(quoteErr),
      });
    }

    const itemsPayload = itemsInsert.map((i: any) => ({
      quotation_id: quote.id,
      ...i,
    }));

    const { error: itemsErr } = await admin
      .from("quotation_items")
      .insert(itemsPayload);

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to insert quotation items",
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: quote,
    });
  } catch (e: any) {
    console.error("[POST /api/quotations] fatal", e);

    return jsonError(500, {
      error: e?.message ?? "Internal error",
    });
  }
}

/* =========================================
GET → List quotations
========================================= */

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

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") ?? "").trim();
    const status = (searchParams.get("status") ?? "ALL").toUpperCase();

    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(
      200,
      Math.max(10, Number(searchParams.get("pageSize") ?? 25) || 25)
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("quotations")
      .select(
        `
        id,
        quote_no,
        customer_id,
        quote_date,
        valid_until,
        status,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        site_address,
        created_at,
        customers:customer_id (
          name
        )
      `,
        { count: "exact" }
      )
      .eq("created_by", userRes.user.id)
      .order("created_at", { ascending: false });

    if (status !== "ALL") {
      query = query.eq("status", status);
    }

    if (q) {
      query = query.or(`quote_no.ilike.%${q}%,customers.name.ilike.%${q}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return jsonError(500, {
        error: "Failed to load quotations",
        supabaseError: safeError(error),
      });
    }

    const rows =
      (data ?? []).map((r: any) => ({
        id: r.id,
        quote_no: r.quote_no,
        customer_id: r.customer_id ?? 0,
        customer_name: r.customers?.name ?? null,
        quote_date: r.quote_date ?? null,
        valid_until: r.valid_until ?? null,
        status: r.status ?? "DRAFT",
        notes: r.notes ?? null,
        subtotal: r.subtotal ?? 0,
        vat_amount: r.vat_amount ?? 0,
        total_amount: r.total_amount ?? 0,
        site_address: r.site_address ?? null,
        created_at: r.created_at ?? null,
      })) ?? [];

    const { data: stats, error: statsErr } = await admin
      .from("quotations")
      .select("status,total_amount")
      .eq("created_by", userRes.user.id);

    if (statsErr) {
      return jsonError(500, {
        error: "Failed to load quotation KPIs",
        supabaseError: safeError(statsErr),
      });
    }

    let totalValue = 0;
    const byStatus: Record<string, number> = {};

    for (const r of stats ?? []) {
      totalValue += n2(r.total_amount);
      const s = String(r.status ?? "UNKNOWN").toUpperCase();
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    const accepted = byStatus["ACCEPTED"] ?? 0;
    const expired = byStatus["EXPIRED"] ?? 0;
    const draft = byStatus["DRAFT"] ?? 0;
    const sent = byStatus["SENT"] ?? 0;

    return NextResponse.json({
      ok: true,
      data: rows,
      meta: {
        page,
        pageSize,
        total: count ?? 0,
        hasMore: (count ?? 0) > to + 1,
      },
      kpi: {
        totalQuotes: stats?.length ?? 0,
        totalValue,
        pendingCount: draft + sent,
        acceptedCount: accepted,
        expiredCount: expired,
        byStatus,
      },
    });
  } catch (e: any) {
    console.error("[GET /api/quotations] fatal", e);

    return jsonError(500, {
      error: e?.message ?? "Internal error",
    });
  }
}