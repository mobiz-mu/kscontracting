"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building2,
  User,
  PencilLine,
  Trash2,
  Save,
  X,
  BadgeCheck,
  RefreshCw,
  Hash,
  ShieldCheck,
  HardHat,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SubContractor = {
  id: string | number;
  name: string;
  email: string | null;
  phone: string | null;
  vat_no: string | null;
  brn: string | null;
  address: string | null;
  contact_person?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiResp = { ok: boolean; data?: SubContractor; error?: any };

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

export default function SubContractorDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String((params as any)?.id ?? "").trim();

  const [row, setRow] = React.useState<SubContractor | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    vat_no: "",
    brn: "",
    address: "",
    contact_person: "",
    notes: "",
    is_active: true,
  });

  function fillForm(data: SubContractor) {
    setForm({
      name: data.name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      vat_no: data.vat_no ?? "",
      brn: data.brn ?? "",
      address: data.address ?? "",
      contact_person: data.contact_person ?? "",
      notes: data.notes ?? "",
      is_active: data.is_active ?? true,
    });
  }

  async function load() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/sub-contractors/${id}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load sub contractor");
      }

      const loaded = json.data ?? null;
      setRow(loaded);
      if (loaded) fillForm(loaded);
    } catch (e: any) {
      setError(e?.message || "Failed to load sub contractor");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (id) void load();
  }, [id]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit() {
    if (!row) return;
    fillForm(row);
    setError("");
    setSuccess("");
    setEditing(true);
  }

  function cancelEdit() {
    if (!row) return;
    fillForm(row);
    setError("");
    setSuccess("");
    setEditing(false);
  }

  function validate() {
    if (!form.name.trim()) return "Sub contractor name is required.";
    return "";
  }

  async function saveChanges() {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        id,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        vat_no: form.vat_no.trim() || null,
        brn: form.brn.trim() || null,
        address: form.address.trim() || null,
        contact_person: form.contact_person.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      };

      const json = await safeMutation<ApiResp>(
        `/api/sub-contractors/${encodeURIComponent(id)}`,
        {
          body: JSON.stringify(payload),
        }
      );

      if (!json?.ok) {
        throw new Error(json?.error ?? "Failed to update sub contractor");
      }

      const updated: SubContractor = {
        ...(row ?? { id }),
        ...payload,
      };

      setRow(updated);
      fillForm(updated);
      setEditing(false);
      setSuccess("Sub contractor updated successfully.");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update sub contractor");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow() {
    const ok = window.confirm(
      "Are you sure you want to delete this sub contractor?"
    );
    if (!ok) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/sub-contractors/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to delete sub contractor");
      }

      router.push("/contacts/sub-contractors");
    } catch (e: any) {
      alert(e?.message || "Failed to delete sub contractor");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-600">Loading sub contractor...</div>;
  }

  if (error || !row) {
    return (
      <div className="p-6">
        <Link
          href="/contacts/sub-contractors"
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to sub contractors
        </Link>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error || "Sub contractor not found"}
        </div>
      </div>
    );
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
                <Link
                  href="/contacts/sub-contractors"
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm text-white backdrop-blur-sm hover:bg-white/16"
                >
                  <ArrowLeft size={16} />
                  Back
                </Link>

                <Chip className="bg-white/12 text-white ring-white/15">
                  <HardHat className="size-3.5 text-white/85" />
                  Sub Contractor Record
                </Chip>

                <Chip className="bg-white/12 text-white ring-white/15">
                  <Hash className="size-3.5 text-white/85" />
                  ID {row.id}
                </Chip>

                <Chip
                  className={
                    form.is_active
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-slate-100 text-slate-700 ring-slate-200"
                  }
                >
                  <ShieldCheck className="size-3.5" />
                  {form.is_active ? "Active" : "Inactive"}
                </Chip>

                <Chip className="bg-[#ff8a1e]/18 text-[#ffd6ad] ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                {row.name}
              </h1>

              <div className="mt-2 text-sm text-blue-50/90 sm:text-[15px]">
                Premium sub contractor details and edit workspace.
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
                        Update the sub contractor details below, then click Save Changes.
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
                  Edit Sub Contractor
                </Button>
              ) : null}

              {!editing ? (
                <Button
                  variant="destructive"
                  className="h-11 rounded-2xl"
                  onClick={deleteRow}
                  disabled={deleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>

          {success ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </Surface>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Surface className="p-5 sm:p-6">
          <div className="text-lg font-extrabold tracking-tight text-slate-950">
            Sub Contractor Details
          </div>

          {!editing ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <InfoRow icon={Building2} label="Name" value={row.name || "—"} />
              <InfoRow icon={Mail} label="Email" value={row.email || "—"} />
              <InfoRow icon={Phone} label="Phone" value={row.phone || "—"} />
              <InfoRow icon={FileText} label="VAT Number" value={row.vat_no || "—"} />
              <InfoRow icon={FileText} label="BRN" value={row.brn || "—"} />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={<span className="whitespace-pre-line">{row.address || "—"}</span>}
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Enter sub contractor name"
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

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  VAT Number
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
                  Contact Person
                </label>
                <Input
                  value={form.contact_person}
                  onChange={(e) => updateField("contact_person", e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Enter contact person"
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
              Other Info
            </div>

            {!editing ? (
              <div className="mt-5 space-y-4">
                <InfoRow
                  icon={User}
                  label="Contact Person"
                  value={row.contact_person || "—"}
                />
                <InfoRow
                  icon={FileText}
                  label="Notes"
                  value={<span className="whitespace-pre-line">{row.notes || "—"}</span>}
                />
                <InfoRow
                  icon={ShieldCheck}
                  label="Status"
                  value={row.is_active ? "Active" : "Inactive"}
                />
                <InfoRow
                  icon={Hash}
                  label="Created At"
                  value={row.created_at || "—"}
                />
                <InfoRow
                  icon={Hash}
                  label="Updated At"
                  value={row.updated_at || "—"}
                />
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
                    placeholder="Enter notes"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </label>
                  <select
                    value={form.is_active ? "active" : "inactive"}
                    onChange={(e) => updateField("is_active", e.target.value === "active")}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Created At
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {row.created_at || "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Updated At
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {row.updated_at || "—"}
                  </div>
                </div>
              </div>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}