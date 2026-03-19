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
  Wallet,
  ClipboardList,
  UserPlus,
  Truck,
  FolderKanban,
  FilePlus2,
  Layers3,
  BadgeDollarSign,
  CircleDollarSign,
  Sparkles,
  ChevronsUpDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebarState } from "@/components/layout/SidebarState";

type NavLink = {
  label: string;
  href: string;
  icon: React.ElementType;
  permissions?: string[];
};

type NavGroup = {
  label: string;
  icon: React.ElementType;
  permissions?: string[];
  children?: NavLink[];
  href?: string;
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

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    permissions: ["dashboard.view"],
    href: "/dashboard",
  },
  {
    label: "Invoices",
    icon: FileText,
    permissions: ["invoices.view"],
    children: [
      {
        label: "Create Invoice",
        href: "/sales/invoices/new",
        icon: FilePlus2,
        permissions: ["invoices.create", "invoices.view"],
      },
      {
        label: "Payment Effected",
        href: "/payments/new",
        icon: Wallet,
        permissions: ["payments.create", "invoices.view"],
      },
      {
        label: "Payment Report",
        href: "/payments",
        icon: BadgeDollarSign,
        permissions: ["payments.view", "invoices.view"],
      },
      {
        label: "Pending Invoices",
        href: "/sales/invoices",
        icon: ClipboardList,
        permissions: ["invoices.view"],
      },
    ],
  },
  {
    label: "Quotations",
    icon: Receipt,
    permissions: ["quotations.view"],
    children: [
      {
        label: "New Quote",
        href: "/sales/quotations/new",
        icon: FilePlus2,
        permissions: ["quotations.create", "quotations.view"],
      },
      {
        label: "Convert to Invoice",
        href: "/sales/quotations",
        icon: Layers3,
        permissions: ["quotations.view", "invoices.view"],
      },
    ],
  },
  {
    label: "Credit Notes",
    icon: CircleDollarSign,
    permissions: ["credit_notes.view"],
    children: [
      {
        label: "Create Credit Note",
        href: "/sales/credit-notes/new",
        icon: FilePlus2,
        permissions: ["credit_notes.create", "credit_notes.view"],
      },
    ],
  },
  {
    label: "Contract",
    icon: FolderKanban,
    permissions: ["contacts.manage"],
    children: [
      {
        label: "New Customer",
        href: "/contacts?tab=customers",
        icon: UserPlus,
        permissions: ["contacts.manage"],
      },
      {
        label: "New Supplier",
        href: "/contacts?tab=suppliers",
        icon: Truck,
        permissions: ["contacts.manage"],
      },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    permissions: ["reports.view"],
    href: "/reports",
  },
  {
    label: "Contacts",
    icon: Users,
    permissions: ["contacts.manage"],
    href: "/contacts",
  },
  {
    label: "Settings",
    icon: Settings,
    permissions: ["settings.manage"],
    href: "/settings",
  },
  {
    label: "Users",
    icon: Users,
    permissions: ["settings.manage"],
    href: "/users",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href);
}

function groupHasActive(pathname: string, group: NavGroup) {
  if (group.href) return isActive(pathname, group.href);
  return (group.children ?? []).some((item) => isActive(pathname, item.href));
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

function hasAccess(required: string[] | undefined, isAdmin: boolean, permissions: string[]) {
  if (isAdmin) return true;
  if (!required || required.length === 0) return true;
  return required.some((perm) => permissions.includes(perm));
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
  level = 0,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  active: boolean;
  level?: number;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl",
        collapsed ? "justify-center px-2 py-2.5" : level === 1 ? "px-3 py-2.5 pl-4" : "px-3 py-2.5",
        "transition-all duration-300 ease-out",
        "hover:bg-white/8 hover:ring-1 hover:ring-white/10 hover:translate-x-[2px]",
        active && "bg-white/10 ring-1 ring-white/12 shadow-[0_10px_30px_rgba(255,122,24,0.08)]"
      )}
    >
      {active && (
        <span className="absolute left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[#ff7a18] shadow-[0_0_0_6px_rgba(255,122,24,0.12)]" />
      )}

      <span
        className={cn(
          "relative grid place-items-center rounded-2xl ring-1 transition",
          collapsed ? "size-10" : level === 1 ? "size-9" : "size-10",
          active ? "bg-white/12 ring-white/16" : "bg-white/7 ring-white/10",
          "group-hover:bg-white/12"
        )}
      >
        <Icon className={cn(level === 1 ? "size-4" : "size-4.5", active ? "text-white" : "text-white/85")} />
      </span>

      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-sm font-medium", active ? "text-white" : "text-white/85")}>
            {label}
          </div>
        </div>
      )}

      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(90deg,transparent,rgba(255,122,24,0.08),transparent)] opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

function SidebarGroupButton({
  label,
  icon: Icon,
  collapsed,
  active,
  open,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  active: boolean;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        "transition-all duration-300 ease-out",
        "hover:bg-white/8 hover:ring-1 hover:ring-white/10 hover:translate-x-[2px]",
        active && "bg-white/10 ring-1 ring-white/12 shadow-[0_10px_30px_rgba(255,122,24,0.08)]"
      )}
    >
      {active && (
        <span className="absolute left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[#ff7a18] shadow-[0_0_0_6px_rgba(255,122,24,0.12)]" />
      )}

      <span
        className={cn(
          "relative grid size-10 place-items-center rounded-2xl ring-1 transition",
          active ? "bg-white/12 ring-white/16" : "bg-white/7 ring-white/10",
          "group-hover:bg-white/12"
        )}
      >
        <Icon className={cn("size-4.5", active ? "text-white" : "text-white/85")} />
      </span>

      {!collapsed && (
        <>
          <div className="min-w-0 flex-1 text-left">
            <div className={cn("truncate text-sm font-medium", active ? "text-white" : "text-white/85")}>
              {label}
            </div>
          </div>

          <ChevronsUpDown
            className={cn(
              "size-4 shrink-0 text-white/60 transition-transform duration-300",
              open && "rotate-180 text-white"
            )}
          />
        </>
      )}

      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(90deg,transparent,rgba(255,122,24,0.08),transparent)] opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

