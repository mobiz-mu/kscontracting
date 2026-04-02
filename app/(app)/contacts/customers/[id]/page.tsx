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
  PencilLine,
  Save,
  X,
  BadgeCheck,
  RefreshCw,
  Hash,
  UserCircle2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Customer = {
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
};

type CustomerApiResponse = {
  ok: boolean;
  data?: Customer[];
  error?: any;
  supabaseError?: any;
};

type CustomerSaveResponse = {
  ok: boolean;
  data?: Customer;
  error?: any;
  supabaseError?: any;
};

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

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    try {
      const j = JSON.parse(raw);
      throw new Error(
        j?.error?.message ?? j?.error ?? j?.message ?? `HTTP ${res.status}`
      );
    } catch {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 180)}`);
    }
  }

  if (!ct.includes("application/json")) {
    throw new Error(
      `Expected JSON. Got ${ct || "unknown"}: ${raw.slice(0, 120)}`
    );
  }

  return JSON.parse(raw) as T;
}

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String((params as any)?.id ?? "").trim();

  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

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

  function fillForm(c: Customer) {
    setForm({
      name: c.name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      vat_no: c.vat_no ?? "",
      brn: c.brn ?? "",
      address: c.address ?? "",
      contact_person: c.contact_person ?? "",
      notes: c.notes ?? "",
      is_active: c.is_active ?? true,
    });
  }

  async function loadCustomer() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/customers", { cache: "no-store" });
      const json = await safeJson<CustomerApiResponse>(res);

      if (!json?.ok) {
        throw new Error(json?.error ?? "Failed to load customer");
      }

      const found =
        (json.data ?? []).find((c: Customer) => String(c.id) === id) ?? null;

      if (!found) {
        throw new Error("Customer not found");
      }

      setCustomer(found);
      fillForm(found);
    } catch (e: any) {
      setError(e?.message || "Failed to load customer");
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (id) void loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit() {
    if (!customer) return;
    fillForm(customer);
    setSuccess("");
    setError("");
    setEditing(true);
  }

  function cancelEdit() {
    if (!customer) return;
    fillForm(customer);
    setSuccess("");
    setError("");
    setEditing(false);
  }

  function validate() {
    if (!form.name.trim()) return "Customer name is required.";
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

      const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson<CustomerSaveResponse>(res);

      if (!json?.ok) {
        throw new Error(json?.error ?? "Failed to save customer");
      }

      const updatedCustomer: Customer = {
        ...(customer ?? { id }),
        ...payload,
      };

      setCustomer(updatedCustomer);
      fillForm(updatedCustomer);
      setEditing(false);
      setSuccess("Customer updated successfully.");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-slate-600">
        Loading customer...
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="p-6">
        <Link
          href="/contacts/customers"
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error || "Customer not found"}
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
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
                  href="/contacts/customers"
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm text-white backdrop-blur-sm hover:bg-white/16"
                >
                  <ArrowLeft size={16} />
                  Back
                </Link>

                <Chip className="bg-white/12 text-white ring-white/15">
                  <Building2 className="size-3.5 text-white/85" />
                  Customer Record
                </Chip>

                <Chip className="bg-white/12 text-white ring-white/15">
                  <Hash className="size-3.5 text-white/85" />
                  ID {customer.id}
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
                {customer.name}
              </h1>

              <div className="mt-2 text-sm text-blue-50/90 sm:text-[15px]">
                Premium customer details and edit workspace.
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
                        Update the customer details below, then click Save Changes.
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
              {!editing ? (
                <Button
                  type="button"
                  onClick={startEdit}
                  className="h-11 rounded-2xl bg-[linear-gradient(135deg,#fff7ed_0%,#fed7aa_35%,#fb923c_100%)] px-5 font-semibold text-slate-900 shadow-[0_16px_40px_rgba(251,146,60,0.25)] hover:brightness-[1.02]"
                >
                  <PencilLine className="mr-2 size-4" />
                  Edit Customer
                </Button>
              ) : null}
            </div>
          </div>

          {success ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          {error && customer ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </Surface>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Surface className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-extrabold tracking-tight text-slate-950">
              Customer Details
            </div>
            {editing ? (
              <Chip className="bg-orange-50 text-orange-700 ring-orange-200">
                <PencilLine className="size-3.5" />
                Editing
              </Chip>
            ) : null}
          </div>

          {!editing ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <InfoRow icon={Building2} label="Name" value={customer.name || "—"} />
              <InfoRow icon={Mail} label="Email" value={customer.email || "—"} />
              <InfoRow icon={Phone} label="Phone" value={customer.phone || "—"} />
              <InfoRow icon={FileText} label="VAT Number" value={customer.vat_no || "—"} />
              <InfoRow icon={FileText} label="BRN" value={customer.brn || "—"} />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={<span className="whitespace-pre-line">{customer.address || "—"}</span>}
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Customer Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Enter customer name"
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
                  icon={UserCircle2}
                  label="Contact Person"
                  value={customer.contact_person || "—"}
                />
                <InfoRow
                  icon={FileText}
                  label="Notes"
                  value={<span className="whitespace-pre-line">{customer.notes || "—"}</span>}
                />
                <InfoRow
                  icon={ShieldCheck}
                  label="Status"
                  value={customer.is_active ? "Active" : "Inactive"}
                />
                <InfoRow
                  icon={Hash}
                  label="Created At"
                  value={customer.created_at || "—"}
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
                    {customer.created_at || "—"}
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