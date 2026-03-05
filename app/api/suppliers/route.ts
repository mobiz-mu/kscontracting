import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

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

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

export async function POST(req: Request) {
  try {
    // auth
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userRes.user) return jsonError(401, { error: "Unauthorized", supabaseError: safeError(uErr) });

    const body = await req.json().catch(() => ({}));

    const name = String(body?.name ?? "").trim();
    if (!name) return jsonError(400, { error: "name is required" });

    const payload = {
      name,
      brn: body?.brn ? String(body.brn).trim() : null,
      vat_no: body?.vat_no ? String(body.vat_no).trim() : null,
      email: body?.email ? String(body.email).trim() : null,
      phone: body?.phone ? String(body.phone).trim() : null,
      address: body?.address ? String(body.address).trim() : null,
      created_by: userRes.user.id, // if your table has it (recommended)
    };

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("suppliers")
      .insert(payload)
      .select("id, name")
      .single();

    if (error) return jsonError(500, { error: "Failed to create supplier", supabaseError: safeError(error) });

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userRes.user) return jsonError(401, { error: "Unauthorized", supabaseError: safeError(uErr) });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.max(1, n2(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(200, Math.max(10, n2(url.searchParams.get("pageSize") ?? "25") || 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("suppliers")
      .select("id, name, brn, vat_no, email, phone, address, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    // if your table uses created_by, keep this:
    query = query.eq("created_by", userRes.user.id);

    if (q) {
      query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) return jsonError(500, { error: "Supabase query failed", supabaseError: safeError(error) });

    return NextResponse.json(
      {
        ok: true,
        data: data ?? [],
        meta: {
          page,
          pageSize,
          total: count ?? (data?.length ?? 0),
          hasMore: typeof count === "number" ? to + 1 < count : (data?.length ?? 0) === pageSize,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return jsonError(500, { error: e?.message ?? "Internal error" });
  }
}