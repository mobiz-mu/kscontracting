import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

async function ensureSeedData() {
  const admin = createSupabaseAdminClient();

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
      { key: "invoices.void", description: "Void invoices" },
      { key: "invoices.share", description: "Create/revoke public invoice share links" },
      { key: "payments.view", description: "View payments" },
      { key: "payments.create", description: "Record payments" },
      { key: "payments.record", description: "Record payments (legacy alias)" },
      { key: "quotations.view", description: "View quotations" },
      { key: "quotations.create", description: "Create quotations" },
      { key: "quotations.edit", description: "Edit quotations" },
      { key: "quotations.convert", description: "Convert quotations to invoices" },
      { key: "credit_notes.view", description: "View credit notes" },
      { key: "credit_notes.create", description: "Create credit notes" },
      { key: "credit_notes.issue", description: "Issue credit notes" },
      { key: "contacts.view", description: "View customers, suppliers, sub-contractors" },
      { key: "contacts.manage", description: "Manage customers and suppliers" },
      { key: "purchase_bills.view", description: "View purchase bills" },
      { key: "purchase_bills.create", description: "Create purchase bills" },
      { key: "purchase_bills.delete", description: "Delete purchase bills (admin only by default)" },
      { key: "reports.view", description: "View reports" },
      { key: "settings.manage", description: "Manage company settings" },
      { key: "users.manage", description: "Manage users and role assignments" },
      { key: "access.manage", description: "Manage the roles/permissions access matrix" },
    ]);
  }
}

export async function GET() {
  try {
    await requirePermission("access.manage");

    await ensureSeedData();

    const admin = createSupabaseAdminClient();

    const { data: roles, error: rolesErr } = await admin
      .from("roles")
      .select("id,key,name")
      .order("id", { ascending: true });

    if (rolesErr) {
      console.error("[settings/access GET] roles", rolesErr);
      return jsonError(500, { error: "Failed to load roles" });
    }

    const { data: permissions, error: permsErr } = await admin
      .from("permissions")
      .select("id,key,description")
      .order("id", { ascending: true });

    if (permsErr) {
      console.error("[settings/access GET] permissions", permsErr);
      return jsonError(500, { error: "Failed to load permissions" });
    }

    const { data: links, error: linksErr } = await admin
      .from("role_permissions")
      .select("role_id,permission_id");

    if (linksErr) {
      console.error("[settings/access GET] role_permissions", linksErr);
      return jsonError(500, { error: "Failed to load role permissions" });
    }

    return NextResponse.json({
      ok: true,
      data: {
        roles: roles ?? [],
        permissions: permissions ?? [],
        role_permissions: links ?? [],
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });

    console.error("[settings/access GET]", e);
    return jsonError(500, { error: "Failed to load access settings" });
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("access.manage");

    const body = await req.json().catch(() => ({}));
    type RawMatrixEntry = { role_id?: unknown; permission_id?: unknown };
    const matrix: RawMatrixEntry[] = Array.isArray(body?.matrix) ? body.matrix : [];

    const admin = createSupabaseAdminClient();

    const normalized = matrix
      .map((x) => ({
        role_id: Number(x?.role_id),
        permission_id: Number(x?.permission_id),
      }))
      .filter(
        (x) =>
          Number.isFinite(x.role_id) &&
          x.role_id > 0 &&
          Number.isFinite(x.permission_id) &&
          x.permission_id > 0
      );

    // Safety net: never allow the access matrix to be saved in a way that
    // strips the admin role of settings/access management. Otherwise a
    // mistake here could permanently lock everyone out of this screen.
    const { data: adminRole } = await admin
      .from("roles")
      .select("id")
      .eq("key", "admin")
      .maybeSingle();

    const { data: accessPerm } = await admin
      .from("permissions")
      .select("id")
      .eq("key", "access.manage")
      .maybeSingle();

    if (adminRole?.id && accessPerm?.id) {
      const alreadyIncluded = normalized.some(
        (x) => x.role_id === adminRole.id && x.permission_id === accessPerm.id
      );
      if (!alreadyIncluded) {
        normalized.push({ role_id: adminRole.id, permission_id: accessPerm.id });
      }
    }

    const { error: deleteErr } = await admin
      .from("role_permissions")
      .delete()
      .neq("role_id", 0);

    if (deleteErr) {
      console.error("[settings/access POST] delete", deleteErr);
      return jsonError(500, { error: "Failed to reset role permissions" });
    }

    if (normalized.length > 0) {
      const { error: insertErr } = await admin
        .from("role_permissions")
        .insert(normalized);

      if (insertErr) {
        console.error("[settings/access POST] insert", insertErr);
        return jsonError(500, { error: "Failed to save role permissions" });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Access permissions saved successfully",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });

    console.error("[settings/access POST]", e);
    return jsonError(500, { error: "Failed to save access settings" });
  }
}