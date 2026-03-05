// app/api/customers/route.ts
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function safeError(err: any) {
  return {
    message: err?.message ?? "Unknown error",
    code: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  };
}

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("id,name,brn,vat_no,email,phone,is_active,created_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: safeError(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: safeError(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();

    const body = await req.json().catch(() => ({}));

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }

    const payload = {
      name,
      brn: body.brn ?? null,
      vat_no: body.vat_no ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      contact_person: body.contact_person ?? null,
      notes: body.notes ?? null,
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert(payload)
      .select("id,name")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: safeError(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: safeError(e) }, { status: 500 });
  }
}