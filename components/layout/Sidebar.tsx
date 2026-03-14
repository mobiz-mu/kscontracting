"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebarState } from "@/components/layout/SidebarState";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  permissions: string[];
};

type PermissionsResponse = {
  ok: boolean;
  data?: {
    userId: string;
    roleKeys: string[];
    permissions: string[];
  };
  error?: any;
};

const NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permissions: ["dashboard.view"],
  },
  {
    label: "Invoices",
    href: "/sales/invoices",
    icon: FileText,
    permissions: ["invoices.view"],
  },
  {
    label: "Quotations",
    href: "/sales/quotations",
    icon: Receipt,
    permissions: ["quotations.view"],
  },
  {
    label: "Credit Notes",
    href: "/sales/credit-notes",
    icon: Receipt,
    permissions: ["credit_notes.view"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    permissions: ["reports.view"],
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: Users,
    permissions: ["contacts.manage"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permissions: ["settings.manage"],
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    permissions: ["settings.manage"],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
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

function SidebarInner({ inDrawer = false }: { inDrawer?: boolean }) {
  const pathname = usePathname();
  const { collapsed, setCollapsed, closeMobile } = useSidebarState();

  const [loadingPerms, setLoadingPerms] = React.useState(true);
  const [permError, setPermError] = React.useState("");
  const [roleKeys, setRoleKeys] = React.useState<string[]>([]);
  const [permissions, setPermissions] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (inDrawer) closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  React.useEffect(() => {
    let alive = true;

    async function loadPermissions() {
      setLoadingPerms(true);
      setPermError("");

      try {
        const res = await safeGet<PermissionsResponse>("/api/auth/me/permissions");

        if (!alive) return;

        if (!res.ok || !res.data) {
          throw new Error(res?.error ?? "Failed to load permissions");
        }

        setRoleKeys(Array.isArray(res.data.roleKeys) ? res.data.roleKeys : []);
        setPermissions(Array.isArray(res.data.permissions) ? res.data.permissions : []);
      } catch (e: any) {
        if (!alive) return;
        setPermError(e?.message || "Failed to load permissions");
        setRoleKeys([]);
        setPermissions([]);
      } finally {
        if (alive) setLoadingPerms(false);
      }
    }

    void loadPermissions();

    return () => {
      alive = false;
    };
  }, []);

  const isAdmin = roleKeys.includes("admin");

  const visibleNav = React.useMemo(() => {
    if (isAdmin) return NAV;

    return NAV.filter((item) =>
      item.permissions.some((perm) => permissions.includes(perm))
    );
  }, [isAdmin, permissions]);

  return (
    <aside
      className={cn(
        !inDrawer && "sticky top-0",
        "h-[100dvh] shrink-0 overflow-hidden",
        "border-r border-white/10 shadow-[0_20px_60px_rgba(2,6,23,0.45)]",
        "bg-[radial-gradient(1100px_900px_at_-220px_-220px,rgba(255,255,255,0.10),transparent_40%),radial-gradient(900px_700px_at_115%_-10%,rgba(255,122,24,0.10),transparent_45%),linear-gradient(180deg,#071b38_0%,#06142b_100%)]",
        "text-white",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[86px]" : "w-[260px]"
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/12 to-transparent" />

      {/* TOP */}
      <div className={cn("px-3 pt-3", collapsed ? "pb-2" : "pb-3")}>
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "justify-between")}>
          <Link
            href="/dashboard"
            className={cn(
              "group flex items-center gap-3 rounded-2xl",
              "px-2 py-2",
              "transition hover:bg-white/7 hover:ring-1 hover:ring-white/10"
            )}
            title="KS Contracting"
          >
            <span
              className={cn(
                "relative grid place-items-center rounded-2xl bg-white ring-1 ring-black/5",
                "shadow-[0_12px_28px_rgba(2,6,23,0.25)]",
                "transition-transform duration-300 ease-out group-hover:scale-[1.03]",
                "h-10 w-10"
              )}
            >
              <Image
                src="/kslogo.png"
                alt="KS Contracting"
                width={36}
                height={36}
                className="h-8 w-8 object-contain"
                priority
              />
            </span>

            {!collapsed && (
              <div className="leading-tight">
                <div className="text-[14px] font-semibold tracking-tight">KS Contracting</div>
                <div className="text-[11px] text-white/60">Accounting Suite</div>
              </div>
            )}
          </Link>

          {!inDrawer && !collapsed && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCollapsed(true)}
              className="h-9 w-9 rounded-2xl text-white hover:bg-white/10 hover:ring-1 hover:ring-white/10"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}

          {!inDrawer && collapsed && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCollapsed(false)}
              className="h-9 w-9 rounded-2xl text-white hover:bg-white/10 hover:ring-1 hover:ring-white/10"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}

          {inDrawer && (
            <Button
              type="button"
              variant="ghost"
              onClick={closeMobile}
              className="h-9 w-9 rounded-2xl text-white hover:bg-white/10 hover:ring-1 hover:ring-white/10"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* NAV */}
      <div className={cn("px-2", "h-[calc(100dvh-76px-88px)] overflow-hidden")}>
        <div className="mt-2 space-y-1">
          {loadingPerms ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl",
                  collapsed ? "h-[50px]" : "h-[50px]",
                  "animate-pulse bg-white/8"
                )}
              />
            ))
          ) : permError ? (
            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-white/8 p-3 text-white/80",
                collapsed ? "text-center" : ""
              )}
            >
              <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}>
                <ShieldAlert className="size-4 shrink-0" />
                {!collapsed && <span className="text-xs">Permissions unavailable</span>}
              </div>
            </div>
          ) : visibleNav.length === 0 ? (
            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-white/8 p-3 text-white/80",
                collapsed ? "text-center" : ""
              )}
            >
              <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}>
                <ShieldAlert className="size-4 shrink-0" />
                {!collapsed && <span className="text-xs">No accessible modules</span>}
              </div>
            </div>
          ) : (
            visibleNav.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl",
                    collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                    "transition-all duration-300 ease-out",
                    "hover:bg-white/8 hover:ring-1 hover:ring-white/10 hover:translate-x-[2px]",
                    active && "bg-white/10 ring-1 ring-white/12"
                  )}
                >
                  {active && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-[#ff7a18] shadow-[0_0_0_6px_rgba(255,122,24,0.12)]" />
                  )}

                  <span
                    className={cn(
                      "relative grid size-10 place-items-center rounded-2xl",
                      "ring-1 transition",
                      active ? "bg-white/12 ring-white/16" : "bg-white/7 ring-white/10",
                      "group-hover:bg-white/12"
                    )}
                  >
                    <Icon className={cn("size-4", active ? "text-white" : "text-white/85")} />
                    <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 shadow-[0_14px_30px_rgba(2,6,23,0.35)]" />
                  </span>

                  {!collapsed && (
                    <span className={cn("text-sm font-medium", active ? "text-white" : "text-white/85")}>
                      {item.label}
                    </span>
                  )}

                  <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 bg-[linear-gradient(90deg,transparent,rgba(255,122,24,0.08),transparent)]" />
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* BOTTOM */}
      <div className="px-3 pb-3">
        <div
          className={cn(
            "rounded-3xl bg-white/6 ring-1 ring-white/10 shadow-[0_18px_40px_rgba(2,6,23,0.35)]",
            "transition-transform duration-300 hover:translate-y-[-1px]",
            collapsed ? "p-2" : "p-3"
          )}
        >
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <span className="grid size-10 place-items-center rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_10px_25px_rgba(2,6,23,0.18)]">
              <Image src="/kslogo.png" alt="KS" width={32} height={32} className="h-7 w-7 object-contain" />
            </span>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">KS CONTRACTING LTD</div>
                <div className="truncate text-[11px] text-white/60">
                  {isAdmin ? "Admin" : roleKeys.length ? roleKeys.join(", ") : "Restricted user"} • Single company
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const { mobileOpen, closeMobile } = useSidebarState();

  return (
    <>
      <div className="hidden lg:block">
        <SidebarInner />
      </div>

      <div className={cn("lg:hidden", mobileOpen ? "block" : "hidden")}>
        <button
          aria-label="Close sidebar overlay"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        />
        <div className="fixed inset-y-0 left-0 z-50">
          <SidebarInner inDrawer />
        </div>
      </div>
    </>
  );
}