import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safeId = String(id ?? "").trim();

  if (!safeId) {
    return jsonError(400, { error: "Missing credit note id" });
  }

  if (!isUuid(safeId)) {
    return jsonError(400, { error: "Invalid credit note id" });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

    const admin = createSupabaseAdminClient();

    const { data: creditNote, error: noteErr } = await admin
      .from("credit_notes")
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
        created_at,
        updated_at,
        voided_at,
        void_reason,
        created_by
      `)
      .eq("id", safeId)
      .eq("created_by", userRes.user.id)
      .maybeSingle();

    if (noteErr) {
      return jsonError(500, {
        error: "Failed to load credit note",
        supabaseError: safeError(noteErr),
      });
    }

    if (!creditNote) {
      return jsonError(404, { error: "Credit note not found" });
    }

    let customer: {
      id: number;
      name: string | null;
      vat_no: string | null;
      brn: string | null;
      address: string | null;
    } | null = null;

    if (creditNote.customer_id) {
      const { data: customerData, error: customerErr } = await admin
        .from("customers")
        .select("id, name, vat_no, brn, address")
        .eq("id", creditNote.customer_id)
        .maybeSingle();

      if (customerErr) {
        return jsonError(500, {
          error: "Failed to load credit note customer",
          supabaseError: safeError(customerErr),
        });
      }

      customer = customerData ?? null;
    }

    const { data: items, error: itemsErr } = await admin
      .from("credit_note_items")
      .select(`
        id,
        credit_note_id,
        description,
        qty,
        unit_price_excl_vat,
        vat_rate,
        vat_amount,
        line_total
      `)
      .eq("credit_note_id", safeId)
      .order("id", { ascending: true });

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to load credit note items",
        supabaseError: safeError(itemsErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        credit_note: {
          id: creditNote.id,
          credit_no: creditNote.credit_no,
          customer_id: creditNote.customer_id ?? null,
          customer_name: customer?.name ?? null,
          customer_vat: customer?.vat_no ?? null,
          customer_brn: customer?.brn ?? null,
          customer_address: customer?.address ?? null,
          invoice_id: creditNote.invoice_id ?? null,
          credit_date: creditNote.credit_date ?? null,
          reason: creditNote.reason ?? null,
          notes: creditNote.notes ?? null,
          subtotal: creditNote.subtotal ?? 0,
          vat_amount: creditNote.vat_amount ?? 0,
          total_amount: creditNote.total_amount ?? 0,
          applied_amount: creditNote.applied_amount ?? 0,
          remaining_amount: creditNote.remaining_amount ?? 0,
          status: creditNote.status ?? "DRAFT",
          created_at: creditNote.created_at ?? null,
          updated_at: creditNote.updated_at ?? null,
          voided_at: creditNote.voided_at ?? null,
          void_reason: creditNote.void_reason ?? null,
        },
        items: (items ?? []).map((item: any) => ({
          id: item.id,
          credit_note_id: item.credit_note_id,
          description: item.description,
          qty: item.qty ?? 0,
          unit_price_excl_vat: item.unit_price_excl_vat ?? 0,
          vat_rate: item.vat_rate ?? 0.15,
          vat_amount: item.vat_amount ?? 0,
          line_total: item.line_total ?? 0,

          // fallback aliases for older UI pieces if needed
          price: item.unit_price_excl_vat ?? 0,
          total: item.line_total ?? 0,
        })),
      },
    });
  } catch (e: any) {
    console.error("[GET /api/credit-notes/[id]] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}