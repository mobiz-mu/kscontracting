"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Building2,
  BadgeCheck,
  Mail,
  Phone,
  Hash,
  PencilLine,
  ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Supplier = {
  id: number;
  name: string;
  brn?: string | null;
  vat_no?: string | null;
  email?: string | null;
  phone?: string | null;
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

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "slate" | "blue" | "emerald" | "orange";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 ring-slate-200 text-slate-700",
    blue: "bg-blue-50 ring-blue-200 text-blue-700",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-700",
    orange: "bg-orange-50 ring-orange-200 text-orange-700",
  };

  return (
    <div className="rounded-[24px] border border-slate-200/90 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_14px_35px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-[26px] font-extrabold leading-none tracking-tight text-slate-950">
            {value}
          </div>
        </div>

        <div
          className={cn(
            "grid size-12 place-items-center rounded-2xl ring-1",
            tones[tone]
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadSuppliers() {
    try {
      setLoading(true);

      const url = search.trim()
        ? `/api/suppliers?q=${encodeURIComponent(search.trim())}`
        : `/api/suppliers`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load suppliers");
      }

      setSuppliers(json.data || []);
    } catch (e: any) {
      alert(e.message || "Failed to load suppliers");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSuppliers = suppliers.length;
  const withEmail = suppliers.filter((s) => !!s.email).length;
  const withPhone = suppliers.filter((s) => !!s.phone).length;
  const withVatOrBrn = suppliers.filter((s) => !!s.vat_no || !!s.brn).length;

  return (
    <div className="space-y-5">
      <Surface className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(700px_300px_at_110%_0%,rgba(255,153,51,0.20),transparent_50%)]" />

        <div className="relative px-4 py-5 sm:px-6 sm:py-6 xl:px-7 xl:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip className="bg-white/12 text-white ring-white/15">
                  <Building2 className="size-3.5 text-white/85" />
                  Contacts
                </Chip>

                <Chip className="bg-[#ff8a1e]/18 text-[#ffd6ad] ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  Supplier Register
                </Chip>

                <Chip className="bg-white text-[#071b38] ring-white/80">
                  <Building2 className="size-3.5 text-[#071b38]" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                Suppliers
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-50/90 sm:text-[15px]">
                Premium supplier workspace for KS Contracting with quick search,
                clean vendor visibility, and direct edit access for each supplier record.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                onClick={loadSuppliers}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              <Link href="/contacts/suppliers/new">
                <Button className="h-11 rounded-2xl bg-[#ff8a1e] px-5 font-semibold text-white shadow-[0_14px_35px_rgba(255,138,30,0.30)] hover:bg-[#f07c0f]">
                  <Plus className="mr-2 h-4 w-4" />
                  New Supplier
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-[520px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-2xl border-white/15 bg-white pl-10 text-slate-900 shadow-sm placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void loadSuppliers();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Suppliers Shown"
          value={String(totalSuppliers)}
          tone="blue"
        />
        <StatCard
          icon={Mail}
          label="With Email"
          value={String(withEmail)}
          tone="emerald"
        />
        <StatCard
          icon={Phone}
          label="With Phone"
          value={String(withPhone)}
          tone="orange"
        />
        <StatCard
          icon={Hash}
          label="VAT / BRN"
          value={String(withVatOrBrn)}
          tone="slate"
        />
      </div>

      <Surface>
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight text-slate-950">
                Supplier Register
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Visible edit access has been added directly in the actions column.
              </div>
            </div>

            <div className="text-xs font-medium text-slate-500">
              {loading ? "Loading…" : `${suppliers.length} shown`}
            </div>
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr className="text-left text-[12px] font-bold uppercase tracking-[0.14em]">
                <th className="p-4">Supplier</th>
                <th className="p-4">BRN</th>
                <th className="p-4">VAT</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No suppliers found
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="p-4 font-semibold text-slate-900">
                      <Link
                        href={`/contacts/suppliers/${s.id}`}
                        className="text-[#071b38] hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>

                    <td className="p-4 text-slate-700">{s.brn || "-"}</td>
                    <td className="p-4 text-slate-700">{s.vat_no || "-"}</td>
                    <td className="p-4 text-slate-700">{s.email || "-"}</td>
                    <td className="p-4 text-slate-700">{s.phone || "-"}</td>

                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/contacts/suppliers/${s.id}`}>
                          <Button
                            variant="outline"
                            className="h-10 rounded-2xl border-orange-200 bg-orange-50 px-4 text-orange-700 hover:bg-orange-100"
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>

                        <Link
                          href={`/contacts/suppliers/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-sm font-medium text-blue-600 hover:underline"
                        >
                          Open
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden p-4 sm:p-5">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-10 text-center text-slate-500">
              Loading suppliers...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-10 text-center text-slate-500">
              No suppliers found
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.05)]"
                >
                  <div className="text-base font-extrabold text-slate-900">
                    {s.name}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        BRN
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {s.brn || "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        VAT
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {s.vat_no || "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Email
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {s.email || "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Phone
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {s.phone || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/contacts/suppliers/${s.id}`}>
                      <Button className="h-10 rounded-2xl bg-[linear-gradient(135deg,#fff7ed_0%,#fed7aa_35%,#fb923c_100%)] font-semibold text-slate-900 shadow-[0_16px_40px_rgba(251,146,60,0.25)] hover:brightness-[1.02]">
                        <PencilLine className="mr-2 h-4 w-4" />
                        Edit Supplier
                      </Button>
                    </Link>

                    <Link href={`/contacts/suppliers/${s.id}`}>
                      <Button variant="outline" className="h-10 rounded-2xl">
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}