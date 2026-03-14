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

async function ensureSeedData() {
  const admin = createSupabaseAdminClient();

  const { data: rolesCount } = await admin
    .from("roles")
    .select("id", { count: "exact", head: true });

  const { data: permsCount } = await admin
    .from("permissions")
    .select("id", { count: "exact", head: true });

  const { count: roleCount } = await admin
    .from("roles")
    .select("id", { count: "exact", head: true });

  const { count: permissionCount } = await admin
    .from("permissions")
    .select("id", { count: "exact", head: true });

  if (!roleCount || roleCount === 0) {
    await admin.from("roles").insert([
      { key: "admin", name: "Admin" },
      { key: "manager", name: "Manager" },
      { key: "accountant", name: "Accountant" },
      { key: "sales", name: "Sales" },
      { key: "viewer", name: "Viewer" },
    ]);
  }

  if (!permissionCount || permissionCount === 0) {
    await admin.from("permissions").insert([
      { key: "dashboard.view", description: "View dashboard" },
      { key: "invoices.view", description: "View invoices" },
      { key: "invoices.create", description: "Create invoices" },
      { key: "invoices.edit", description: "Edit invoices" },
      { key: "invoices.issue", description: "Issue invoices" },
      { key: "payments.record", description: "Record payments" },
      { key: "quotations.view", description: "View quotations" },
      { key: "quotations.create", description: "Create quotations" },
      { key: "credit_notes.view", description: "View credit notes" },
      { key: "credit_notes.create", description: "Create credit notes" },
      { key: "reports.view", description: "View reports" },
      { key: "settings.manage", description: "Manage settings" },
      { key: "contacts.manage", description: "Manage customers and suppliers" },
    ]);
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

    await ensureSeedData();

    const admin = createSupabaseAdminClient();

    const { data: roles, error: rolesErr } = await admin
      .from("roles")
      .select("id,key,name")
      .order("id", { ascending: true });

    if (rolesErr) {
      return jsonError(500, {
        error: "Failed to load roles",
        supabaseError: safeError(rolesErr),
      });
    }

    const { data: permissions, error: permsErr } = await admin
      .from("permissions")
      .select("id,key,description")
      .order("id", { ascending: true });

    if (permsErr) {
      return jsonError(500, {
        error: "Failed to load permissions",
        supabaseError: safeError(permsErr),
      });
    }

    const { data: links, error: linksErr } = await admin
      .from("role_permissions")
      .select("role_id,permission_id");

    if (linksErr) {
      return jsonError(500, {
        error: "Failed to load role permissions",
        supabaseError: safeError(linksErr),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        roles: roles ?? [],
        permissions: permissions ?? [],
        role_permissions: links ?? [],
      },
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Failed to load access settings",
      supabaseError: safeError(e),
    });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

    const body = await req.json().catch(() => ({}));
    const matrix = Array.isArray(body?.matrix) ? body.matrix : [];

    const admin = createSupabaseAdminClient();

    const normalized = matrix
      .map((x: any) => ({
        role_id: Number(x?.role_id),
        permission_id: Number(x?.permission_id),
      }))
      .filter(
        (x: any) =>
          Number.isFinite(x.role_id) &&
          x.role_id > 0 &&
          Number.isFinite(x.permission_id) &&
          x.permission_id > 0
      );

    const { error: deleteErr } = await admin
      .from("role_permissions")
      .delete()
      .neq("role_id", 0);

    if (deleteErr) {
      return jsonError(500, {
        error: "Failed to reset role permissions",
        supabaseError: safeError(deleteErr),
      });
    }

    if (normalized.length > 0) {
      const { error: insertErr } = await admin
        .from("role_permissions")
        .insert(normalized);

      if (insertErr) {
        return jsonError(500, {
          error: "Failed to save role permissions",
          supabaseError: safeError(insertErr),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Access permissions saved successfully",
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Failed to save access settings",
      supabaseError: safeError(e),
    });
  }
}