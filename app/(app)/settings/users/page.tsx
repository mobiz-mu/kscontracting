"use client";

import * as React from "react";
import {
  Users,
  Shield,
  RefreshCw,
  Save,
  CheckCircle2,
  Mail,
  Calendar,
  BadgeCheck,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RoleRow = {
  id: number;
  key: string;
  name: string;
};

type UserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  roles: Array<{
    role_id: number;
    key: string | null;
    name: string | null;
  }>;
};

type UsersApiResponse = {
  ok: boolean;
  data?: {
    users: UserRow[];
    roles: RoleRow[];
  };
  error?: any;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function Card3D({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/80",
        "shadow-[0_1px_0_rgba(15,23,42,0.08),0_18px_45px_rgba(15,23,42,0.10)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(700px_260px_at_16%_0%,rgba(7,27,56,0.10),transparent_60%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      msg = j?.error?.message ?? j?.error ?? j?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got ${ct || "unknown"}`);
  }

  return JSON.parse(raw) as T;
}

async function safePost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      msg = j?.error?.message ?? j?.error ?? j?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got ${ct || "unknown"}`);
  }

  return JSON.parse(raw) as T;
}

export default function Page() {
  const [loading, setLoading] = React.useState(true);
  const [savingUserId, setSavingUserId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [draftRoles, setDraftRoles] = React.useState<Record<string, number[]>>({});

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await safeGet<UsersApiResponse>("/api/settings/users");

      if (!res.ok || !res.data) {
        throw new Error(res?.error ?? "Failed to load users");
      }

      setUsers(res.data.users ?? []);
      setRoles(res.data.roles ?? []);

      const nextDrafts: Record<string, number[]> = {};
      for (const user of res.data.users ?? []) {
        nextDrafts[user.id] = (user.roles ?? []).map((r) => r.role_id);
      }
      setDraftRoles(nextDrafts);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
      setUsers([]);
      setRoles([]);
      setDraftRoles({});
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function toggleRole(userId: string, roleId: number) {
    setDraftRoles((prev) => {
      const current = prev[userId] ?? [];
      const exists = current.includes(roleId);

      return {
        ...prev,
        [userId]: exists
          ? current.filter((x) => x !== roleId)
          : [...current, roleId],
      };
    });
  }

  async function saveUserRoles(userId: string) {
    setSavingUserId(userId);
    setError("");

    try {
      await safePost("/api/settings/users", {
        user_id: userId,
        role_ids: draftRoles[userId] ?? [],
      });

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save user roles");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-500">Security & Administration</div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Users
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Manage system users, assign roles, and control permission coverage.
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card3D className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">Users</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{users.length}</div>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-slate-50">
              <Users className="size-5 text-slate-700" />
            </div>
          </div>
        </Card3D>

        <Card3D className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">Roles</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{roles.length}</div>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-slate-50">
              <Shield className="size-5 text-slate-700" />
            </div>
          </div>
        </Card3D>

        <Card3D className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">Role Coverage</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">
                {users.filter((u) => (u.roles ?? []).length > 0).length}
              </div>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-slate-50">
              <BadgeCheck className="size-5 text-slate-700" />
            </div>
          </div>
        </Card3D>
      </div>

      {/* User list */}
      <Card3D className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-extrabold text-slate-900">User Role Management</div>
            <div className="mt-1 text-sm text-slate-600">
              Assign one or more roles per user. Admin users can be given full system authority.
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 ring-1 ring-slate-200">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 ring-1 ring-slate-200">
              No users found.
            </div>
          ) : (
            users.map((user) => {
              const currentDraft = draftRoles[user.id] ?? [];
              const activeRoleNames = (user.roles ?? [])
                .map((r) => r.name)
                .filter(Boolean)
                .join(", ");

              return (
                <div
                  key={user.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 xl:max-w-[340px]">
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                          <UserCog className="size-5 text-slate-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-900">
                            {user.email || "No email"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            User ID: {user.id}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Mail className="size-4 text-slate-400" />
                          <span>{user.email || "—"}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-slate-400" />
                          <span>Created: {fmtDate(user.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-slate-400" />
                          <span>Last sign in: {fmtDate(user.last_sign_in_at)}</span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                        <div className="text-xs font-semibold text-slate-500">Current Roles</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {activeRoleNames || "No active roles"}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {roles.map((role) => {
                          const checked = currentDraft.includes(role.id);

                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => toggleRole(user.id, role.id)}
                              className={cn(
                                "rounded-2xl border p-4 text-left transition",
                                checked
                                  ? "border-[#ff7a18]/30 bg-[#ff7a18]/10"
                                  : "border-slate-200 bg-slate-50 hover:bg-white"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-extrabold text-slate-900">
                                    {role.name}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {role.key}
                                  </div>
                                </div>

                                <div
                                  className={cn(
                                    "relative h-7 w-12 rounded-full transition",
                                    checked ? "bg-[#071b38]" : "bg-slate-200"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                                      checked ? "left-6" : "left-1"
                                    )}
                                  />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
                          onClick={() => void saveUserRoles(user.id)}
                          disabled={savingUserId === user.id}
                        >
                          {savingUserId === user.id ? (
                            <RefreshCw className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 size-4" />
                          )}
                          Save Roles
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card3D>
    </div>
  );
}