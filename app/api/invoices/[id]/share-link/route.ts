import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import {
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
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
    const authz = await requirePermission("invoices.share");

    const admin = createSupabaseAdminClient();

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("id, invoice_no, created_by")
      .eq("id", safeId)
      .maybeSingle();

    if (invErr) {
      console.error("[invoices/[id]/share-link]", invErr);
      return jsonError(500, { error: "Failed to load invoice" });
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
        created_by: authz.userId,
      });

    if (insertErr) {
      console.error("[invoices/[id]/share-link]", insertErr);
      return jsonError(500, { error: "Failed to create share link" });
    }

    const appUrl = String(
     process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000"
     ).replace(/\/+$/, "");

    return NextResponse.json({
      ok: true,
      data: {
        token,
        share_url: `${appUrl}/public-invoice/${token}`,
        invoice_no: invoice.invoice_no,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[invoices/[id]/share-link]", e);
    return jsonError(500, { error: "Failed to create share link" });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safeId = String(id ?? "").trim();

  if (!safeId) return jsonError(400, { error: "Missing invoice id" });
  if (!isUuid(safeId)) return jsonError(400, { error: "Invalid invoice id" });

  try {
    await requirePermission("invoices.share");

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("invoice_share_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("invoice_id", safeId)
      .is("revoked_at", null);

    if (error) {
      console.error("[invoices/[id]/share-link DELETE]", error);
      return jsonError(500, { error: "Failed to revoke share link" });
    }

    return NextResponse.json({ ok: true, message: "Share link revoked" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[invoices/[id]/share-link DELETE]", e);
    return jsonError(500, { error: "Failed to revoke share link" });
  }
}