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

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const supabaseAdmin = createSupabaseAdminClient();

    let query = supabaseAdmin
      .from("customers")
      .select(
        "id,name,brn,vat_no,email,phone,address,contact_person,notes,is_active,created_at",
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,vat_no.ilike.%${q}%,brn.ilike.%${q}%,address.ilike.%${q}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      return jsonError(500, {
        error: "Failed to load customers",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({
      ok: true,
      data: data ?? [],
      meta: {
        total: count ?? (data?.length ?? 0),
      },
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

    const supabaseAdmin = createSupabaseAdminClient();
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
      contact_person: body.contact_person ? String(body.contact_person).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert(payload)
      .select("id,name,brn,vat_no,email,phone,address,contact_person,notes,is_active,created_at")
      .single();

    if (error) {
      return jsonError(500, {
        error: "Failed to create customer",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}