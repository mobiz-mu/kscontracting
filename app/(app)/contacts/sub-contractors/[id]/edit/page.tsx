"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  HardHat,
  BadgeCheck,
  Mail,
  Phone,
  Hash,
  MapPin,
  User,
  FileText,
  X,
  Building2,
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

export default function EditSubContractorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String((params as any)?.id ?? "").trim();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [vatNo, setVatNo] = React.useState("");
  const [brn, setBrn] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [contactPerson, setContactPerson] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

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

      const row: SubContractor = json.data;

      setName(row.name ?? "");
      setEmail(row.email ?? "");
      setPhone(row.phone ?? "");
      setVatNo(row.vat_no ?? "");
      setBrn(row.brn ?? "");
      setAddress(row.address ?? "");
      setContactPerson(row.contact_person ?? "");
      setNotes(row.notes ?? "");
      setIsActive(row.is_active ?? true);
    } catch (e: any) {
      setError(e?.message || "Failed to load sub contractor");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      if (!name.trim()) {
        setError("Sub contractor name is required.");
        return;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/sub-contractors/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          vat_no: vatNo.trim() || null,
          brn: brn.trim() || null,
          address: address.trim() || null,
          contact_person: contactPerson.trim() || null,
          notes: notes.trim() || null,
          is_active: isActive,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to update sub contractor");
      }

      setSuccess("Sub contractor updated successfully.");

      window.setTimeout(() => {
        router.push(`/contacts/sub-contractors/${id}`);
      }, 500);
    } catch (e: any) {
      setError(e?.message || "Failed to update sub contractor");
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    if (id) void load();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-slate-600">Loading sub contractor...</div>;
  }

  if (error && !name) {
    return (
      <div className="p-6">
        <Link
          href={`/contacts/sub-contractors/${id}`}
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to sub contractor
        </Link>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error}
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
                  href={`/contacts/sub-contractors/${id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm text-white backdrop-blur-sm hover:bg-white/16"
                >
                  <ArrowLeft size={16} />
                  Back
                </Link>

                <Chip className="bg-white/12 text-white ring-white/15">
                  <HardHat className="size-3.5 text-white/85" />
                  Edit Sub Contractor
                </Chip>

                <Chip className="bg-white/12 text-white ring-white/15">
                  <Hash className="size-3.5 text-white/85" />
                  ID {id}
                </Chip>

                <Chip
                  className={
                    isActive
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-slate-100 text-slate-700 ring-slate-200"
                  }
                >
                  <BadgeCheck className="size-3.5" />
                  {isActive ? "Active" : "Inactive"}
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                Edit Sub Contractor
              </h1>

              <div className="mt-2 text-sm text-blue-50/90 sm:text-[15px]">
                Update the sub contractor details, then save changes.
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                onClick={load}
                disabled={loading || saving}
              >
                <RefreshCw
                  className={cn("mr-2 size-4", (loading || saving) && "animate-spin")}
                />
                Refresh
              </Button>

              <Link href={`/contacts/sub-contractors/${id}`}>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                  disabled={saving}
                >
                  <X className="mr-2 size-4" />
                  Cancel
                </Button>
              </Link>

              <Button
                onClick={save}
                disabled={saving}
                className="h-11 rounded-2xl bg-[linear-gradient(135deg,#ffffff_0%,#ffe7cc_25%,#ff9b3d_70%,#ff7a18_100%)] px-5 font-semibold text-slate-900 shadow-[0_18px_44px_rgba(255,138,30,0.24)] hover:brightness-[1.03]"
              >
                {saving ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
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

      <Surface className="p-5 sm:p-6">
        <div className="text-lg font-extrabold tracking-tight text-slate-950">
          Sub Contractor Details
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Building2 className="size-4 text-slate-400" />
              Sub Contractor Name *
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-2xl" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Mail className="size-4 text-slate-400" />
              Email
            </label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-2xl" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Phone className="size-4 text-slate-400" />
              Phone
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-2xl" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <FileText className="size-4 text-slate-400" />
              VAT Number
            </label>
            <Input value={vatNo} onChange={(e) => setVatNo(e.target.value)} className="h-11 rounded-2xl" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Hash className="size-4 text-slate-400" />
              BRN
            </label>
            <Input value={brn} onChange={(e) => setBrn(e.target.value)} className="h-11 rounded-2xl" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <User className="size-4 text-slate-400" />
              Contact Person
            </label>
            <Input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <MapPin className="size-4 text-slate-400" />
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <FileText className="size-4 text-slate-400" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Status
            </label>
            <select
              value={isActive ? "active" : "inactive"}
              onChange={(e) => setIsActive(e.target.value === "active")}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Surface>
    </div>
  );
}