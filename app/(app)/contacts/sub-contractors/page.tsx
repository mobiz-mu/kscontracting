"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  HardHat,
  BadgeCheck,
  Mail,
  Phone,
  Hash,
  PencilLine,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SubContractor = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  vat_no: string | null;
  brn: string | null;
  created_at: string | null;
};

type APIResponse = {
  ok: boolean;
  data: SubContractor[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
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

export default function SubContractorsPage() {
  const [rows, setRows] = React.useState<SubContractor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 25;

  async function load(targetPage = page) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("page", String(targetPage));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/sub-contractors?${params.toString()}`, {
        cache: "no-store",
      });

      const json: APIResponse = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error((json as any)?.error ?? "Failed to load sub contractors");
      }

      setRows(json.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load sub contractors");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalRows = rows.length;
  const withEmail = rows.filter((r) => !!r.email).length;
  const withPhone = rows.filter((r) => !!r.phone).length;
  const withVatOrBrn = rows.filter((r) => !!r.vat_no || !!r.brn).length;

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
                  <HardHat className="size-3.5 text-white/85" />
                  Contacts
                </Chip>

                <Chip className="bg-[#ff8a1e]/18 text-[#ffd6ad] ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  Sub Contractor Register
                </Chip>

                <Chip className="bg-white text-[#071b38] ring-white/80">
                  <Building2 className="size-3.5 text-[#071b38]" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                Sub Contractors
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-50/90 sm:text-[15px]">
                Premium sub-contractor workspace for KS Contracting with quick
                search, clean trade partner visibility, and direct edit access
                for each record.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                onClick={() => {
                  setPage(1);
                  void load(1);
                }}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
                />
                Refresh
              </Button>

              <Link href="/contacts/sub-contractors/new">
                <Button className="h-11 rounded-2xl bg-[#ff8a1e] px-5 font-semibold text-white shadow-[0_14px_35px_rgba(255,138,30,0.30)] hover:bg-[#f07c0f]">
                  <Plus className="mr-2 h-4 w-4" />
                  New Sub Contractor
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-[520px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search sub contractor..."
                className="h-12 rounded-2xl border-white/15 bg-white pl-10 text-slate-900 shadow-sm placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    void load(1);
                  }
                }}
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          icon={HardHat}
          label="Sub Contractors Shown"
          value={String(totalRows)}
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
                Sub Contractor Register
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Visible edit access has been added directly in the actions column.
              </div>
            </div>

            <div className="text-xs font-medium text-slate-500">
              {loading ? "Loading…" : `${rows.length} shown`}
            </div>
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left text-[12px] font-bold uppercase tracking-[0.14em]">
                <th className="p-4">Sub Contractor</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">VAT</th>
                <th className="p-4">BRN</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading sub contractors...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No sub contractors found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="p-4 font-semibold text-slate-900">
                      {row.name}
                    </td>
                    <td className="p-4 text-slate-700">{row.email ?? "—"}</td>
                    <td className="p-4 text-slate-700">{row.phone ?? "—"}</td>
                    <td className="p-4 text-slate-700">{row.vat_no ?? "—"}</td>
                    <td className="p-4 text-slate-700">{row.brn ?? "—"}</td>
                    <td className="p-4 text-slate-700">{fmtDate(row.created_at)}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/contacts/sub-contractors/${row.id}`}>
                          <Button
                            variant="outline"
                            className="h-10 rounded-2xl border-orange-200 bg-orange-50 px-4 text-orange-700 hover:bg-orange-100"
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>

                        <Link
                          href={`/contacts/sub-contractors/${row.id}`}
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
              Loading sub contractors...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 px-4 py-10 text-center text-slate-500">
              No sub contractors found
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.05)]"
                >
                  <div className="text-base font-extrabold text-slate-900">
                    {row.name}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Email
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {row.email ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Phone
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {row.phone ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        VAT
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {row.vat_no ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        BRN
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {row.brn ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Created {fmtDate(row.created_at)}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/contacts/sub-contractors/${row.id}`}>
                      <Button className="h-10 rounded-2xl bg-[linear-gradient(135deg,#fff7ed_0%,#fed7aa_35%,#fb923c_100%)] font-semibold text-slate-900 shadow-[0_16px_40px_rgba(251,146,60,0.25)] hover:brightness-[1.02]">
                        <PencilLine className="mr-2 h-4 w-4" />
                        Edit Sub Contractor
                      </Button>
                    </Link>

                    <Link href={`/contacts/sub-contractors/${row.id}`}>
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

        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-4 sm:px-5">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Button>

          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || rows.length < pageSize}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </Surface>
    </div>
  );
}