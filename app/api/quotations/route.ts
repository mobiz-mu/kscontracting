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
    const body = await req.json();

    const customer_name = String(body.customer_name ?? "").trim();
    const quote_date = body.quote_date ?? null;
    const valid_until = body.valid_until ?? null;

    const items = Array.isArray(body.items) ? body.items : [];

    if (!customer_name) {
      return jsonError(400, { error: "Customer name required" });
    }

    if (items.length === 0) {
      return jsonError(400, { error: "Quotation must contain items" });
    }

    /* ---------- Auth check ---------- */

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

    const admin = createSupabaseAdminClient();

    /* ---------- totals ---------- */

    let subtotal = 0;

    const itemsInsert = items.map((it: any) => {
      const qty = n2(it.qty);
      const price = n2(it.price);

      const total = round2(qty * price);

      subtotal += total;

      return {
        description: String(it.description ?? ""),
        qty,
        price,
        total,
      };
    });

    subtotal = round2(subtotal);

    /* ---------- insert quotation ---------- */

    const { data: quote, error: quoteErr } = await admin
      .from("quotations")
      .insert({
        customer_name,
        quote_date,
        valid_until,
        subtotal,
        total_amount: subtotal,
        status: "DRAFT",
        created_by: userRes.user.id,
      })
      .select("id, quote_no")
      .single();

    if (quoteErr) {
      return jsonError(500, {
        error: "Failed to create quotation",
        supabaseError: safeError(quoteErr),
      });
    }

    /* ---------- insert items ---------- */

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
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "ALL";

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("quotations")
      .select(
        `
        id,
        quote_no,
        customer_name,
        customer_id,
        quote_date,
        valid_until,
        status,
        total_amount,
        created_at
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) {
      query = query.or(
        `quote_no.ilike.%${q}%,customer_name.ilike.%${q}%`
      );
    }

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      return jsonError(500, {
        error: "Failed to load quotations",
        supabaseError: safeError(error),
      });
    }

    /* ---------- KPI ---------- */

    const { data: stats } = await admin
      .from("quotations")
      .select("status,total_amount");

    let totalValue = 0;

    const byStatus: Record<string, number> = {};

    for (const r of stats ?? []) {
      totalValue += n2(r.total_amount);

      const s = String(r.status ?? "UNKNOWN");

      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    const accepted = byStatus["ACCEPTED"] ?? 0;
    const expired = byStatus["EXPIRED"] ?? 0;
    const draft = byStatus["DRAFT"] ?? 0;
    const sent = byStatus["SENT"] ?? 0;

    return NextResponse.json({
      ok: true,
      data,

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