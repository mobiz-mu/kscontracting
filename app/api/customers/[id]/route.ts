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

function parseCustomerId(value: string) {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const customerId = parseCustomerId(id);

    if (!customerId) {
      return jsonError(400, { error: "Invalid customer id" });
    }

    await requirePermission("contacts.view");

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("customers")
      .select(
        "id,name,brn,vat_no,email,phone,address,contact_person,notes,is_active,created_at"
      )
      .eq("id", customerId)
      .maybeSingle();

    if (error) {
      console.error("[customers/[id]]", error);
      return jsonError(500, { error: "Failed to load customer" });
    }

    if (!data) {
      return jsonError(404, { error: "Customer not found" });
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[customers/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const customerId = parseCustomerId(id);

    if (!customerId) {
      return jsonError(400, { error: "Invalid customer id" });
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
      contact_person: body.contact_person
        ? String(body.contact_person).trim()
        : null,
      notes: body.notes ? String(body.notes).trim() : null,
      is_active:
        typeof body.is_active === "boolean" ? body.is_active : true,
    };

    const { data, error } = await admin
      .from("customers")
      .update(payload)
      .eq("id", customerId)
      .select(
        "id,name,brn,vat_no,email,phone,address,contact_person,notes,is_active,created_at"
      )
      .single();

    if (error) {
      console.error("[customers/[id]]", error);
      return jsonError(500, { error: "Failed to update customer" });
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[customers/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}