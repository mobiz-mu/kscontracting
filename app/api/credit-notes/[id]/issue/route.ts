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

export async function POST(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const safeId = String(id ?? "").trim();

    if (!safeId) return jsonError(400, { error: "Missing credit note id" });
    if (!isUuid(safeId)) return jsonError(400, { error: "Invalid credit note id" });

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, { error: "Unauthorized", supabaseError: safeError(userErr) });
    }

    const admin = createSupabaseAdminClient();

    const { data: existing, error: checkErr } = await admin
      .from("credit_notes")
      .select("id, credit_no, status, created_by")
      .eq("id", safeId)
      .maybeSingle();

    if (checkErr) {
      return jsonError(500, {
        error: "Failed to load credit note",
        supabaseError: safeError(checkErr),
      });
    }

    if (!existing) return jsonError(404, { error: "Credit note not found" });

    if (String(existing.created_by) !== String(userRes.user.id)) {
      return jsonError(403, { error: "Forbidden" });
    }

    if (String(existing.status ?? "").toUpperCase() === "ISSUED") {
      return NextResponse.json({ ok: true, data: existing, message: "Credit note already issued" });
    }

    const { data, error } = await admin
      .from("credit_notes")
      .update({
        status: "ISSUED",
        issued_at: new Date().toISOString(),
      })
      .eq("id", safeId)
      .eq("created_by", userRes.user.id)
      .select("id, credit_no, status, issued_at")
      .maybeSingle();

    if (error) {
      return jsonError(500, {
        error: "Failed to issue credit note",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error("[POST /api/credit-notes/[id]/issue] fatal", e);
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}