"use client";

import * as React from "react";
import {
  Shield,
  Building2,
  Settings2,
  Save,
  RefreshCw,
  CheckCircle2,
  FileText,
  Percent,
  Hash,
  Palette,
  Users,
  LockKeyhole,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================
   Types
========================= */

type SettingsTab = "company" | "access" | "system";

type CompanySettingsRow = {
  id: number;
  company_name: string;
  brn: string | null;
  vat_no: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  vat_rate: number;
  invoice_prefix: string;
  quote_prefix: string;
  credit_prefix: string;
  next_invoice_no: number;
  next_quote_no: number;
  next_credit_no: number;
  pdf_footer_note: string | null;
  updated_at: string;
};

type RoleRow = {
  id: number;
  key: string;
  name: string;
};

type PermissionRow = {
  id: number;
  key: string;
  description: string | null;
};

type RolePermissionRow = {
  role_id: number;
  permission_id: number;
};

type CompanyApiResponse = {
  ok: boolean;
  data?: CompanySettingsRow;
  error?: any;
};

type AccessApiResponse = {
  ok: boolean;
  data?: {
    roles: RoleRow[];
    permissions: PermissionRow[];
    role_permissions: RolePermissionRow[];
  };
  error?: any;
};

const DEFAULT_SETTINGS: CompanySettingsRow = {
  id: 0,
  company_name: "KS CONTRACTING LTD",
  brn: "C18160190",
  vat_no: "27658608",
  address: "MORCELLEMENT CARLOS, TAMARIN, MAURITIUS",
  phone: "59416756",
  email: "ks.contracting@hotmail.com",
  currency: "MUR",
  vat_rate: 0.15,
  invoice_prefix: "INV",
  quote_prefix: "QTN",
  credit_prefix: "CN",
  next_invoice_no: 1,
  next_quote_no: 1,
  next_credit_no: 1,
  pdf_footer_note:
    "Thank you for your business. Please use the invoice number as payment reference.",
  updated_at: new Date().toISOString(),
};

/* =========================
   Utils
========================= */

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

function MetricCard({
  title,
  value,
  icon: Icon,
  tone = "slate",
  sub,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  tone?: "slate" | "navy" | "orange" | "emerald";
  sub?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-white text-slate-900 ring-slate-200",
    navy: "bg-[#071b38] text-white ring-white/10",
    orange: "bg-[#ff7a18] text-white ring-white/10",
    emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  };

  return (
    <div className={cn("rounded-3xl p-5 ring-1", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={cn("text-xs font-semibold", tone === "slate" || tone === "emerald" ? "text-slate-500" : "text-white/70")}>
            {title}
          </div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
          {sub ? (
            <div className={cn("mt-1 text-xs", tone === "slate" || tone === "emerald" ? "text-slate-500" : "text-white/70")}>
              {sub}
            </div>
          ) : null}
        </div>
        <div className={cn(
          "grid size-11 place-items-center rounded-2xl",
          tone === "navy" ? "bg-white/10" : tone === "orange" ? "bg-white/15" : "bg-slate-50"
        )}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition",
        active
          ? "border-[#ff7a18]/30 bg-[#ff7a18]/10 shadow-sm"
          : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid size-10 place-items-center rounded-xl",
            active ? "bg-white text-[#c25708]" : "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-600">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

/* =========================
   Page
========================= */

export default function SettingsPage() {
  const [tab, setTab] = React.useState<SettingsTab>("company");

  const [loading, setLoading] = React.useState(true);
  const [savingCompany, setSavingCompany] = React.useState(false);
  const [savingAccess, setSavingAccess] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState("");

  const [settings, setSettings] = React.useState<CompanySettingsRow>(DEFAULT_SETTINGS);

  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [permissions, setPermissions] = React.useState<PermissionRow[]>([]);
  const [rolePermissions, setRolePermissions] = React.useState<RolePermissionRow[]>([]);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [companyRes, accessRes] = await Promise.all([
        safeGet<CompanyApiResponse>("/api/settings/company"),
        safeGet<AccessApiResponse>("/api/settings/access"),
      ]);

      if (!companyRes.ok || !companyRes.data) {
        throw new Error(companyRes?.error ?? "Failed to load company settings");
      }

      if (!accessRes.ok || !accessRes.data) {
        throw new Error(accessRes?.error ?? "Failed to load access settings");
      }

      setSettings(companyRes.data);
      setRoles(accessRes.data.roles ?? []);
      setPermissions(accessRes.data.permissions ?? []);
      setRolePermissions(accessRes.data.role_permissions ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadAll();
  }, []);

  function update<K extends keyof CompanySettingsRow>(key: K, value: CompanySettingsRow[K]) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaved(false);
  }

  function hasPermission(roleId: number, permissionId: number) {
    return rolePermissions.some(
      (x) => x.role_id === roleId && x.permission_id === permissionId
    );
  }

  function togglePermission(roleId: number, permissionId: number) {
    setRolePermissions((prev) => {
      const exists = prev.some(
        (x) => x.role_id === roleId && x.permission_id === permissionId
      );

      if (exists) {
        return prev.filter(
          (x) => !(x.role_id === roleId && x.permission_id === permissionId)
        );
      }

      return [...prev, { role_id: roleId, permission_id: permissionId }];
    });

    setSaved(false);
  }

  async function handleSaveCompany() {
    setSavingCompany(true);
    setSaved(false);
    setError("");

    try {
      const payload = {
        company_name: settings.company_name,
        brn: settings.brn,
        vat_no: settings.vat_no,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        currency: settings.currency,
        vat_rate: Number(settings.vat_rate) * (Number(settings.vat_rate) <= 1 ? 100 : 1),
        invoice_prefix: settings.invoice_prefix,
        quote_prefix: settings.quote_prefix,
        credit_prefix: settings.credit_prefix,
        next_invoice_no: settings.next_invoice_no,
        next_quote_no: settings.next_quote_no,
        next_credit_no: settings.next_credit_no,
        pdf_footer_note: settings.pdf_footer_note,
      };

      const res = await safePost<CompanyApiResponse>("/api/settings/company", payload);
      if (!res.ok || !res.data) throw new Error(res?.error ?? "Failed to save company settings");

      setSettings(res.data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (e: any) {
      setError(e?.message || "Failed to save company settings");
    } finally {
      setSavingCompany(false);
    }
  }

  async function handleSaveAccess() {
    setSavingAccess(true);
    setSaved(false);
    setError("");

    try {
      await safePost<AccessApiResponse>("/api/settings/access", {
        matrix: rolePermissions,
      });

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (e: any) {
      setError(e?.message || "Failed to save access settings");
    } finally {
      setSavingAccess(false);
    }
  }

  const roleCount = roles.length;
  const permissionCount = permissions.length;
  const activeMatrixCount = rolePermissions.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-500">Admin Control Center</div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Settings
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Premium company configuration, access control matrix, VAT defaults and document numbering.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => void loadAll()}
                disabled={loading || savingCompany || savingAccess}
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>

              <Button
                className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
                onClick={() => {
                  if (tab === "access") {
                    void handleSaveAccess();
                  } else {
                    void handleSaveCompany();
                  }
                }}
                disabled={loading || savingCompany || savingAccess}
              >
                {savingCompany || savingAccess ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="mr-2 size-4" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Company"
          value={settings.company_name || "—"}
          icon={Building2}
          tone="navy"
          sub="Live from company_settings"
        />
        <MetricCard
          title="Currency & VAT"
          value={`${settings.currency} • ${(Number(settings.vat_rate) <= 1 ? settings.vat_rate * 100 : settings.vat_rate).toFixed(0)}%`}
          icon={Percent}
          tone="orange"
          sub="System defaults"
        />
        <MetricCard
          title="Roles / Permissions"
          value={`${roleCount} / ${permissionCount}`}
          icon={Shield}
          tone="emerald"
          sub={`${activeMatrixCount} active mappings`}
        />
        <MetricCard
          title="Next Invoice"
          value={`${settings.invoice_prefix}-${String(settings.next_invoice_no).padStart(4, "0")}`}
          icon={Hash}
          tone="slate"
          sub="Document numbering"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        {/* Tabs */}
        <div className="space-y-3">
          <TabButton
            active={tab === "company"}
            onClick={() => setTab("company")}
            icon={Building2}
            title="Company Profile"
            desc="Legal data, business contacts and PDF footer."
          />

          <TabButton
            active={tab === "access"}
            onClick={() => setTab("access")}
            icon={Shield}
            title="Access Control"
            desc="Real role-permission matrix backed by database."
          />

          <TabButton
            active={tab === "system"}
            onClick={() => setTab("system")}
            icon={Settings2}
            title="System Preferences"
            desc="VAT, prefixes and numbering defaults."
          />
        </div>

        {/* Content */}
        <Card3D className="p-5">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 ring-1 ring-slate-200">
              Loading settings...
            </div>
          ) : null}

          {!loading && tab === "company" ? (
            <div className="space-y-5">
              <div>
                <div className="text-base font-extrabold text-slate-900">Company Profile</div>
                <div className="mt-1 text-sm text-slate-600">
                  These values are stored in <span className="font-semibold">company_settings</span> and are used across invoices, quotations and print documents.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Company Name">
                  <Input
                    value={settings.company_name ?? ""}
                    onChange={(e) => update("company_name", e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="Phone">
                  <Input
                    value={settings.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="BRN">
                  <Input
                    value={settings.brn ?? ""}
                    onChange={(e) => update("brn", e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="VAT No">
                  <Input
                    value={settings.vat_no ?? ""}
                    onChange={(e) => update("vat_no", e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="Email">
                  <Input
                    value={settings.email ?? ""}
                    onChange={(e) => update("email", e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Address">
                    <textarea
                      value={settings.address ?? ""}
                      onChange={(e) => update("address", e.target.value)}
                      className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/20"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label="PDF Footer Note">
                    <textarea
                      value={settings.pdf_footer_note ?? ""}
                      onChange={(e) => update("pdf_footer_note", e.target.value)}
                      className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/20"
                    />
                  </Field>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && tab === "system" ? (
            <div className="space-y-5">
              <div>
                <div className="text-base font-extrabold text-slate-900">System Preferences</div>
                <div className="mt-1 text-sm text-slate-600">
                  Numbering and VAT defaults loaded from <span className="font-semibold">company_settings</span>.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Currency">
                  <Input
                    value={settings.currency ?? "MUR"}
                    onChange={(e) => update("currency", e.target.value.toUpperCase())}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="VAT Rate (%)">
                  <Input
                    type="number"
                    value={Number(settings.vat_rate) <= 1 ? settings.vat_rate * 100 : settings.vat_rate}
                    onChange={(e) => update("vat_rate", Number(e.target.value || 0) / 100)}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="Invoice Prefix">
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={settings.invoice_prefix ?? ""}
                      onChange={(e) => update("invoice_prefix", e.target.value)}
                      className="h-11 rounded-2xl pl-10"
                    />
                  </div>
                </Field>

                <Field label="Next Invoice No">
                  <Input
                    type="number"
                    value={settings.next_invoice_no ?? 1}
                    onChange={(e) => update("next_invoice_no", Number(e.target.value || 1))}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="Quotation Prefix">
                  <Input
                    value={settings.quote_prefix ?? ""}
                    onChange={(e) => update("quote_prefix", e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="Next Quote No">
                  <Input
                    type="number"
                    value={settings.next_quote_no ?? 1}
                    onChange={(e) => update("next_quote_no", Number(e.target.value || 1))}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="Credit Prefix">
                  <Input
                    value={settings.credit_prefix ?? ""}
                    onChange={(e) => update("credit_prefix", e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <Field label="Next Credit No">
                  <Input
                    type="number"
                    value={settings.next_credit_no ?? 1}
                    onChange={(e) => update("next_credit_no", Number(e.target.value || 1))}
                    className="h-11 rounded-2xl"
                  />
                </Field>

                <div className="md:col-span-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <Palette className="size-4 text-slate-500" />
                      Live Preview Snapshot
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        Next Invoice:{" "}
                        <span className="font-extrabold text-slate-900">
                          {settings.invoice_prefix}-{String(settings.next_invoice_no).padStart(4, "0")}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        Next Quote:{" "}
                        <span className="font-extrabold text-slate-900">
                          {settings.quote_prefix}-{String(settings.next_quote_no).padStart(4, "0")}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        Next Credit:{" "}
                        <span className="font-extrabold text-slate-900">
                          {settings.credit_prefix}-{String(settings.next_credit_no).padStart(4, "0")}
                        </span>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        VAT Default:{" "}
                        <span className="font-extrabold text-slate-900">
                          {(Number(settings.vat_rate) <= 1 ? settings.vat_rate * 100 : settings.vat_rate).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && tab === "access" ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-base font-extrabold text-slate-900">Access Control Matrix</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Manage which roles can access which modules and actions.
                  </div>
                </div>

                <Button
                  className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
                  onClick={() => void handleSaveAccess()}
                  disabled={savingAccess}
                >
                  {savingAccess ? (
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  Save Access Matrix
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Users className="size-4 text-slate-400" />
                    Roles
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">{roles.length}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <LockKeyhole className="size-4 text-slate-400" />
                    Permissions
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">{permissions.length}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <BadgeCheck className="size-4 text-slate-400" />
                    Active Links
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">{rolePermissions.length}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200">
                <div className="overflow-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                        <th className="w-[280px]">Permission</th>
                        {roles.map((role) => (
                          <th key={role.id} className="text-center min-w-[130px]">
                            <div className="font-extrabold text-slate-900">{role.name}</div>
                            <div className="mt-1 text-[11px] font-medium text-slate-500">{role.key}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-4 align-middle">
                            <div className="font-semibold text-slate-900">{permission.key}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {permission.description || "—"}
                            </div>
                          </td>

                          {roles.map((role) => {
                            const checked = hasPermission(role.id, permission.id);

                            return (
                              <td key={`${role.id}-${permission.id}`} className="px-4 py-4 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => togglePermission(role.id, permission.id)}
                                  className={cn(
                                    "relative inline-flex h-7 w-12 rounded-full transition",
                                    checked ? "bg-[#071b38]" : "bg-slate-200"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                                      checked ? "left-6" : "left-1"
                                    )}
                                  />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </Card3D>
      </div>
    </div>
  );
}