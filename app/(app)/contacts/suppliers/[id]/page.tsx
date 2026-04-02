"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Building2,
  BadgeCheck,
  PencilLine,
  Save,
  X,
  Mail,
  Phone,
  Hash,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Supplier = {
  id: number | string;
  name: string;
  brn?: string | null;
  vat_no?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string | null;
};

type ApiResp = { ok: boolean; data?: Supplier; error?: any };

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    try {
      const j = JSON.parse(raw);
      throw new Error(
        j?.error?.message ?? j?.error ?? j?.message ?? `HTTP ${res.status}`
      );
    } catch {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`);
    }
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got ${ct || "unknown"}`);
  }

  return JSON.parse(raw) as T;
}

async function safeMutation<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    ...init,
  });

  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    try {
      const j = JSON.parse(raw);
      throw new Error(
        j?.error?.message ?? j?.error ?? j?.message ?? `HTTP ${res.status}`
      );
    } catch {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`);
    }
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got ${ct || "unknown"}`);
  }

  return JSON.parse(raw) as T;
}

function getParamId(p: any): string {
  const raw = p?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white",
        "shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        "bg-white/90 text-slate-700 ring-1 ring-white/70 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-10 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
        <Icon className="size-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </div>
        <div className="mt-1 break-words text-sm font-semibold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function SupplierDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = getParamId(params);

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [supplier, setSupplier] = React.useState<Supplier | null>(null);

  const [form, setForm] = React.useState({
    name: "",
    brn: "",
    vat_no: "",
    email: "",
    phone: "",
    address: "",
  });

  function fillForm(s: Supplier) {
    setForm({
      name: s.name ?? "",
      brn: s.brn ?? "",
      vat_no: s.vat_no ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
    });
  }

  const load = React.useCallback(async () => {
    if (!id) {
      setErr("Missing supplier id");
      setSupplier(null);
      return;
    }

    setLoading(true);
    setErr("");
    setSuccess("");

    try {
      const j = await safeGet<ApiResp>(`/api/suppliers/${encodeURIComponent(id)}`);
      if (!j.ok) throw new Error(j?.error ?? "Supplier not found");

      const loadedSupplier = j.data ?? null;
      setSupplier(loadedSupplier);

      if (loadedSupplier) {
        fillForm(loadedSupplier);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load supplier");
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit() {
    if (!supplier) return;
    fillForm(supplier);
    setErr("");
    setSuccess("");
    setEditing(true);
  }

  function cancelEdit() {
    if (!supplier) return;
    fillForm(supplier);
    setErr("");
    setSuccess("");
    setEditing(false);
  }

  function validate() {
    if (!form.name.trim()) return "Supplier name is required.";
    return "";
  }

  async function saveChanges() {
    const validation = validate();
    if (validation) {
      setErr(validation);
      return;
    }

    try {
      setSaving(true);
      setErr("");
      setSuccess("");

      const payload = {
        id,
        name: form.name.trim(),
        brn: form.brn.trim() || null,
        vat_no: form.vat_no.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      };

      const json = await safeMutation<ApiResp>(
        `/api/suppliers/${encodeURIComponent(id)}`,
        {
          body: JSON.stringify(payload),
        }
      );

      if (!json?.ok) {
        throw new Error(json?.error ?? "Failed to update supplier");
      }

      const updatedSupplier: Supplier = {
        ...(supplier ?? { id }),
        ...payload,
      };

      setSupplier(updatedSupplier);
      fillForm(updatedSupplier);
      setEditing(false);
      setSuccess("Supplier updated successfully.");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Surface className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(700px_300px_at_110%_0%,rgba(255,153,51,0.20),transparent_50%)]" />

        <div className="relative px-4 py-5 sm:px-6 sm:py-6 xl:px-7 xl:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                  onClick={() => router.push("/contacts/suppliers")}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back
                </Button>

                <Chip className="bg-white/12 text-white ring-white/15">
                  <Building2 className="size-3.5 text-white/85" />
                  Supplier Record
                </Chip>

                <Chip className="bg-white/12 text-white ring-white/15">
                  <Hash className="size-3.5 text-white/85" />
                  ID {supplier?.id ?? "—"}
                </Chip>

                <Chip className="bg-[#ff8a1e]/18 text-[#ffd6ad] ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                {supplier?.name ?? (loading ? "Loading…" : "Supplier")}
              </h1>

              <div className="mt-2 text-sm text-blue-50/90 sm:text-[15px]">
                Premium supplier details and edit workspace.
              </div>

              {editing ? (
                <div className="mt-4 rounded-[24px] border border-[#ffbe82]/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.18)_0%,rgba(255,231,204,0.18)_30%,rgba(255,155,61,0.22)_100%)] p-4 backdrop-blur-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <PencilLine className="size-4 text-[#ffd6ad]" />
                        Edit mode is active
                      </div>
                      <div className="mt-1 text-sm text-blue-50/90">
                        Update the supplier details below, then click Save Changes.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        onClick={saveChanges}
                        disabled={saving}
                        className="h-11 rounded-2xl bg-[linear-gradient(135deg,#ffffff_0%,#ffe7cc_25%,#ff9b3d_70%,#ff7a18_100%)] px-5 font-semibold text-slate-900 shadow-[0_18px_44px_rgba(255,138,30,0.24)] hover:brightness-[1.03]"
                      >
                        {saving ? (
                          <RefreshCw className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 size-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                onClick={load}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              {!editing ? (
                <Button
                  type="button"
                  onClick={startEdit}
                  className="h-11 rounded-2xl bg-[linear-gradient(135deg,#fff7ed_0%,#fed7aa_35%,#fb923c_100%)] px-5 font-semibold text-slate-900 shadow-[0_16px_40px_rgba(251,146,60,0.25)] hover:brightness-[1.02]"
                >
                  <PencilLine className="mr-2 size-4" />
                  Edit Supplier
                </Button>
              ) : null}
            </div>
          </div>

          {success ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          {err ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}
        </div>
      </Surface>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Surface className="p-5 sm:p-6">
          <div className="text-lg font-extrabold tracking-tight text-slate-950">
            Supplier Details
          </div>

          {!editing ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <InfoRow icon={Building2} label="Name" value={supplier?.name ?? "—"} />
              <InfoRow icon={Hash} label="BRN" value={supplier?.brn ?? "—"} />
              <InfoRow icon={Hash} label="VAT No" value={supplier?.vat_no ?? "—"} />
              <InfoRow icon={Mail} label="Email" value={supplier?.email ?? "—"} />
              <InfoRow icon={Phone} label="Phone" value={supplier?.phone ?? "—"} />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={<span className="whitespace-pre-line">{supplier?.address ?? "—"}</span>}
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Supplier Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  BRN
                </label>
                <Input
                  value={form.brn}
                  onChange={(e) => updateField("brn", e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Enter BRN"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  VAT No
                </label>
                <Input
                  value={form.vat_no}
                  onChange={(e) => updateField("vat_no", e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Enter VAT number"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Email
                </label>
                <Input
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Phone
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Enter phone"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
                  placeholder="Enter address"
                />
              </div>
            </div>
          )}
        </Surface>

        <div className="space-y-4">
          <Surface className="p-5 sm:p-6">
            <div className="text-lg font-extrabold tracking-tight text-slate-950">
              Record Info
            </div>

            <div className="mt-5 space-y-4">
              <InfoRow
                icon={ShieldCheck}
                label="Status"
                value="Active"
              />
              <InfoRow
                icon={Hash}
                label="Supplier ID"
                value={supplier?.id ?? "—"}
              />
              <InfoRow
                icon={Hash}
                label="Created At"
                value={supplier?.created_at ?? "—"}
              />
            </div>

            <div className="mt-5">
              <Link
                href="/contacts/suppliers"
                className="text-sm font-semibold text-[#071b38] hover:underline"
              >
                Back to suppliers list
              </Link>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}