import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";

type RoleRow = {
  id: number;
  key: string;
  name: string;
};

type UserRoleJoinRow = {
  user_id: string;
  role_id: number;
  is_active: boolean;
  created_at: string | null;
  roles: RoleRow[] | null;
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

export async function GET() {
  try {
    await requirePermission("settings.manage");

    const admin = createSupabaseAdminClient();

    const { data: usersRes, error: usersErr } = await admin.auth.admin.listUsers();

    if (usersErr) {
      return jsonError(500, {
        error: "Failed to load auth users",
        supabaseError: safeError(usersErr),
      });
    }

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

    const { data: userRoles, error: userRolesErr } = await admin
      .from("user_roles")
      .select(`
        user_id,
        role_id,
        is_active,
        created_at,
        roles:role_id (
          id,
          key,
          name
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (userRolesErr) {
      return jsonError(500, {
        error: "Failed to load user roles",
        supabaseError: safeError(userRolesErr),
      });
    }

    const safeRoles: RoleRow[] = Array.isArray(roles) ? (roles as RoleRow[]) : [];
    const safeUserRoles: UserRoleJoinRow[] = Array.isArray(userRoles)
      ? (userRoles as UserRoleJoinRow[])
      : [];

    const rows = (usersRes?.users ?? []).map((u: any) => {
      const assignedRoles = safeUserRoles.filter(
        (x) => String(x.user_id) === String(u.id)
      );

      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        roles: assignedRoles.map((r) => {
          const role = Array.isArray(r.roles) ? r.roles[0] : null;

          return {
            role_id: r.role_id,
            key: role?.key ?? null,
            name: role?.name ?? null,
          };
        }),
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        users: rows,
        roles: safeRoles,
      },
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });

    return jsonError(500, {
      error: "Failed to load users",
      supabaseError: safeError(e),
    });
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("settings.manage");

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id ?? "").trim();

    const roleIds: number[] = Array.isArray(body?.role_ids)
      ? body.role_ids
          .map((x: unknown) => Number(x))
          .filter((x: number) => Number.isFinite(x) && x > 0)
      : [];

    if (!userId) {
      return jsonError(400, { error: "user_id is required" });
    }

    const admin = createSupabaseAdminClient();

    const { error: clearErr } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (clearErr) {
      return jsonError(500, {
        error: "Failed to clear user roles",
        supabaseError: safeError(clearErr),
      });
    }

    if (roleIds.length > 0) {
      const payload = roleIds.map((roleId: number) => ({
        user_id: userId,
        role_id: roleId,
        is_active: true,
      }));

      const { error: insertErr } = await admin
        .from("user_roles")
        .insert(payload);

      if (insertErr) {
        return jsonError(500, {
          error: "Failed to assign roles",
          supabaseError: safeError(insertErr),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "User roles updated successfully",
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });

    return jsonError(500, {
      error: "Failed to update user roles",
      supabaseError: safeError(e),
    });
  }
}