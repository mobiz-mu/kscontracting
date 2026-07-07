import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function sanitizeSearch(value: string) {
  return value.replace(/[,%]/g, " ").trim();
}

export async function GET(req: Request) {
  try {
    await requirePermission("contacts.view");

    const url = new URL(req.url);
    const q = sanitizeSearch((url.searchParams.get("q") ?? "").trim());
    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(
      200,
      Math.max(10, parsePositiveInt(url.searchParams.get("pageSize"), 25))
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabaseAdmin = createSupabaseAdminClient();

    let query = supabaseAdmin
      .from("customers")
      .select(
        "id,name,brn,vat_no,email,phone,address,contact_person,notes,is_active,created_at",
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(from, to);

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,vat_no.ilike.%${q}%,brn.ilike.%${q}%,address.ilike.%${q}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[customers/ts]", error);
      return jsonError(500, { error: "Failed to load customers" });
    }

    const total = count ?? data?.length ?? 0;

    return NextResponse.json({
      ok: true,
      data: data ?? [],
      meta: {
        page,
        pageSize,
        total,
        hasMore: from + (data?.length ?? 0) < total,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[customers/ts]", e);
      return jsonError(500, { error: "Internal error" });
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("contacts.manage");

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
      contact_person: body.contact_person
        ? String(body.contact_person).trim()
        : null,
      notes: body.notes ? String(body.notes).trim() : null,
      is_active: body.is_active === false ? false : true,
    };

    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert(payload)
      .select(
        "id,name,brn,vat_no,email,phone,address,contact_person,notes,is_active,created_at"
      )
      .single();

    if (error) {
      console.error("[customers/ts]", error);
      return jsonError(500, { error: "Failed to create customer" });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[customers/ts]", e);
      return jsonError(500, { error: "Internal error" });
  }
}