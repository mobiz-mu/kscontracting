import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = {
  params: Promise<{ id: string }>;
};

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

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("customers")
      .select(
        "id,name,brn,vat_no,email,phone,address,contact_person,notes,is_active,created_at"
      )
      .eq("id", customerId)
      .maybeSingle();

    if (error) {
      return jsonError(500, {
        error: "Failed to load customer",
        supabaseError: safeError(error),
      });
    }

    if (!data) {
      return jsonError(404, { error: "Customer not found" });
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const customerId = parseCustomerId(id);

    if (!customerId) {
      return jsonError(400, { error: "Invalid customer id" });
    }

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

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
      return jsonError(500, {
        error: "Failed to update customer",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}