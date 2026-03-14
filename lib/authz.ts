import "server-only";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export type AuthzResult = {
  userId: string;
  roleKeys: string[];
  permissions: string[];
};

function safeErrorMessage(err: any) {
  return err?.message ?? "Unknown error";
}

export async function getCurrentAuthz(): Promise<AuthzResult> {
  const supabase = await createSupabaseServerClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userRes.user) {
    throw new Error("Unauthorized");
  }

  const admin = createSupabaseAdminClient();

  const { data: rolesRows, error: rolesErr } = await admin
    .from("user_roles")
    .select(`
      role_id,
      is_active,
      roles:role_id (
        id,
        key,
        name
      )
    `)
    .eq("user_id", userRes.user.id)
    .eq("is_active", true);

  if (rolesErr) {
    throw new Error(`Failed to load user roles: ${safeErrorMessage(rolesErr)}`);
  }

  const roleIds = (rolesRows ?? [])
    .map((r: any) => Number(r.role_id))
    .filter((x) => Number.isFinite(x));

  const roleKeys = (rolesRows ?? [])
    .map((r: any) => String(r?.roles?.key ?? "").trim())
    .filter(Boolean);

  if (roleIds.length === 0) {
    return {
      userId: userRes.user.id,
      roleKeys: [],
      permissions: [],
    };
  }

  const { data: permRows, error: permErr } = await admin
    .from("role_permissions")
    .select(`
      role_id,
      permission_id,
      permissions:permission_id (
        id,
        key,
        description
      )
    `)
    .in("role_id", roleIds);

  if (permErr) {
    throw new Error(`Failed to load role permissions: ${safeErrorMessage(permErr)}`);
  }

  const permissions = Array.from(
    new Set(
      (permRows ?? [])
        .map((r: any) => String(r?.permissions?.key ?? "").trim())
        .filter(Boolean)
    )
  );

  return {
    userId: userRes.user.id,
    roleKeys,
    permissions,
  };
}

export async function hasPermission(permissionKey: string): Promise<boolean> {
  const authz = await getCurrentAuthz();

  if (authz.roleKeys.includes("admin")) return true;

  return authz.permissions.includes(permissionKey);
}

export async function requirePermission(permissionKey: string): Promise<AuthzResult> {
  const authz = await getCurrentAuthz();

  if (authz.roleKeys.includes("admin")) return authz;

  if (!authz.permissions.includes(permissionKey)) {
    throw new Error("Forbidden");
  }

  return authz;
}