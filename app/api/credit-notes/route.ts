import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type CleanCreditNoteItem = {
  description: string;
  qty: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
};

type CreditNoteListRow = {
  id: string;
  credit_no: string;
  customer_id: number | null;
  customer_name: string | null;
  invoice_id: string | null;
  credit_date: string | null;
  reason: string | null;
  notes: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  applied_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string | null;
};

function jsonError(status: number, payload: unknown) {
  return NextResponse.json({ ok: false, ...(payload as object) }, { status });
}

function safeError(err: any) {
  return {
    message: err?.message ?? "Unknown error",
    code: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  };
}

function n2(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function normalizeStatus(v: unknown) {
  const raw = String(v ?? "").trim().toUpperCase();
  if (raw === "DRAFT") return "DRAFT";
  if (raw === "ISSUED") return "ISSUED";
  if (raw === "VOID") return "VOID";
  return "DRAFT";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const customer_id = Number(body.customer_id);
    const credit_date = String(body.credit_date ?? "").trim();

    const reason =
      typeof body.reason === "string" ? body.reason.trim() || null : null;

    const notes =
      typeof body.notes === "string" ? body.notes.trim() || null : null;

    const invoice_id =
      typeof body.invoice_id === "string" && body.invoice_id.trim()
        ? body.invoice_id.trim()
        : null;

    const rows: unknown[] = Array.isArray(body.items) ? body.items : [];

    if (!Number.isFinite(customer_id) || customer_id <= 0) {
      return jsonError(400, { error: "customer_id is required" });
    }

    if (!credit_date) {
      return jsonError(400, { error: "credit_date is required" });
    }

    if (rows.length === 0) {
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

    const cleanItems: CleanCreditNoteItem[] = (rows as any[])
      .map((it: any): CleanCreditNoteItem => {
        const description = String(it.description ?? "").trim();
        const qty = n2(it.qty);
        const unit_price_excl_vat = n2(
          it.unit_price_excl_vat ?? it.price ?? 0
        );
        const vat_rate = 0.15;

        const base = round2(qty * unit_price_excl_vat);
        const vat_amount = round2(base * vat_rate);
        const line_total = round2(base + vat_amount);

        return {
          description,
          qty,
          unit_price_excl_vat,
          vat_rate,
          vat_amount,
          line_total,
        };
      })
      .filter((x: CleanCreditNoteItem): boolean => {
        return Boolean(x.description) && x.qty > 0;
      });

    if (cleanItems.length === 0) {
      return jsonError(400, {
        error: "Add at least one valid credit note item",
      });
    }

    const subtotal = round2(
      cleanItems.reduce((sum: number, item: CleanCreditNoteItem): number => {
        return sum + round2(item.qty * item.unit_price_excl_vat);
      }, 0)
    );

    const vat_amount = round2(
      cleanItems.reduce((sum: number, item: CleanCreditNoteItem): number => {
        return sum + item.vat_amount;
      }, 0)
    );

    const total_amount = round2(
      cleanItems.reduce((sum: number, item: CleanCreditNoteItem): number => {
        return sum + item.line_total;
      }, 0)
    );

    const status = normalizeStatus(body.status);

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
        status,
        created_by: userRes.user.id,
      })
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
        updated_at
      `
      )
      .single();

    if (noteErr) {
      return jsonError(500, {
        error: "Failed to create credit note",
        supabaseError: safeError(noteErr),
      });
    }

    const itemsPayload = cleanItems.map((item: CleanCreditNoteItem) => ({
      credit_note_id: creditNote.id,
      description: item.description,
      qty: item.qty,
      unit_price_excl_vat: item.unit_price_excl_vat,
      vat_rate: item.vat_rate,
      vat_amount: item.vat_amount,
      line_total: item.line_total,
    }));

    const { data: insertedItems, error: itemsErr } = await admin
      .from("credit_note_items")
      .insert(itemsPayload)
      .select(
        `
        id,
        credit_note_id,
        description,
        qty,
        unit_price_excl_vat,
        vat_rate,
        vat_amount,
        line_total
      `
      );

    if (itemsErr) {
      await admin.from("credit_notes").delete().eq("id", creditNote.id);

      return jsonError(500, {
        error: "Failed to insert credit note items",
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        credit_note: creditNote,
        items: insertedItems ?? [],
      },
    });
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
    const pageSize = Math.min(
      200,
      Math.max(10, Number(searchParams.get("pageSize") ?? 25) || 25)
    );
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
      query = query.or(`credit_no.ilike.%${q}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return jsonError(500, {
        error: "Failed to load credit notes",
        supabaseError: safeError(error),
      });
    }

    const mappedRows: CreditNoteListRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      credit_no: r.credit_no,
      customer_id: r.customer_id ?? null,
      customer_name: r.customers?.name ?? null,
      invoice_id: r.invoice_id ?? null,
      credit_date: r.credit_date ?? null,
      reason: r.reason ?? null,
      notes: r.notes ?? null,
      subtotal: n2(r.subtotal),
      vat_amount: n2(r.vat_amount),
      total_amount: n2(r.total_amount),
      applied_amount: n2(r.applied_amount),
      remaining_amount: n2(r.remaining_amount),
      status: r.status ?? "DRAFT",
      created_at: r.created_at ?? null,
    }));

    return NextResponse.json({
      ok: true,
      data: mappedRows,
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