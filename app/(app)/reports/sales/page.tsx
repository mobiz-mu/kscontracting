"use client";

import * as React from "react";
import {
  BarChart3,
  Calendar,
  CircleDollarSign,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Wallet,
  Landmark,
  BadgeCheck,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  total_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type ApiInvoiceList = {
  ok: boolean;
  data?: InvoiceRow[];
};

type ApiCreditNoteList = {
  ok: boolean;
  data?: CreditNoteRow[];
};

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

function statusTone(st?: string | null) {
  const s = String(st || "").toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (s === "ISSUED") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  if (s === "PARTIALLY_PAID") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  if (s === "VOID") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (s === "DRAFT") return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
}

export default function Page() {
  const today = React.useMemo(() => new Date(), []);
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const monthEnd = String(new Date(yyyy, today.getMonth() + 1, 0).getDate()).padStart(2, "0");

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const [q, setQ] = React.useState("");
  const [from, setFrom] = React.useState(`${yyyy}-${mm}-01`);
  const [to, setTo] = React.useState(`${yyyy}-${mm}-${monthEnd}`);
  const [status, setStatus] = React.useState("ALL");

  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [creditNotes, setCreditNotes] = React.useState<CreditNoteRow[]>([]);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const [invRes, cnRes] = await Promise.all([
        safeGet<ApiInvoiceList>("/api/invoices?page=1&pageSize=500"),
        safeGet<ApiCreditNoteList>("/api/credit-notes?page=1&pageSize=500"),
      ]);

      setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
      setCreditNotes(Array.isArray(cnRes.data) ? cnRes.data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load sales report");
      setInvoices([]);
      setCreditNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const filteredInvoices = React.useMemo(() => {
    const qq = q.trim().toLowerCase();

    return invoices.filter((r) => {
      const hay = `${r.invoice_no} ${r.customer_name ?? ""} ${r.status ?? ""} ${r.invoice_type ?? ""}`.toLowerCase();
      const okQuery = !qq || hay.includes(qq);
      const okDate = inRange(r.invoice_date || r.created_at, from, to);
      const okStatus = status === "ALL" || String(r.status).toUpperCase() === status;
      return okQuery && okDate && okStatus;
    });
  }, [invoices, q, from, to, status]);

  const filteredCreditNotes = React.useMemo(() => {
    return creditNotes.filter((r) => inRange(r.credit_date || r.created_at, from, to));
  }, [creditNotes, from, to]);

  const totals = React.useMemo(() => {
    const salesSubtotal = filteredInvoices.reduce((s, r) => s + n2(r.subtotal), 0);
    const salesVat = filteredInvoices.reduce((s, r) => s + n2(r.vat_amount), 0);
    const salesTotal = filteredInvoices.reduce((s, r) => s + n2(r.total_amount), 0);
    const paid = filteredInvoices.reduce((s, r) => s + n2(r.paid_amount), 0);
    const outstanding = filteredInvoices.reduce((s, r) => s + n2(r.balance_amount), 0);
    const creditNotesValue = filteredCreditNotes.reduce((s, r) => s + n2(r.total_amount), 0);
    const netRevenue = salesTotal - creditNotesValue;
    const docs = filteredInvoices.length;
    const customers = new Set(filteredInvoices.map((r) => r.customer_name || "—")).size;

    return {
      salesSubtotal,
      salesVat,
      salesTotal,
      paid,
      outstanding,
      creditNotesValue,
      netRevenue,
      docs,
      customers,
    };
  }, [filteredInvoices, filteredCreditNotes]);

  const topCustomers = React.useMemo(() => {
    const map = new Map<string, { customer: string; total: number; paid: number; balance: number; docs: number }>();

    filteredInvoices.forEach((r) => {
      const key = r.customer_name || "—";
      const prev = map.get(key) || { customer: key, total: 0, paid: 0, balance: 0, docs: 0 };
      prev.total += n2(r.total_amount);
      prev.paid += n2(r.paid_amount);
      prev.balance += n2(r.balance_amount);
      prev.docs += 1;
      map.set(key, prev);
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredInvoices]);

  const topInvoices = React.useMemo(() => {
    return filteredInvoices
      .slice()
      .sort((a, b) => n2(b.total_amount) - n2(a.total_amount))
      .slice(0, 10);
  }, [filteredInvoices]);

  function exportSalesCsv() {
    const head = [
      "Invoice No",
      "Date",
      "Customer",
      "Status",
      "Subtotal",
      "VAT",
      "Total",
      "Paid",
      "Balance",
    ];

    const rows = filteredInvoices.map((r) => [
      r.invoice_no,
      fmtDate(r.invoice_date),
      r.customer_name || "—",
      r.status || "—",
      n2(r.subtotal).toFixed(2),
      n2(r.vat_amount).toFixed(2),
      n2(r.total_amount).toFixed(2),
      n2(r.paid_amount).toFixed(2),
      n2(r.balance_amount).toFixed(2),
    ]);

    exportCsv(`sales-report_${from}_${to}.csv`, head, rows);
  }

  function exportCustomerCsv() {
    const head = ["Customer", "Documents", "Total", "Paid", "Balance"];
    const rows = topCustomers.map((r) => [
      r.customer,
      r.docs,
      r.total.toFixed(2),
      r.paid.toFixed(2),
      r.balance.toFixed(2),
    ]);

    exportCsv(`sales-by-customer_${from}_${to}.csv`, head, rows);
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>
                  <BarChart3 className="size-3.5 text-slate-500" />
                  Executive Reports
                </Chip>
                <Chip className="bg-[#ff7a18]/10 text-[#c25708] ring-[#ff7a18]/20">
                  <TrendingUp className="size-3.5" />
                  Sales Performance
                </Chip>
                <Chip className="bg-slate-900 text-white ring-slate-900/20">
                  <CircleDollarSign className="size-3.5 text-white/85" />
                  MUR
                </Chip>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Sales Report Centre
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Enterprise-grade sales analytics using live invoice and credit note figures, with
                commercial performance, collections, customer concentration, and export-ready views.
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
                onClick={exportSalesCsv}
                disabled={filteredInvoices.length === 0}
              >
                <Download className="mr-2 size-4" />
                Export Sales CSV
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search invoice no, customer, status..."
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          icon={TrendingUp}
          label="Gross Sales"
          value={money(totals.salesTotal)}
          sub={`${totals.docs} invoice(s) in scope`}
          tone="blue"
        />
        <KPICard
          icon={Wallet}
          label="Collections"
          value={money(totals.paid)}
          sub="Cash collected from invoices"
          tone="emerald"
        />
        <KPICard
          icon={AlertTriangle}
          label="Outstanding"
          value={money(totals.outstanding)}
          sub="Open receivables"
          tone={totals.outstanding > 0 ? "rose" : "emerald"}
        />
        <KPICard
          icon={Landmark}
          label="Net Revenue"
          value={money(totals.netRevenue)}
          sub={`After credit notes ${money(totals.creditNotesValue)}`}
          tone="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KPICard
          icon={FileText}
          label="Sales Before VAT"
          value={money(totals.salesSubtotal)}
          sub={`VAT charged ${money(totals.salesVat)}`}
        />
        <KPICard
          icon={Users}
          label="Active Customers"
          value={String(totals.customers)}
          sub="Customers billed in period"
        />
        <KPICard
          icon={BadgeCheck}
          label="Credit Notes"
          value={money(totals.creditNotesValue)}
          sub={`${filteredCreditNotes.length} credit note(s) in period`}
        />
      </div>

      <Card3D className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Top Customers by Revenue</div>
            <div className="mt-1 text-sm text-slate-600">
              Largest billed customers for the selected reporting period.
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
                <th className="text-right">Documents</th>
                <th className="text-right">Total Billed</th>
                <th className="text-right">Collected</th>
                <th className="text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No customer revenue found for this period.
                  </td>
                </tr>
              ) : (
                topCustomers.map((r) => (
                  <tr key={r.customer}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.customer}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.docs}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(r.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{money(r.paid)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">{money(r.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card3D>

      <Card3D className="p-0">
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Detailed Sales Documents</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Real invoice performance lines with billed, collected, and balance tracking.
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {loading ? "Loading…" : `${topInvoices.length} row(s) shown`}
          </div>
        </div>

        <div className="overflow-hidden rounded-b-3xl border-t border-slate-200">
          <div className="overflow-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th className="w-[180px]">Invoice</th>
                  <th className="w-[140px]">Date</th>
                  <th>Customer</th>
                  <th className="w-[140px] text-right">Subtotal</th>
                  <th className="w-[120px] text-right">VAT</th>
                  <th className="w-[150px] text-right">Total</th>
                  <th className="w-[150px] text-right">Paid</th>
                  <th className="w-[150px] text-right">Balance</th>
                  <th className="w-[140px]">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {topInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                      No sales documents found for this filter.
                    </td>
                  </tr>
                ) : (
                  topInvoices.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">{r.invoice_no}</div>
                        <div className="text-xs text-slate-500">{r.invoice_type || "VAT_INVOICE"}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 text-slate-700">
                          <Calendar className="size-4 text-slate-400" />
                          {fmtDate(r.invoice_date)}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {r.customer_name || "—"}
                      </td>

                      <td className="px-5 py-4 text-right text-slate-900">{money(r.subtotal)}</td>
                      <td className="px-5 py-4 text-right text-slate-900">{money(r.vat_amount)}</td>
                      <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                        {money(r.total_amount)}
                      </td>
                      <td className="px-5 py-4 text-right text-emerald-700 font-semibold">
                        {money(r.paid_amount)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {money(r.balance_amount)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            statusTone(r.status)
                          )}
                        >
                          {String(r.status || "—").replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {topInvoices.length > 0 ? (
                <tfoot className="bg-slate-50">
                  <tr className="[&>td]:px-5 [&>td]:py-4 [&>td]:font-extrabold">
                    <td colSpan={5} className="text-right text-slate-700">
                      SALES TOTALS
                    </td>
                    <td className="text-right text-slate-900">{money(totals.salesTotal)}</td>
                    <td className="text-right text-emerald-700">{money(totals.paid)}</td>
                    <td className="text-right text-slate-900">{money(totals.outstanding)}</td>
                    <td />
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