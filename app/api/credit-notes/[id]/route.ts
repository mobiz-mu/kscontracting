import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safeId = String(id ?? "").trim();

  if (!safeId) return jsonError(400, { error: "Missing credit note id" });
  if (!isUuid(safeId)) return jsonError(400, { error: "Invalid credit note id" });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, { error: "Unauthorized", supabaseError: safeError(uErr) });
    }

    const admin = createSupabaseAdminClient();

    const { data: creditNote, error: noteErr } = await admin
      .from("credit_notes")
      .select(`
        id,
        credit_no,
        customer_name,
        credit_date,
        site_address,
        reason,
        notes,
        subtotal,
        vat,
        total_amount,
        status,
        created_at,
        issued_at,
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

    if (!creditNote) return jsonError(404, { error: "Credit note not found" });

    const { data: items, error: itemsErr } = await admin
      .from("credit_note_items")
      .select("id, credit_note_id, description, qty, price, total")
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
        credit_note: creditNote,
        items: items ?? [],
      },
    });
  } catch (e: any) {
    console.error("[GET /api/credit-notes/[id]] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}