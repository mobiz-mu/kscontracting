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

function safeErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Unknown error";
}

type RoleJoinRow = { id: number; key: string; name: string };
type UserRoleRow = {
  role_id: number;
  is_active: boolean;
  roles: RoleJoinRow | RoleJoinRow[] | null;
};
type PermissionJoinRow = { id: number; key: string; description: string | null };
type RolePermissionRow = {
  role_id: number;
  permission_id: number;
  permissions: PermissionJoinRow | PermissionJoinRow[] | null;
};

/**
 * Supabase's JS client can return a to-one foreign-table join as either a
 * single object or a one-element array depending on the query shape and
 * client version. Normalize to a single object (or null) so callers don't
 * silently get an empty result when the shape flips.
 */
function normalizeJoinedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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

  const roleIds = ((rolesRows ?? []) as UserRoleRow[])
    .map((r) => Number(r.role_id))
    .filter((x) => Number.isFinite(x));

  const roleKeys = ((rolesRows ?? []) as UserRoleRow[])
    .map((r) => String(normalizeJoinedRow(r?.roles)?.key ?? "").trim())
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
      ((permRows ?? []) as RolePermissionRow[])
        .map((r) => String(normalizeJoinedRow(r?.permissions)?.key ?? "").trim())
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

/**
 * Use for endpoints shared by multiple actions (e.g. a single POST route that
 * both creates and updates a draft) where different permissions can each
 * independently grant access.
 */
export async function requireAnyPermission(
  permissionKeys: string[]
): Promise<AuthzResult> {
  const authz = await getCurrentAuthz();

  if (authz.roleKeys.includes("admin")) return authz;

  const allowed = permissionKeys.some((key) => authz.permissions.includes(key));
  if (!allowed) {
    throw new Error("Forbidden");
  }

  return authz;
}