function SidebarInner({ inDrawer = false }: { inDrawer?: boolean }) {
  const pathname = usePathname();
  const { collapsed, setCollapsed, closeMobile } = useSidebarState();

  const [loadingPerms, setLoadingPerms] = React.useState(true);
  const [permError, setPermError] = React.useState("");
  const [roleKeys, setRoleKeys] = React.useState<string[]>([]);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    Invoices: true,
    Quotations: true,
    "Credit Notes": true,
    Contract: true,
  });

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

  const visibleGroups = React.useMemo(() => {
    return NAV_GROUPS.map((group) => {
      if (!hasAccess(group.permissions, isAdmin, permissions)) return null;

      if (!group.children?.length) return group;

      const children = group.children.filter((child) =>
        hasAccess(child.permissions, isAdmin, permissions)
      );

      if (children.length === 0 && !group.href) return null;

      return { ...group, children };
    }).filter(Boolean) as NavGroup[];
  }, [isAdmin, permissions]);

  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    visibleGroups.forEach((group) => {
      if (group.children?.length) {
        next[group.label] = groupHasActive(pathname, group);
      }
    });

    setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [pathname, visibleGroups]);

  function toggleGroup(label: string) {
    if (collapsed) {
      setCollapsed(false);
      setTimeout(() => {
        setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
      }, 80);
      return;
    }

    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside
      className={cn(
        !inDrawer && "sticky top-0",
        "h-[100dvh] shrink-0 overflow-hidden",
        "border-r border-white/10 shadow-[0_24px_70px_rgba(2,6,23,0.48)]",
        "bg-[radial-gradient(1200px_900px_at_-220px_-220px,rgba(255,255,255,0.11),transparent_40%),radial-gradient(900px_700px_at_115%_-10%,rgba(255,122,24,0.11),transparent_45%),linear-gradient(180deg,#071b38_0%,#06142b_45%,#04101f_100%)]",
        "text-white transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[86px]" : "w-[300px]"
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/12 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_25%,transparent_75%,rgba(255,255,255,0.02))]" />

      <div className={cn("px-3 pt-3", collapsed ? "pb-2" : "pb-3")}>
        <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "justify-between")}>
          <Link
            href="/dashboard"
            className={cn(
              "group flex items-center gap-3 rounded-2xl px-2 py-2 transition",
              "hover:bg-white/7 hover:ring-1 hover:ring-white/10"
            )}
            title="KS Contracting"
          >
            <span
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-2xl bg-white ring-1 ring-black/5",
                "shadow-[0_12px_28px_rgba(2,6,23,0.25)] transition-transform duration-300 group-hover:scale-[1.03]"
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
                <div className="text-[15px] font-semibold tracking-tight">KS Contracting</div>
                <div className="flex items-center gap-1 text-[11px] text-white/60">
                  <Sparkles className="size-3" />
                  Executive Accounting Suite
                </div>
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

      <div className="h-[calc(100dvh-76px-92px)] overflow-y-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-1.5">
          {loadingPerms ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[52px] animate-pulse rounded-2xl bg-white/8" />
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
          ) : visibleGroups.length === 0 ? (
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
            visibleGroups.map((group) => {
              const active = groupHasActive(pathname, group);
              const hasChildren = !!group.children?.length;
              const isOpen = !!openGroups[group.label];

              if (!hasChildren && group.href) {
                return (
                  <SidebarLink
                    key={group.label}
                    href={group.href}
                    label={group.label}
                    icon={group.icon}
                    collapsed={collapsed}
                    active={active}
                  />
                );
              }

              return (
                <div
                  key={group.label}
                  className={cn(
                    "overflow-hidden rounded-[22px] transition-all duration-300",
                    active && !collapsed && "bg-white/[0.04] ring-1 ring-white/8"
                  )}
                >
                  <SidebarGroupButton
                    label={group.label}
                    icon={group.icon}
                    collapsed={collapsed}
                    active={active}
                    open={isOpen}
                    onClick={() => toggleGroup(group.label)}
                  />

                  {!collapsed && (
                    <div
                      className={cn(
                        "grid transition-all duration-300 ease-out",
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-1 px-2 pb-2 pl-3">
                          {(group.children ?? []).map((child) => (
                            <SidebarLink
                              key={child.href}
                              href={child.href}
                              label={child.label}
                              icon={child.icon}
                              collapsed={false}
                              active={isActive(pathname, child.href)}
                              level={1}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div
          className={cn(
            "rounded-3xl bg-white/6 ring-1 ring-white/10 shadow-[0_18px_40px_rgba(2,6,23,0.35)]",
            "transition-transform duration-300 hover:-translate-y-[1px]",
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
                  {isAdmin ? "Admin" : roleKeys.length ? roleKeys.join(", ") : "Restricted user"} • Executive Workspace
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
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[3px]"
        />
        <div className="fixed inset-y-0 left-0 z-50">
          <SidebarInner inDrawer />
        </div>
      </div>
    </>
  );
}