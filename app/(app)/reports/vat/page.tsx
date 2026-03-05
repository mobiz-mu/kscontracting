"use client";

import * as React from "react";
import {
  Calendar,
  Download,
  FileText,
  RefreshCw,
  Search,
  ArrowUpRight,
  AlertTriangle,
  BadgeCheck,
  CircleDollarSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================
   Types (simple + safe)
   - Wire to your real API later
========================================= */

type VatRow = {
  id: string;
  doc_type: "INVOICE" | "CREDIT_NOTE" | "RECEIPT" | string;
  doc_no: string;
  doc_date: string; // yyyy-mm-dd
  customer_name: string;
  taxable_amount: number;
  vat_rate: number; // 0.15
  vat_amount: number;
  total_amount: number;
  status: string;
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
  return `Rs ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function pct(v: any) {
  const x = n2(v);
  return `${Math.round(x * 10000) / 100}%`;
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
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(700px_260px_at_16%_0%,rgba(7,27,56,0.12),transparent_60%)]" />
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

function badgeTone(st?: string) {
  const s = String(st || "").toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (s === "ISSUED") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  if (s === "PARTIALLY_PAID") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  if (s === "VOID") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (s === "DRAFT") return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
}

/* =========================================
   Page
========================================= */

export default function VatReportPage() {
  // Filters (local UI; wire to API later)
  const today = React.useMemo(() => new Date(), []);
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const [q, setQ] = React.useState("");
  const [from, setFrom] = React.useState(`${yyyy}-${mm}-01`);
  const [to, setTo] = React.useState(`${yyyy}-${mm}-${String(new Date(yyyy, today.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);

  // Demo rows so the page is not empty (replace with real API later)
  const [rows, setRows] = React.useState<VatRow[]>([
    {
      id: "demo-1",
      doc_type: "INVOICE",
      doc_no: "INV-000123",
      doc_date: `${yyyy}-${mm}-05`,
      customer_name: "Demo Customer Ltd",
      taxable_amount: 10000,
      vat_rate: 0.15,
      vat_amount: 1500,
      total_amount: 11500,
      status: "ISSUED",
    },
    {
      id: "demo-2",
      doc_type: "INVOICE",
      doc_no: "INV-000124",
      doc_date: `${yyyy}-${mm}-12`,
      customer_name: "Another Client",
      taxable_amount: 5000,
      vat_rate: 0.15,
      vat_amount: 750,
      total_amount: 5750,
      status: "PAID",
    },
    {
      id: "demo-3",
      doc_type: "CREDIT_NOTE",
      doc_no: "CN-000010",
      doc_date: `${yyyy}-${mm}-16`,
      customer_name: "Demo Customer Ltd",
      taxable_amount: -2000,
      vat_rate: 0.15,
      vat_amount: -300,
      total_amount: -2300,
      status: "ISSUED",
    },
  ]);

  function applyFilters(list: VatRow[]) {
    const qq = q.trim().toLowerCase();
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;
    if (f) f.setHours(0, 0, 0, 0);
    if (t) t.setHours(23, 59, 59, 999);

    return list.filter((r) => {
      const dt = r.doc_date ? new Date(r.doc_date) : null;
      const okDate =
        (!f || (dt && dt >= f)) &&
        (!t || (dt && dt <= t));

      if (!okDate) return false;

      if (!qq) return true;
      const hay = `${r.doc_no} ${r.customer_name} ${r.doc_type} ${r.status}`.toLowerCase();
      return hay.includes(qq);
    });
  }

  const filtered = React.useMemo(() => applyFilters(rows), [rows, q, from, to]);

  const totals = React.useMemo(() => {
    const taxable = filtered.reduce((s, r) => s + n2(r.taxable_amount), 0);
    const vat = filtered.reduce((s, r) => s + n2(r.vat_amount), 0);
    const total = filtered.reduce((s, r) => s + n2(r.total_amount), 0);
    const docs = filtered.length;
    return { taxable, vat, total, docs };
  }, [filtered]);

  async function refresh() {
    // placeholder so build passes; wire to /api/reports/vat later
    setLoading(true);
    setErr("");
    try {
      // Example:
      // const res = await fetch(`/api/reports/vat?from=${from}&to=${to}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
      // const j = await res.json();
      // setRows(j.data)
      await new Promise((r) => setTimeout(r, 350));
    } catch (e: any) {
      setErr(e?.message || "Failed to load VAT report");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const head = [
      "Doc Type",
      "Doc No",
      "Doc Date",
      "Customer",
      "Taxable Amount",
      "VAT Rate",
      "VAT Amount",
      "Total",
      "Status",
    ];
    const body = filtered.map((r) => [
      r.doc_type,
      r.doc_no,
      r.doc_date,
      r.customer_name,
      n2(r.taxable_amount).toFixed(2),
      pct(r.vat_rate),
      n2(r.vat_amount).toFixed(2),
      n2(r.total_amount).toFixed(2),
      r.status,
    ]);

    const csv =
      [head, ...body]
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
    a.download = `vat-report_${from || "from"}_${to || "to"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>
                  <FileText className="size-3.5 text-slate-500" />
                  Reports
                </Chip>
                <Chip className="bg-[#ff7a18]/10 text-[#c25708] ring-[#ff7a18]/20">
                  <BadgeCheck className="size-3.5" />
                  VAT
                </Chip>
                <Chip className="bg-slate-900 text-white ring-slate-900/20">
                  <CircleDollarSign className="size-3.5 text-white/85" />
                  MUR
                </Chip>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                VAT Report
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Filter by period and export for filing (demo data until API is wired).
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-2xl h-11 bg-white/70 shadow-sm hover:bg-white"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Button
                className="rounded-2xl h-11 bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_16px_44px_rgba(7,27,56,0.18)]"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                title="Export current filtered rows to CSV"
              >
                <Download className="mr-2 size-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search doc no, customer, status…"
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

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 ring-1 ring-slate-200 px-4 h-11">
              <span className="text-xs font-semibold text-slate-600">Docs</span>
              <span className="text-sm font-extrabold text-slate-900">{totals.docs}</span>
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KPICard
          icon={ArrowUpRight}
          label="Taxable amount"
          value={money(totals.taxable)}
          sub="Sum of taxable base"
          tone="blue"
        />
        <KPICard
          icon={BadgeCheck}
          label="VAT amount"
          value={money(totals.vat)}
          sub="VAT collected (net)"
          tone="orange"
        />
        <KPICard
          icon={CircleDollarSign}
          label="Grand total"
          value={money(totals.total)}
          sub="Taxable + VAT (net)"
          tone="emerald"
        />
      </div>

      {/* Table */}
      <Card3D className="p-0">
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">VAT transactions</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Includes invoices and credit notes (demo dataset).
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {loading ? "Loading…" : `${filtered.length} row(s)`}
          </div>
        </div>

        <div className="overflow-hidden rounded-b-3xl border-t border-slate-200">
          <div className="overflow-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th className="w-[130px]">Type</th>
                  <th className="w-[160px]">Document</th>
                  <th className="w-[140px]">Date</th>
                  <th>Customer</th>
                  <th className="w-[160px] text-right">Taxable</th>
                  <th className="w-[120px] text-right">VAT %</th>
                  <th className="w-[160px] text-right">VAT</th>
                  <th className="w-[160px] text-right">Total</th>
                  <th className="w-[140px]">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                      No VAT transactions found for this filter.
                      <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
                        <AlertTriangle className="size-4 text-slate-400" />
                        Tip: change date range or clear search.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                          {String(r.doc_type || "—")}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">{r.doc_no}</div>
                        <div className="text-xs text-slate-500">ID: {r.id}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 text-slate-700">
                          <Calendar className="size-4 text-slate-400" />
                          {fmtDate(r.doc_date)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{r.customer_name || "—"}</div>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {money(r.taxable_amount)}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-700">
                        {pct(r.vat_rate)}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {money(r.vat_amount)}
                      </td>

                      <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                        {money(r.total_amount)}
                      </td>

                      <td className="px-5 py-4">
                        <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", badgeTone(r.status))}>
                          {String(r.status || "—").replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card3D>
    </div>
  );
}