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

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function normalizeStatus(v: any) {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "SENT") return "SENT";
  if (s === "ACCEPTED") return "ACCEPTED";
  if (s === "EXPIRED") return "EXPIRED";
  if (s === "ALL") return "ALL";
  return "DRAFT";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

    const admin = createSupabaseAdminClient();

    const quotationId = String(body.id ?? "").trim() || null;

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

    const quote_date = String(body.quote_date ?? "").trim();
    if (!quote_date) {
      return jsonError(400, { error: "quote_date is required" });
    }

    const valid_until =
      typeof body.valid_until === "string" && body.valid_until.trim()
        ? body.valid_until.trim()
        : null;

    const notes =
      typeof body.notes === "string" ? body.notes.trim() || null : null;

    const site_address =
      typeof body.site_address === "string"
        ? body.site_address.trim() || null
        : null;

    const hasCustomerId =
      Number.isFinite(customerIdNum as number) && (customerIdNum as number) > 0;

    const hasManualCustomer = !!customer_name;

    if (!hasCustomerId && !hasManualCustomer) {
      return jsonError(400, {
        error: "Either customer_id or customer_name is required",
      });
    }

    const status = normalizeStatus(body.status);
    const vatRate = 0.15;

    const items = Array.isArray(body.items) ? body.items : [];

    const cleanItems = items
      .map((it: any) => {
        const description = String(it.description ?? "").trim();
        const rawQty = String(it.qty ?? "").trim();
        const rawPrice = String(it.price ?? "").trim();

        return {
          description,
          qty: rawQty === "" ? 1 : n2(it.qty),
          unit_price_excl_vat: n2(it.price),
          hasAnyValue: description.length > 0 || rawQty !== "" || rawPrice !== "",
        };
      })
      .filter((it: any) => it.hasAnyValue && it.description.length > 0 && it.qty > 0);

    if (cleanItems.length === 0) {
      return jsonError(400, { error: "Quotation must contain at least one item" });
    }

    const subtotal = round2(
      cleanItems.reduce(
        (sum: number, it: any) => sum + n2(it.qty) * n2(it.unit_price_excl_vat),
        0
      )
    );

    const vatAmount = round2(subtotal * vatRate);
    const totalAmount = round2(subtotal + vatAmount);

    const quote_no = typeof body.quote_no === "string" ? body.quote_no.trim() || null : null;
    const quotation_no =
      typeof body.quotation_no === "string" ? body.quotation_no.trim() || null : null;

    const quotationPayload = {
      quote_no,
      quotation_no,
      customer_id: hasCustomerId ? customerIdNum : null,
      customer_name,
      customer_vat,
      customer_brn,
      customer_address,
      quote_date,
      valid_until,
      notes,
      site_address,
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      vat_rate: vatRate,
      status,
    };

    let savedQuote: any = null;

    if (!quotationId) {
      const { data, error } = await admin
        .from("quotations")
        .insert({
          ...quotationPayload,
          created_by: userRes.user.id,
        })
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
          created_at
        `)
        .single();

      if (error) {
        return jsonError(500, {
          error: "Failed to create quotation",
          supabaseError: safeError(error),
        });
      }

      savedQuote = data;
    } else {
      const { data, error } = await admin
        .from("quotations")
        .update(quotationPayload)
        .eq("id", quotationId)
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
          created_at
        `)
        .single();

      if (error) {
        return jsonError(500, {
          error: "Failed to update quotation",
          supabaseError: safeError(error),
        });
      }

      savedQuote = data;
    }

    const savedId = String(savedQuote.id);

    const { error: delErr } = await admin
      .from("quotation_items")
      .delete()
      .eq("quotation_id", savedId);

    if (delErr) {
      return jsonError(500, {
        error: "Quotation saved but failed to clear existing items",
        quotation_id: savedId,
        supabaseError: safeError(delErr),
      });
    }

    const itemsPayload = cleanItems.map((it: any) => {
      const base = round2(n2(it.qty) * n2(it.unit_price_excl_vat));
      const vat_amount = round2(base * vatRate);
      const line_total = round2(base + vat_amount);

      return {
        quotation_id: savedId,
        description: it.description,
        qty: it.qty,
        unit_price_excl_vat: it.unit_price_excl_vat,
        vat_rate: vatRate,
        vat_amount,
        line_total,
      };
    });

    const { data: itemsData, error: itemsErr } = await admin
      .from("quotation_items")
      .insert(itemsPayload)
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
      .order("id", { ascending: true });

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to insert quotation items",
        quotation_id: savedId,
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        quotation: savedQuote,
        items: itemsData ?? [],
      },
    });
  } catch (e: any) {
    console.error("[POST /api/quotations] fatal", e);
    return jsonError(500, {
      error: e?.message ?? "Internal error",
    });
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

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const status = normalizeStatus(searchParams.get("status") ?? "ALL");

    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(200, Math.max(10, Number(searchParams.get("pageSize") ?? 25) || 25));

    const admin = createSupabaseAdminClient();

    const { data: quoteBase, error: baseErr } = await admin
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
        created_at
      `)
      .eq("created_by", userRes.user.id)
      .order("created_at", { ascending: false });

    if (baseErr) {
      return jsonError(500, {
        error: "Failed to load quotations",
        supabaseError: safeError(baseErr),
      });
    }

    let filtered = quoteBase ?? [];

    if (q) {
      const needle = q.toLowerCase();
      filtered = filtered.filter((r: any) => {
        const quoteNo = String(r.quote_no ?? r.quotation_no ?? "").toLowerCase();
        const customerName = String(r.customer_name ?? "").toLowerCase();
        const siteAddress = String(r.site_address ?? "").toLowerCase();

        return (
          quoteNo.includes(needle) ||
          customerName.includes(needle) ||
          siteAddress.includes(needle)
        );
      });
    }

    if (status !== "ALL") {
      filtered = filtered.filter(
        (r: any) => String(r.status ?? "").toUpperCase() === status
      );
    }

    const byStatus: Record<string, number> = {
      DRAFT: 0,
      SENT: 0,
      ACCEPTED: 0,
      EXPIRED: 0,
    };

    for (const r of filtered) {
      const s = String(r.status ?? "").toUpperCase();
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    const totalQuotes = filtered.length;
    const totalValue = filtered.reduce((s: number, r: any) => s + n2(r.total_amount), 0);

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
        totalQuotes,
        totalValue,
        pendingCount: (byStatus.DRAFT ?? 0) + (byStatus.SENT ?? 0),
        acceptedCount: byStatus.ACCEPTED ?? 0,
        expiredCount: byStatus.EXPIRED ?? 0,
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