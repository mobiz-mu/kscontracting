"use client";

import * as React from "react";
import {
  Download,
  FileText,
  RefreshCw,
  Search,
  Calendar,
  Users,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================
   Types
========================================= */

type InvoiceRow = {
  id: string;
  invoice_no: string;
  customer_id: number;
  customer_name: string | null;
  invoice_date: string | null;
  status: string;
  total_amount: number | null;
  balance_amount: number | null;
  created_at: string | null;
};

type InvoicesResponse = {
  ok: boolean;
  data: InvoiceRow[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  error?: any;
  supabaseError?: any;
};

type SOARow = {
  customerId: string;
  customerName: string;
  invoiceCount: number;
  billed: number;
  outstanding: number;
  settled: number;
  lastInvoiceDate: string | null;
};

/* =========================================
   Helpers
========================================= */

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(v: any) {
  const n = n2(v);
  return `Rs ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
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
    throw new Error(`Expected JSON but got ${ct || "unknown"}: ${raw.slice(0, 120)}`);
  }

  return JSON.parse(raw) as T;
}

function exportCsv(filename: string, head: string[], rows: (string | number)[][]) {
  const csv =
    [head, ...rows]
      .map((row) =>
        row
          .map((c) => {
            const s = String(c ?? "");
            const needs = s.includes(",") || s.includes('"') || s.includes("\n");
            return needs ? `"${s.replaceAll('"', '""')}"` : s;
          })
          .join(",")
      )
      .join("\n") + "\n";

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================================
   UI atoms
