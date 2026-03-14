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
  Filter,
  TrendingUp,
  Landmark,
  Building2,
  Users,
  Wallet,
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
  invoice_type?: string | null;
  invoice_date?: string | null;
  customer_name?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type CreditNoteRow = {
  id: string;
  credit_no: string;
  credit_date?: string | null;
  customer_name?: string | null;
  subtotal?: number | null;
  vat?: number | null;
  total_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type VatRow = {
  id: string;
  doc_type: "INVOICE" | "CREDIT_NOTE" | string;
  doc_no: string;
  doc_date: string;
  customer_name: string;
  taxable_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  status: string;
};

type ApiInvoiceList = {
  ok: boolean;
  data?: InvoiceRow[];
};

type ApiCreditNoteList = {
  ok: boolean;
  data?: CreditNoteRow[];
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

function pct(v: any) {
  const x = n2(v);
  return `${Math.round(x * 10000) / 100}%`;
}

function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON. Got ${ct || "unknown"}`);
  }

  return JSON.parse(text) as T;
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

function badgeTone(st?: string) {
  const s = String(st || "").toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (s === "ISSUED") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  if (s === "PARTIALLY_PAID") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  if (s === "VOID") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (s === "DRAFT") return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
}

function inRange(dateValue: string | null | undefined, from?: string, to?: string) {
  const d = safeDate(dateValue);
  if (!d) return false;

  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;

  if (f) f.setHours(0, 0, 0, 0);
  if (t) t.setHours(23, 59, 59, 999);

  if (f && d < f) return false;
  if (t && d > t) return false;
  return true;
}

/* =========================================
   UI
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

/* =========================================
   Page
========================================= */

export default function VatReportPage() {
  const today = React.useMemo(() => new Date(), []);
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const monthEnd = String(new Date(yyyy, today.getMonth() + 1, 0).getDate()).padStart(2, "0");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const [q, setQ] = React.useState("");
  const [from, setFrom] = React.useState(`${yyyy}-${mm}-01`);
  const [to, setTo] = React.useState(`${yyyy}-${mm}-${monthEnd}`);
  const [docType, setDocType] = React.useState<"ALL" | "INVOICE" | "CREDIT_NOTE">("ALL");
  const [status, setStatus] = React.useState("ALL");

  const [invoiceRows, setInvoiceRows] = React.useState<InvoiceRow[]>([]);
  const [creditNoteRows, setCreditNoteRows] = React.useState<CreditNoteRow[]>([]);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const [invRes, cnRes] = await Promise.all([
        safeGet<ApiInvoiceList>("/api/invoices?page=1&pageSize=500"),
        safeGet<ApiCreditNoteList>("/api/credit-notes?page=1&pageSize=500"),
      ]);

      setInvoiceRows(Array.isArray(invRes.data) ? invRes.data : []);
      setCreditNoteRows(Array.isArray(cnRes.data) ? cnRes.data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load VAT report");
      setInvoiceRows([]);
      setCreditNoteRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const rows = React.useMemo<VatRow[]>(() => {
    const invoiceVatRows: VatRow[] = invoiceRows.map((r) => ({
      id: r.id,
      doc_type: "INVOICE",
      doc_no: r.invoice_no,
      doc_date: r.invoice_date || r.created_at || "",
      customer_name: r.customer_name || "—",
      taxable_amount: n2(r.subtotal),
      vat_rate: 0.15,
      vat_amount: n2(r.vat_amount),
      total_amount: n2(r.total_amount),
      status: r.status || "—",
    }));

    const creditVatRows: VatRow[] = creditNoteRows.map((r) => ({
      id: r.id,
      doc_type: "CREDIT_NOTE",
      doc_no: r.credit_no,
      doc_date: r.credit_date || r.created_at || "",
      customer_name: r.customer_name || "—",
      taxable_amount: -Math.abs(n2(r.subtotal)),
      vat_rate: 0.15,
      vat_amount: -Math.abs(n2(r.vat)),
      total_amount: -Math.abs(n2(r.total_amount)),
      status: r.status || "—",
    }));

    return [...invoiceVatRows, ...creditVatRows].sort((a, b) => {
      return String(b.doc_date).localeCompare(String(a.doc_date));
    });
  }, [invoiceRows, creditNoteRows]);

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();

    return rows.filter((r) => {
      const hay = `${r.doc_no} ${r.customer_name} ${r.doc_type} ${r.status}`.toLowerCase();

      const okQuery = !qq || hay.includes(qq);
      const okDate = inRange(r.doc_date, from, to);
      const okType = docType === "ALL" || r.doc_type === docType;
      const okStatus = status === "ALL" || String(r.status).toUpperCase() === status;

      return okQuery && okDate && okType && okStatus;
    });
  }, [rows, q, from, to, docType, status]);

  const totals = React.useMemo(() => {
    const taxable = filtered.reduce((s, r) => s + n2(r.taxable_amount), 0);
    const vat = filtered.reduce((s, r) => s + n2(r.vat_amount), 0);
    const total = filtered.reduce((s, r) => s + n2(r.total_amount), 0);
    const docs = filtered.length;
    const invoices = filtered.filter((r) => r.doc_type === "INVOICE").length;
    const creditNotes = filtered.filter((r) => r.doc_type === "CREDIT_NOTE").length;
    return { taxable, vat, total, docs, invoices, creditNotes };
  }, [filtered]);

  const topCustomers = React.useMemo(() => {
    const map = new Map<string, { name: string; taxable: number; vat: number; total: number }>();

    filtered.forEach((r) => {
      const key = r.customer_name || "—";
      const prev = map.get(key) || { name: key, taxable: 0, vat: 0, total: 0 };
      prev.taxable += n2(r.taxable_amount);
      prev.vat += n2(r.vat_amount);
      prev.total += n2(r.total_amount);
      map.set(key, prev);
    });

    return Array.from(map.values())
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 8);
  }, [filtered]);

  function exportCurrentCsv() {
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
      fmtDate(r.doc_date),
      r.customer_name,
      n2(r.taxable_amount).toFixed(2),
      pct(r.vat_rate),
      n2(r.vat_amount).toFixed(2),
      n2(r.total_amount).toFixed(2),
      r.status,
    ]);

    exportCsv(`vat-report_${from}_${to}.csv`, head, body);
  }

  function exportCustomerCsv() {
    const head = ["Customer", "Taxable Amount", "VAT Amount", "Total"];
    const body = topCustomers.map((r) => [
      r.name,
      r.taxable.toFixed(2),
      r.vat.toFixed(2),
      r.total.toFixed(2),
    ]);

    exportCsv(`vat-by-customer_${from}_${to}.csv`, head, body);
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
                  Enterprise Reports
                </Chip>
                <Chip className="bg-[#ff7a18]/10 text-[#c25708] ring-[#ff7a18]/20">
                  <BadgeCheck className="size-3.5" />
                  VAT Control
                </Chip>
                <Chip className="bg-slate-900 text-white ring-slate-900/20">
                  <CircleDollarSign className="size-3.5 text-white/85" />
                  MUR
                </Chip>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                VAT Report Centre
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Management-grade VAT reporting from live invoices and credit notes, with executive
                totals, customer concentration analysis, and export-ready detail lines.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-2xl h-11 bg-white/70 shadow-sm hover:bg-white"
                onClick={() => void loadReport()}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Button
                className="rounded-2xl h-11 bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_16px_44px_rgba(7,27,56,0.18)]"
                onClick={exportCurrentCsv}
                disabled={filtered.length === 0}
              >
                <Download className="mr-2 size-4" />
                Export VAT CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search doc no, customer, status..."
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
                value={docType}
                onChange={(e) => setDocType(e.target.value as "ALL" | "INVOICE" | "CREDIT_NOTE")}
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="INVOICE">Invoices</option>
                <option value="CREDIT_NOTE">Credit Notes</option>
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-white/70 ring-1 ring-slate-200 px-3 h-11">
              <Building2 className="size-4 text-slate-400" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="VOID">Void</option>
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
          icon={TrendingUp}
          label="Taxable Base"
          value={money(totals.taxable)}
          sub={`${totals.invoices} invoice rows in scope`}
          tone="blue"
        />
        <KPICard
          icon={BadgeCheck}
          label="VAT Amount"
          value={money(totals.vat)}
          sub="Net VAT after credit note offsets"
          tone="orange"
        />
        <KPICard
          icon={Wallet}
          label="Gross Total"
          value={money(totals.total)}
          sub="Taxable plus VAT"
          tone="emerald"
        />
        <KPICard
          icon={Landmark}
          label="Document Volume"
          value={String(totals.docs)}
          sub={`${totals.creditNotes} credit note rows included`}
          tone="slate"
        />
      </div>

      {/* Summary by customer */}
      <Card3D className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Customer VAT Concentration</div>
            <div className="mt-1 text-sm text-slate-600">
              Highest contributing customers for the selected reporting period.
            </div>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={exportCustomerCsv}
            disabled={topCustomers.length === 0}
          >
            <Download className="mr-2 size-4" />
            Export Customer Summary
          </Button>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                <th>Customer</th>
                <th className="text-right">Taxable Amount</th>
                <th className="text-right">VAT Amount</th>
                <th className="text-right">Gross Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No customer summary available for this period.
                  </td>
                </tr>
              ) : (
                topCustomers.map((r) => (
                  <tr key={r.name}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{money(r.taxable)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(r.vat)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">{money(r.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card3D>

      {/* Detail table */}
      <Card3D className="p-0">
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Detailed VAT Lines</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Real invoice and credit note figures pulled from KS transaction data.
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
                        Try changing date range, type, or status.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={`${r.doc_type}-${r.id}`} className="hover:bg-slate-50/70 transition">
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
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            badgeTone(r.status)
                          )}
                        >
                          {String(r.status || "—").replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {filtered.length > 0 ? (
                <tfoot className="bg-slate-50">
                  <tr className="[&>td]:px-5 [&>td]:py-4 [&>td]:font-extrabold">
                    <td colSpan={4} className="text-right text-slate-700">
                      NET TOTALS
                    </td>
                    <td className="text-right text-slate-900">{money(totals.taxable)}</td>
                    <td className="text-right text-slate-700">{pct(0.15)}</td>
                    <td className="text-right text-slate-900">{money(totals.vat)}</td>
                    <td className="text-right text-slate-900">{money(totals.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      </Card3D>

      {/* Footer enterprise note */}
      <Card3D className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Management Note</div>
            <div className="mt-1 text-sm text-slate-600">
              This VAT report is based on live invoice and credit note values. Credit notes reduce
              taxable base, VAT, and gross totals automatically.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip>
              <Users className="size-3.5 text-slate-500" />
              Enterprise Finance View
            </Chip>
            <Chip>
              <BadgeCheck className="size-3.5 text-slate-500" />
              15% VAT Logic
            </Chip>
            <Chip>
              <Download className="size-3.5 text-slate-500" />
              Export Ready
            </Chip>
          </div>
        </div>
      </Card3D>
    </div>
  );
}