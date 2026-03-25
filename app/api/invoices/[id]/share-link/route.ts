import crypto from "node:crypto";
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safeId = String(id ?? "").trim();

  if (!safeId) return jsonError(400, { error: "Missing invoice id" });
  if (!isUuid(safeId)) return jsonError(400, { error: "Invalid invoice id" });

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

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("id, invoice_no, created_by")
      .eq("id", safeId)
      .eq("created_by", userRes.user.id)
      .maybeSingle();

    if (invErr) {
      return jsonError(500, {
        error: "Failed to load invoice",
        supabaseError: safeError(invErr),
      });
    }

    if (!invoice) {
      return jsonError(404, { error: "Invoice not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: insertErr } = await admin
      .from("invoice_share_tokens")
      .insert({
        invoice_id: invoice.id,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: userRes.user.id,
      });

    if (insertErr) {
      return jsonError(500, {
        error: "Failed to create share link",
        supabaseError: safeError(insertErr),
      });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    return NextResponse.json({
      ok: true,
      data: {
        token,
        share_url: `${appUrl}/share/invoice/${token}`,
        invoice_no: invoice.invoice_no,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Failed to create share link",
      details: e?.message ?? String(e),
    });
  }
}