========================================= */

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
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
        className
      )}
    >
      {children}
    </span>
  );
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
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(600px_260px_at_12%_0%,rgba(7,27,56,0.10),transparent_60%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "slate",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "blue" | "orange" | "emerald" | "rose";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 ring-slate-200 text-slate-700",
    blue: "bg-blue-50 ring-blue-200 text-blue-700",
    orange: "bg-[#ff7a18]/10 ring-[#ff7a18]/20 text-[#c25708]",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-700",
    rose: "bg-rose-50 ring-rose-200 text-rose-700",
  };

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_14px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
          {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
        </div>
        <div className={cn("grid size-11 place-items-center rounded-2xl ring-1", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

/* =========================================
   Page
========================================= */

export default function SalesSOAPage() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [balanceFilter, setBalanceFilter] = React.useState<"ALL" | "OUTSTANDING" | "SETTLED">("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [invoiceRows, setInvoiceRows] = React.useState<InvoiceRow[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const res = await safeGet<InvoicesResponse>("/api/invoices?page=1&pageSize=500");
      setInvoiceRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load statement of account");
      setInvoiceRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const soaRows = React.useMemo<SOARow[]>(() => {
    const q = search.trim().toLowerCase();
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const grouped = new Map<string, SOARow>();

    for (const inv of invoiceRows) {
      const invDateRaw = inv.invoice_date || inv.created_at;
      const invDate = safeDate(invDateRaw);

      if (fromDate && (!invDate || invDate < fromDate)) continue;
      if (toDate && (!invDate || invDate > toDate)) continue;

      const customerId = String(inv.customer_id ?? "");
      const customerName = inv.customer_name || "—";

      const key = customerId || customerName;
      const existing = grouped.get(key) ?? {
        customerId,
        customerName,
        invoiceCount: 0,
        billed: 0,
        outstanding: 0,
        settled: 0,
        lastInvoiceDate: null,
      };

      const total = n2(inv.total_amount);
      const balance = n2(inv.balance_amount);
      const settled = Math.max(0, total - balance);

      existing.invoiceCount += 1;
      existing.billed += total;
      existing.outstanding += balance;
      existing.settled += settled;

      if (!existing.lastInvoiceDate) {
        existing.lastInvoiceDate = invDateRaw ?? null;
      } else {
        const currentLast = safeDate(existing.lastInvoiceDate);
        if (invDate && (!currentLast || invDate > currentLast)) {
          existing.lastInvoiceDate = invDateRaw ?? null;
        }
      }

      grouped.set(key, existing);
    }

    let rows = Array.from(grouped.values());

    if (q) {
      rows = rows.filter((r) => {
        const hay = `${r.customerName} ${r.customerId}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (balanceFilter === "OUTSTANDING") {
      rows = rows.filter((r) => r.outstanding > 0);
    }

    if (balanceFilter === "SETTLED") {
      rows = rows.filter((r) => r.outstanding <= 0);
    }

    return rows.sort((a, b) => b.outstanding - a.outstanding || b.billed - a.billed);
  }, [invoiceRows, search, balanceFilter, from, to]);

  const totals = React.useMemo(() => {
    const customers = soaRows.length;
    const billed = soaRows.reduce((s, r) => s + n2(r.billed), 0);
    const collected = soaRows.reduce((s, r) => s + n2(r.settled), 0);
    const outstanding = soaRows.reduce((s, r) => s + n2(r.outstanding), 0);
    const customersOutstanding = soaRows.filter((r) => r.outstanding > 0).length;

    return {
      customers,
      billed,
      collected,
      outstanding,
      customersOutstanding,
    };
  }, [soaRows]);

  function onExport() {
    const head = [
      "Customer ID",
      "Customer Name",
      "Invoice Count",
      "Billed",
      "Collected",
      "Outstanding",
      "Last Invoice Date",
    ];

    const body = soaRows.map((r) => [
      r.customerId || "—",
      r.customerName,
      r.invoiceCount,
      n2(r.billed).toFixed(2),
      n2(r.settled).toFixed(2),
      n2(r.outstanding).toFixed(2),
      fmtDate(r.lastInvoiceDate),
    ]);

    exportCsv("statement-of-account.csv", head, body);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>
                  <FileText className="size-3.5 text-slate-500" />
                  Reports
                </Chip>
                <Chip className="bg-[#ff7a18]/10 text-[#c25708] ring-[#ff7a18]/20">
                  <Users className="size-3.5" />
                  Statement of Account
                </Chip>
                <Chip className="bg-slate-900 text-white ring-slate-900/20">
                  <CircleDollarSign className="size-3.5 text-white/85" />
                  MUR
                </Chip>
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Statement of Account (SOA)
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Running balance per customer with live invoice totals, collections, and outstanding exposure.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-2xl h-11 bg-white/70 shadow-sm hover:bg-white"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Button
                className="rounded-2xl h-11 bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_16px_44px_rgba(7,27,56,0.18)]"
                onClick={onExport}
                disabled={soaRows.length === 0}
              >
                <Download className="mr-2 size-4" />
                Export SOA
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer name or customer ID..."
                className="h-11 rounded-2xl pl-10"
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-white/70 ring-1 ring-slate-200 px-3 h-11">
              <Calendar className="size-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-white/70 ring-1 ring-slate-200 px-3 h-11">
              <Calendar className="size-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-white/70 ring-1 ring-slate-200 px-3 h-11">
              <Filter className="size-4 text-slate-400" />
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as "ALL" | "OUTSTANDING" | "SETTLED")}
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
              >
                <option value="ALL">All Customers</option>
                <option value="OUTSTANDING">Outstanding Only</option>
                <option value="SETTLED">Settled Only</option>
              </select>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          icon={Users}
          label="Customers"
          value={String(totals.customers)}
          sub={`${totals.customersOutstanding} with outstanding balance`}
          tone="blue"
        />
        <KPICard
          icon={CircleDollarSign}
          label="Billed"
          value={money(totals.billed)}
          sub="Total invoiced value"
          tone="emerald"
        />
        <KPICard
          icon={Wallet}
          label="Collected"
          value={money(totals.collected)}
          sub="Settled value"
          tone="blue"
        />
        <KPICard
          icon={AlertTriangle}
          label="Outstanding"
          value={money(totals.outstanding)}
          sub="Open customer balances"
          tone={totals.outstanding > 0 ? "orange" : "emerald"}
        />
      </div>

      {/* SOA Table */}
      <Card3D className="p-0">
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">SOA View</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Customer-level billed, collected, and outstanding balances from live invoices.
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {loading ? "Loading…" : `${soaRows.length} customer row(s)`}
          </div>
        </div>

        <div className="overflow-hidden rounded-b-3xl border-t border-slate-200">
          <div className="overflow-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th className="w-[120px]">Customer ID</th>
                  <th>Customer Name</th>
                  <th className="w-[140px] text-right">Invoices</th>
                  <th className="w-[160px] text-right">Billed</th>
                  <th className="w-[160px] text-right">Collected</th>
                  <th className="w-[160px] text-right">Outstanding</th>
                  <th className="w-[160px]">Last Invoice</th>
                  <th className="w-[140px]">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-40 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4 text-right"><div className="ml-auto h-4 w-12 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4 text-right"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4 text-right"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4 text-right"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-24 rounded-full bg-slate-200" /></td>
                    </tr>
                  ))
                ) : soaRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                      No SOA data found for this filter.
                    </td>
                  </tr>
                ) : (
                  soaRows.map((r) => {
                    const outstanding = n2(r.outstanding);
                    const settled = outstanding <= 0;

                    return (
                      <tr key={`${r.customerId}-${r.customerName}`} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-4 text-slate-700">{r.customerId || "—"}</td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{r.customerName}</div>
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-slate-900">
                          {r.invoiceCount}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-slate-900">
                          {money(r.billed)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-blue-700">
                          {money(r.settled)}
                        </td>

                        <td className={cn(
                          "px-5 py-4 text-right font-extrabold",
                          settled ? "text-emerald-700" : "text-slate-900"
                        )}>
                          {money(r.outstanding)}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {fmtDate(r.lastInvoiceDate)}
                        </td>

                        <td className="px-5 py-4">
                          {settled ? (
                            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 className="mr-2 size-3.5" />
                              Settled
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                              <AlertTriangle className="mr-2 size-3.5" />
                              Outstanding
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {soaRows.length > 0 ? (
                <tfoot className="bg-slate-50">
                  <tr className="[&>td]:px-5 [&>td]:py-4 [&>td]:font-extrabold">
                    <td colSpan={3} className="text-right text-slate-700">
                      TOTALS
                    </td>
                    <td className="text-right text-slate-900">{money(totals.billed)}</td>
                    <td className="text-right text-blue-700">{money(totals.collected)}</td>
                    <td className="text-right text-slate-900">{money(totals.outstanding)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      </Card3D>
    </div>
  );
}