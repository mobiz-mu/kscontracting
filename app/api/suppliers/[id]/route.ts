import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import {
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = {
  params: Promise<{ id: string }>;
};

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

function parseSupplierId(value: string) {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supplierId = parseSupplierId(id);

    if (!supplierId) {
      return jsonError(400, { error: "Invalid supplier id" });
    }

    await requirePermission("contacts.view");

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("suppliers")
      .select(
        "id,name,brn,vat_no,email,phone,address,created_at"
      )
      .eq("id", supplierId)
      .maybeSingle();

    if (error) {
      console.error("[suppliers/[id]]", error);
      return jsonError(500, { error: "Failed to load supplier" });
    }

    if (!data) {
      return jsonError(404, { error: "Supplier not found" });
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[suppliers/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supplierId = parseSupplierId(id);

    if (!supplierId) {
      return jsonError(400, { error: "Invalid supplier id" });
    }

    await requirePermission("contacts.manage");

    const admin = createSupabaseAdminClient();
    const body = await req.json().catch(() => ({}));

    const name = String(body.name ?? "").trim();
    if (!name) {
      return jsonError(400, { error: "name is required" });
    }

    const payload = {
      name,
      brn: body.brn ? String(body.brn).trim() : null,
      vat_no: body.vat_no ? String(body.vat_no).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      address: body.address ? String(body.address).trim() : null,
    };

    const { data, error } = await admin
      .from("suppliers")
      .update(payload)
      .eq("id", supplierId)
      .select("id,name,brn,vat_no,email,phone,address,created_at")
      .single();

    if (error) {
      console.error("[suppliers/[id]]", error);
      return jsonError(500, { error: "Failed to update supplier" });
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[suppliers/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}