"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Search,
  RefreshCw,
  FileText,
  ArrowUpRight,
  Printer,
  CheckCircle2,
  FileCheck2,
  Clock3,
  Building2,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuoteRow = {
  id: string;
  quote_no?: string | null;
  quotation_no?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_vat?: string | null;
  customer_brn?: string | null;
  customer_address?: string | null;
  quote_date?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  vat_rate?: number | null;
  site_address?: string | null;
  created_at?: string | null;
  converted_invoice_id?: string | null;
};

type QuotationsResponse = {
  ok: boolean;
  data?: QuoteRow[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  kpi?: {
    totalQuotes: number;
    totalValue: number;
    pendingCount: number;
    acceptedCount: number;
    voidCount: number;
    byStatus?: Record<string, number>;
  };
  error?: any;
};

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(v: any) {
  const n = n2(v);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [yyyy, mm, dd] = v.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function quoteNo(row: QuoteRow) {
  return row.quote_no || row.quotation_no || "—";
}

function statusStyles(status?: string | null) {
  const s = String(status ?? "").toUpperCase();

  if (s === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (s === "VOID") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
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

function KpiCard({
  label,
  value,
  tone = "slate",
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "slate" | "navy" | "orange" | "emerald";
  sub?: string;
  icon: React.ElementType;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 ring-slate-200 text-slate-900",
    navy: "bg-[#071b38] text-white ring-white/10",
    orange: "bg-[#ff7a18] text-white ring-white/10",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-900",
  };

  return (
    <div className={cn("rounded-[24px] p-4 ring-1 sm:p-5", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.18em]",
              tone === "navy" || tone === "orange" ? "text-white/70" : "text-slate-500"
            )}
          >
            {label}
          </div>
          <div
            className={cn(
              "mt-2 text-[22px] font-extrabold tracking-tight sm:text-[24px]",
              tone === "navy" || tone === "orange" ? "text-white" : "text-slate-950"
            )}
          >
            {value}
          </div>
          {sub ? (
            <div
              className={cn(
                "mt-1 text-xs",
                tone === "navy" || tone === "orange" ? "text-white/75" : "text-slate-600"
              )}
            >
              {sub}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "grid size-11 place-items-center rounded-2xl ring-1",
            tone === "navy" || tone === "orange"
              ? "bg-white/10 ring-white/10"
              : "bg-white ring-slate-200"
          )}
        >
          <Icon
            className={cn(
              "size-5",
              tone === "navy" || tone === "orange" ? "text-white" : "text-slate-600"
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default function ConvertQuoteToInvoicePage() {
  const [rows, setRows] = React.useState<QuoteRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [kpi, setKpi] = React.useState<QuotationsResponse["kpi"] | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("status", status);
      params.set("page", "1");
      params.set("pageSize", "200");

      const res = await fetch(`/api/quotations?${params.toString()}`, {
        cache: "no-store",
      });

      const json: QuotationsResponse = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error((json as any)?.error ?? "Failed to load quotations");
      }

      setRows(json.data ?? []);
      setKpi(json.kpi ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load quotations");
      setRows([]);
      setKpi(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-5">
      <Surface>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(700px_300px_at_110%_0%,rgba(255,153,51,0.20),transparent_50%)]" />

        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
                <ArrowRightLeft className="size-3.5" />
                QUOTE CONVERSION HUB
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Convert Quote to Invoice
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-blue-50/90">
                Search all quotations created, review their status, and convert only accepted quotations into invoices.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Link href="/sales/quotations">
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                >
                  <FileText className="mr-2 size-4" />
                  All Quotations
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <KpiCard
          label="Total Quotes"
          value={String(kpi?.totalQuotes ?? rows.length)}
          icon={FileText}
          tone="slate"
        />
        <KpiCard
          label="Accepted"
          value={String(kpi?.acceptedCount ?? 0)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiCard
          label="Draft / Pending"
          value={String(kpi?.pendingCount ?? 0)}
          icon={Clock3}
          tone="orange"
        />
        <KpiCard
          label="Total Value"
          value={money(kpi?.totalValue ?? 0)}
          icon={Building2}
          tone="navy"
        />
      </div>

      <Surface className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto]">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Search quotations
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void load();
                  }}
                  placeholder="Search quote no, customer, site address..."
                  className="h-11 rounded-2xl pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
              >
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="VOID">Void</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => void load()}
                disabled={loading}
                className="h-11 w-full rounded-2xl bg-[#071b38] hover:bg-[#06142b] md:w-auto"
              >
                <Search className="mr-2 size-4" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </Surface>

      <Surface className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-base font-extrabold text-slate-900">
            Quotations Created
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Accepted quotations can be converted. Draft quotations must be accepted first.
          </div>
        </div>

        <div className="hidden xl:grid xl:grid-cols-[170px_minmax(0,1.2fr)_140px_140px_170px_320px] gap-4 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          <div>Quote No</div>
          <div>Customer</div>
          <div>Date</div>
          <div>Status</div>
          <div className="text-right">Total</div>
          <div className="text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-200 bg-white">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="h-4 w-48 rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-72 rounded bg-slate-200" />
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="h-12 rounded bg-slate-100" />
                    <div className="h-12 rounded bg-slate-100" />
                    <div className="h-12 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-slate-500">
              No quotations found.
            </div>
          ) : (
            rows.map((row) => {
              const statusValue = String(row.status ?? "DRAFT").toUpperCase();
              const canConvert = statusValue === "ACCEPTED" && !row.converted_invoice_id;
              const alreadyConverted = !!row.converted_invoice_id;

              return (
                <div key={row.id} className="px-5 py-4">
                  <div className="hidden xl:grid xl:grid-cols-[170px_minmax(0,1.2fr)_140px_140px_170px_320px] gap-4 items-center">
                    <div className="font-extrabold text-slate-900">{quoteNo(row)}</div>

                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold text-slate-900">
                        {row.customer_name || "—"}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500">
                        {row.site_address || row.customer_address || "—"}
                      </div>
                    </div>

                    <div className="text-sm text-slate-700">{fmtDate(row.quote_date)}</div>

                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1",
                          statusStyles(statusValue)
                        )}
                      >
                        {statusValue}
                      </span>
                    </div>

                    <div className="text-right font-extrabold text-slate-900">
                      {money(row.total_amount)}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Link href={`/sales/quotations/${encodeURIComponent(row.id)}`}>
                        <Button variant="outline" className="rounded-2xl">
                          <ArrowUpRight className="mr-2 size-4" />
                          Open
                        </Button>
                      </Link>

                      <Link href={`/sales/quotations/${encodeURIComponent(row.id)}/print`}>
                        <Button variant="outline" className="rounded-2xl">
                          <Printer className="mr-2 size-4" />
                          Print
                        </Button>
                      </Link>

                      {canConvert ? (
                        <Link href={`/sales/quotations/${encodeURIComponent(row.id)}/convert`}>
                          <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]">
                            <FileCheck2 className="mr-2 size-4" />
                            Convert
                          </Button>
                        </Link>
                      ) : null}

                      {alreadyConverted ? (
                        <Link href={`/sales/invoices/${encodeURIComponent(String(row.converted_invoice_id))}`}>
                          <Button className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
                            <ArrowUpRight className="mr-2 size-4" />
                            Invoice
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="xl:hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_24px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-extrabold text-slate-900">
                            {quoteNo(row)}
                          </div>

                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1",
                              statusStyles(statusValue)
                            )}
                          >
                            {statusValue}
                          </span>
                        </div>

                        <div className="mt-2 font-semibold text-slate-900">
                          {row.customer_name || "—"}
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                          {row.site_address || row.customer_address || "—"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Total
                        </div>
                        <div className="mt-1 text-lg font-extrabold text-slate-900">
                          {money(row.total_amount)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          <Calendar className="size-3.5" />
                          Quote Date
                        </div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {fmtDate(row.quote_date)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/sales/quotations/${encodeURIComponent(row.id)}`}>
                        <Button variant="outline" className="rounded-2xl">
                          <ArrowUpRight className="mr-2 size-4" />
                          Open
                        </Button>
                      </Link>

                      <Link href={`/sales/quotations/${encodeURIComponent(row.id)}/print`}>
                        <Button variant="outline" className="rounded-2xl">
                          <Printer className="mr-2 size-4" />
                          Print
                        </Button>
                      </Link>

                      {canConvert ? (
                        <Link href={`/sales/quotations/${encodeURIComponent(row.id)}/convert`}>
                          <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]">
                            <FileCheck2 className="mr-2 size-4" />
                            Convert
                          </Button>
                        </Link>
                      ) : null}

                      {alreadyConverted ? (
                        <Link href={`/sales/invoices/${encodeURIComponent(String(row.converted_invoice_id))}`}>
                          <Button className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
                            <ArrowUpRight className="mr-2 size-4" />
                            Invoice
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Surface>
    </div>
  );
}