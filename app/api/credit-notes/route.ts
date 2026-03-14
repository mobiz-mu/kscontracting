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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const customer_id = Number(body.customer_id);
    const credit_date = String(body.credit_date ?? "").trim();
    const reason = String(body.reason ?? "").trim() || null;
    const notes = String(body.notes ?? "").trim() || null;
    const invoice_id = body.invoice_id ? String(body.invoice_id).trim() : null;

    const items = Array.isArray(body.items) ? body.items : [];

    if (!Number.isFinite(customer_id) || customer_id <= 0) {
      return jsonError(400, { error: "customer_id is required" });
    }

    if (!credit_date) {
      return jsonError(400, { error: "credit_date is required" });
    }

    if (items.length === 0) {
      return jsonError(400, { error: "Credit note must contain items" });
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

    const itemsInsert = items
      .map((it: any) => {
        const qty = n2(it.qty);
        const price = n2(it.price);
        const description = String(it.description ?? "").trim();
        const total = round2(qty * price);
        subtotal += total;

        return { description, qty, price, total };
      })
      .filter((x: any) => x.description && x.qty > 0);

    if (itemsInsert.length === 0) {
      return jsonError(400, { error: "Add at least one valid credit note item" });
    }

    subtotal = round2(subtotal);
    const vat_amount = round2(subtotal * 0.15);
    const total_amount = round2(subtotal + vat_amount);

    const { data: creditNote, error: noteErr } = await admin
      .from("credit_notes")
      .insert({
        customer_id,
        invoice_id,
        credit_date,
        reason,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        applied_amount: 0,
        remaining_amount: total_amount,
        status: "DRAFT",
        created_by: userRes.user.id,
      })
      .select(`
        id,
        credit_no,
        customer_id,
        invoice_id,
        credit_date,
        reason,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        applied_amount,
        remaining_amount,
        status,
        created_at
      `)
      .single();

    if (noteErr) {
      return jsonError(500, {
        error: "Failed to create credit note",
        supabaseError: safeError(noteErr),
      });
    }

    const itemsPayload = itemsInsert.map((i: any) => ({
      credit_note_id: creditNote.id,
      ...i,
    }));

    const { error: itemsErr } = await admin
      .from("credit_note_items")
      .insert(itemsPayload);

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to insert credit note items",
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json({ ok: true, data: creditNote });
  } catch (e: any) {
    console.error("[POST /api/credit-notes] fatal", e);
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

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const status = (searchParams.get("status") ?? "ALL").toUpperCase();
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(200, Math.max(10, Number(searchParams.get("pageSize") ?? 25) || 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("credit_notes")
      .select(
        `
        id,
        credit_no,
        customer_id,
        invoice_id,
        credit_date,
        reason,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        applied_amount,
        remaining_amount,
        status,
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
      query = query.or(`credit_no.ilike.%${q}%,customers.name.ilike.%${q}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return jsonError(500, {
        error: "Failed to load credit notes",
        supabaseError: safeError(error),
      });
    }

    const rows =
      (data ?? []).map((r: any) => ({
        id: r.id,
        credit_no: r.credit_no,
        customer_id: r.customer_id ?? null,
        customer_name: r.customers?.name ?? null,
        invoice_id: r.invoice_id ?? null,
        credit_date: r.credit_date ?? null,
        reason: r.reason ?? null,
        notes: r.notes ?? null,
        subtotal: r.subtotal ?? 0,
        vat_amount: r.vat_amount ?? 0,
        total_amount: r.total_amount ?? 0,
        applied_amount: r.applied_amount ?? 0,
        remaining_amount: r.remaining_amount ?? 0,
        status: r.status ?? "DRAFT",
        created_at: r.created_at ?? null,
      })) ?? [];

    return NextResponse.json({
      ok: true,
      data: rows,
      meta: {
        page,
        pageSize,
        total: count ?? 0,
        hasMore: (count ?? 0) > to + 1,
      },
    });
  } catch (e: any) {
    console.error("[GET /api/credit-notes] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}