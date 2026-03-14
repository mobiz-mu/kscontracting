"use client";

import * as React from "react";
import {
  FileText,
  Receipt,
  BarChart3,
  Download,
  CalendarDays,
  Filter,
  RefreshCw,
  TrendingUp,
  Wallet,
  Landmark,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================
   Types
========================= */

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_type?: string | null;
  invoice_date?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  customer_name?: string | null;
  site_address?: string | null;
  created_at?: string | null;
};

type Quotation = {
  id: string;
  quote_no: string;
  customer_name?: string | null;
  quote_date?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  site_address?: string | null;
  created_at?: string | null;
};

type CreditNote = {
  id: string;
  credit_no: string;
  customer_name?: string | null;
  credit_date?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat?: number | null;
  total_amount?: number | null;
  site_address?: string | null;
  created_at?: string | null;
};

type Customer = {
  id: string | number;
  name?: string | null;
};

type Supplier = {
  id: string | number;
  name?: string | null;
};

type ApiListResponse<T> = {
  ok: boolean;
  data?: T[];
  meta?: {
    total?: number;
    hasMore?: boolean;
  };
};

type RangeKey = "thisMonth" | "last30" | "thisQuarter" | "thisYear" | "all";

/* =========================
   Utils
========================= */

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(n: number) {
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
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON. Got ${ct || "unknown"}`);
  }

  return JSON.parse(text) as T;
}

function downloadCsv(filename: string, rows: Array<Record<string, any>>) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escapeCsv = (value: any) => {
    const s = String(value ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getRangeDates(range: RangeKey) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === "all") {
    return { start: null as Date | null, end: null as Date | null };
  }

  if (range === "last30") {
    start.setDate(now.getDate() - 30);
    return { start, end };
  }

  if (range === "thisMonth") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (range === "thisQuarter") {
    const q = Math.floor(now.getMonth() / 3);
    start.setMonth(q * 3, 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function inRange(dateValue: string | null | undefined, range: RangeKey) {
  if (range === "all") return true;
  const d = safeDate(dateValue);
  if (!d) return false;
  const { start, end } = getRangeDates(range);
  if (!start || !end) return true;
  return d >= start && d <= end;
}

/* =========================
   UI
========================= */

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

function Pill({
  children,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-[#071b38] text-white ring-1 ring-[#071b38]"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone = "slate",
  sub,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  tone?: "slate" | "navy" | "orange" | "emerald" | "rose";
  sub?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-white text-slate-900 ring-slate-200",
    navy: "bg-[#071b38] text-white ring-white/10",
    orange: "bg-[#ff7a18] text-white ring-white/10",
    emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    rose: "bg-rose-50 text-rose-900 ring-rose-200",
  };

  return (
    <div className={cn("rounded-3xl p-5 ring-1", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={cn(
              "text-xs font-semibold",
              tone === "navy" || tone === "orange" ? "text-white/70" : "text-slate-500"
            )}
          >
            {title}
          </div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
          {sub ? (
            <div
              className={cn(
                "mt-1 text-xs",
                tone === "navy" || tone === "orange" ? "text-white/70" : "text-slate-500"
              )}
            >
              {sub}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "grid size-11 place-items-center rounded-2xl",
            tone === "navy"
              ? "bg-white/10"
              : tone === "orange"
              ? "bg-white/15"
              : "bg-slate-50"
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  desc,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  desc: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card3D className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <Icon className="size-5 text-slate-700" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-600">{desc}</div>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </Card3D>
  );
}

/* =========================
   Page
========================= */

export default function ReportsPage() {
  const [range, setRange] = React.useState<RangeKey>("thisMonth");
  const [query, setQuery] = React.useState("");
  const [invoiceStatus, setInvoiceStatus] = React.useState("ALL");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [creditNotes, setCreditNotes] = React.useState<CreditNote[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const [inv, quo, crn, cus, sup] = await Promise.all([
        safeGet<ApiListResponse<Invoice>>("/api/invoices?page=1&pageSize=200"),
        safeGet<ApiListResponse<Quotation>>("/api/quotations?page=1&pageSize=200"),
        safeGet<ApiListResponse<CreditNote>>("/api/credit-notes?page=1&pageSize=200"),
        safeGet<ApiListResponse<Customer>>("/api/customers"),
        safeGet<ApiListResponse<Supplier>>("/api/suppliers"),
      ]);

      setInvoices(Array.isArray(inv.data) ? inv.data : []);
      setQuotations(Array.isArray(quo.data) ? quo.data : []);
      setCreditNotes(Array.isArray(crn.data) ? crn.data : []);
      setCustomers(Array.isArray(cus.data) ? cus.data : []);
      setSuppliers(Array.isArray(sup.data) ? sup.data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load reports");
      setInvoices([]);
      setQuotations([]);
      setCreditNotes([]);
      setCustomers([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filteredInvoices = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return invoices.filter((x) => {
      const hay =
        `${x.invoice_no ?? ""} ${x.customer_name ?? ""} ${x.site_address ?? ""}`.toLowerCase();

      const matchesQuery = !q || hay.includes(q);
      const matchesRange = inRange(x.invoice_date ?? x.created_at, range);
      const matchesStatus =
        invoiceStatus === "ALL" || String(x.status ?? "").toUpperCase() === invoiceStatus;

      return matchesQuery && matchesRange && matchesStatus;
    });
  }, [invoices, query, range, invoiceStatus]);

  const filteredQuotations = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return quotations.filter((x) => {
      const hay =
        `${x.quote_no ?? ""} ${x.customer_name ?? ""} ${x.site_address ?? ""}`.toLowerCase();

      return (!q || hay.includes(q)) && inRange(x.quote_date ?? x.created_at, range);
    });
  }, [quotations, query, range]);

  const filteredCreditNotes = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return creditNotes.filter((x) => {
      const hay =
        `${x.credit_no ?? ""} ${x.customer_name ?? ""} ${x.site_address ?? ""}`.toLowerCase();

      return (!q || hay.includes(q)) && inRange(x.credit_date ?? x.created_at, range);
    });
  }, [creditNotes, query, range]);

  const kpis = React.useMemo(() => {
    const salesSubtotal = filteredInvoices.reduce((s, x) => s + n2(x.subtotal), 0);
    const salesVat = filteredInvoices.reduce((s, x) => s + n2(x.vat_amount), 0);
    const salesTotal = filteredInvoices.reduce((s, x) => s + n2(x.total_amount), 0);
    const collections = filteredInvoices.reduce((s, x) => s + n2(x.paid_amount), 0);
    const outstanding = filteredInvoices.reduce((s, x) => s + n2(x.balance_amount), 0);

    const issuedCount = filteredInvoices.filter(
      (x) => String(x.status ?? "").toUpperCase() === "ISSUED"
    ).length;

    const draftCount = filteredInvoices.filter(
      (x) => String(x.status ?? "").toUpperCase() === "DRAFT"
    ).length;

    const quotationValue = filteredQuotations.reduce((s, x) => s + n2(x.total_amount), 0);
    const creditValue = filteredCreditNotes.reduce((s, x) => s + n2(x.total_amount), 0);

    return {
      salesSubtotal,
      salesVat,
      salesTotal,
      collections,
      outstanding,
      issuedCount,
      draftCount,
      quotationValue,
      creditValue,
    };
  }, [filteredInvoices, filteredQuotations, filteredCreditNotes]);

  const soaRows = React.useMemo(() => {
    const map = new Map<
      string,
      {
        customer: string;
        invoices: number;
        billed: number;
        paid: number;
        balance: number;
      }
    >();

    for (const inv of filteredInvoices) {
      const name = inv.customer_name || "Unknown Customer";
      const row = map.get(name) ?? {
        customer: name,
        invoices: 0,
        billed: 0,
        paid: 0,
        balance: 0,
      };

      row.invoices += 1;
      row.billed += n2(inv.total_amount);
      row.paid += n2(inv.paid_amount);
      row.balance += n2(inv.balance_amount);

      map.set(name, row);
    }

    return Array.from(map.values()).sort((a, b) => b.balance - a.balance);
  }, [filteredInvoices]);

  const vatRows = React.useMemo(() => {
    return filteredInvoices.map((x) => ({
      date: fmtDate(x.invoice_date),
      document: x.invoice_no,
      customer: x.customer_name ?? "—",
      subtotal: n2(x.subtotal),
      vat: n2(x.vat_amount),
      total: n2(x.total_amount),
      status: x.status ?? "—",
    }));
  }, [filteredInvoices]);

  const salesRows = React.useMemo(() => {
    return filteredInvoices
      .slice()
      .sort((a, b) => n2(b.total_amount) - n2(a.total_amount))
      .slice(0, 8);
  }, [filteredInvoices]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.16),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.16),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-5 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-500">Enterprise Insights</div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Reports & Management Analytics
              </h1>
              <div className="mt-1 max-w-3xl text-sm text-slate-600">
                Executive reporting for invoices, VAT, quotations, credit notes, customer exposure,
                and collections performance — built for KS Contracting Ltd.
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill active={range === "thisMonth"} onClick={() => setRange("thisMonth")}>
                  This Month
                </Pill>
                <Pill active={range === "last30"} onClick={() => setRange("last30")}>
                  Last 30 Days
                </Pill>
                <Pill active={range === "thisQuarter"} onClick={() => setRange("thisQuarter")}>
                  This Quarter
                </Pill>
                <Pill active={range === "thisYear"} onClick={() => setRange("thisYear")}>
                  This Year
                </Pill>
                <Pill active={range === "all"} onClick={() => setRange("all")}>
                  All Time
                </Pill>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
                onClick={() =>
                  downloadCsv(
                    "sales-report.csv",
                    filteredInvoices.map((x) => ({
                      invoice_no: x.invoice_no,
                      date: fmtDate(x.invoice_date),
                      customer: x.customer_name ?? "",
                      status: x.status ?? "",
                      subtotal: n2(x.subtotal).toFixed(2),
                      vat: n2(x.vat_amount).toFixed(2),
                      total: n2(x.total_amount).toFixed(2),
                      paid: n2(x.paid_amount).toFixed(2),
                      balance: n2(x.balance_amount).toFixed(2),
                    }))
                  )
                }
              >
                <Download className="mr-2 size-4" />
                Export Master CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card3D className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid w-full gap-3 md:grid-cols-[1fr_220px_220px] xl:max-w-5xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customer, invoice no, quotation no, site..."
                className="h-11 rounded-2xl pl-10"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <select
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
              >
                <option value="ALL">All Invoice Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="VOID">Void</option>
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
              <CalendarDays className="size-4 text-slate-400" />
              <span className="font-semibold text-slate-900">
                {range === "thisMonth"
                  ? "Current Month"
                  : range === "last30"
                  ? "Rolling 30 Days"
                  : range === "thisQuarter"
                  ? "Current Quarter"
                  : range === "thisYear"
                  ? "Current Year"
                  : "All Data"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {filteredInvoices.length} Invoices
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {filteredQuotations.length} Quotations
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {filteredCreditNotes.length} Credit Notes
            </span>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        ) : null}
      </Card3D>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Gross Sales"
          value={money(kpis.salesTotal)}
          icon={TrendingUp}
          tone="navy"
          sub={`${kpis.issuedCount} issued documents`}
        />
        <MetricCard
          title="VAT Exposure"
          value={money(kpis.salesVat)}
          icon={Receipt}
          tone="orange"
          sub="Audit-ready VAT total"
        />
        <MetricCard
          title="Collections"
          value={money(kpis.collections)}
          icon={Wallet}
          tone="emerald"
          sub="Customer receipts"
        />
        <MetricCard
          title="Outstanding"
          value={money(kpis.outstanding)}
          icon={AlertTriangle}
          tone={kpis.outstanding > 0 ? "rose" : "emerald"}
          sub={`${kpis.draftCount} draft invoices`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricCard
          title="Quotation Pipeline"
          value={money(kpis.quotationValue)}
          icon={FileText}
          sub={`${filteredQuotations.length} quotations in scope`}
        />
        <MetricCard
          title="Credit Note Value"
          value={money(kpis.creditValue)}
          icon={Landmark}
          sub={`${filteredCreditNotes.length} credit notes issued/drafted`}
        />
        <MetricCard
          title="Business Directory"
          value={`${customers.length + suppliers.length}`}
          icon={Users}
          sub={`${customers.length} customers • ${suppliers.length} suppliers`}
        />
      </div>

      {/* SOA */}
      <SectionCard
        title="Statement of Account (SOA)"
        desc="Customer-level billed, collected and outstanding balances for management follow-up."
        icon={FileText}
        action={
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() =>
              downloadCsv(
                "statement-of-account.csv",
                soaRows.map((r) => ({
                  customer: r.customer,
                  invoices: r.invoices,
                  billed: r.billed.toFixed(2),
                  paid: r.paid.toFixed(2),
                  balance: r.balance.toFixed(2),
                }))
              )
            }
          >
            <Download className="mr-2 size-4" />
            Export SOA
          </Button>
        }
      >
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                <th>Customer</th>
                <th className="text-right">Invoices</th>
                <th className="text-right">Billed</th>
                <th className="text-right">Collected</th>
                <th className="text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {soaRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No SOA data found for the selected filters.
                  </td>
                </tr>
              ) : (
                soaRows.map((r) => (
                  <tr key={r.customer}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.customer}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.invoices}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{money(r.billed)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                      {money(r.paid)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      {money(r.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* VAT + Sales */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="VAT Report"
          desc="Detailed VAT lines sourced from real invoice data and ready for export."
          icon={Receipt}
          action={
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() =>
                downloadCsv(
                  "vat-report.csv",
                  vatRows.map((r) => ({
                    date: r.date,
                    document: r.document,
                    customer: r.customer,
                    subtotal: r.subtotal.toFixed(2),
                    vat: r.vat.toFixed(2),
                    total: r.total.toFixed(2),
                    status: r.status,
                  }))
                )
              }
            >
              <Download className="mr-2 size-4" />
              Export VAT
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Taxable Base</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">
                {money(kpis.salesSubtotal)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">VAT 15%</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">
                {money(kpis.salesVat)}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th>Date</th>
                  <th>Document</th>
                  <th>Customer</th>
                  <th className="text-right">Subtotal</th>
                  <th className="text-right">VAT</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vatRows.slice(0, 8).map((r, idx) => (
                  <tr key={`${r.document}-${idx}`}>
                    <td className="px-4 py-3 text-slate-700">{r.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.document}</td>
                    <td className="px-4 py-3 text-slate-700">{r.customer}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{money(r.subtotal)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(r.vat)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      {money(r.total)}
                    </td>
                  </tr>
                ))}
                {vatRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No VAT lines found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Sales Performance"
          desc="Top sales documents by value, with revenue and collection visibility."
          icon={BarChart3}
          action={
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() =>
                downloadCsv(
                  "sales-performance.csv",
                  filteredInvoices.map((x) => ({
                    invoice_no: x.invoice_no,
                    customer: x.customer_name ?? "",
                    date: fmtDate(x.invoice_date),
                    status: x.status ?? "",
                    total: n2(x.total_amount).toFixed(2),
                    paid: n2(x.paid_amount).toFixed(2),
                    balance: n2(x.balance_amount).toFixed(2),
                  }))
                )
              }
            >
              <Download className="mr-2 size-4" />
              Export Sales
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Issued Documents</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{kpis.issuedCount}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Collection Rate</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">
                {kpis.salesTotal > 0
                  ? `${Math.round((kpis.collections / kpis.salesTotal) * 100)}%`
                  : "0%"}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {salesRows.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 ring-1 ring-slate-200">
                No sales documents found.
              </div>
            ) : (
              salesRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {row.invoice_no}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {row.customer_name || "—"} • {fmtDate(row.invoice_date)}
                      </div>
                      {row.site_address ? (
                        <div className="mt-1 text-xs text-slate-500">{row.site_address}</div>
                      ) : null}
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {money(n2(row.total_amount))}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Paid {money(n2(row.paid_amount))} • Balance {money(n2(row.balance_amount))}
                      </div>
                      <div className="mt-2 inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                        {row.status || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Management summary */}
      <SectionCard
        title="Management Summary"
        desc="High-level executive position for directors and finance review meetings."
        icon={Building2}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Commercial Snapshot
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Total Sales</span>
                <span className="font-semibold text-slate-900">{money(kpis.salesTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Quotation Pipeline</span>
                <span className="font-semibold text-slate-900">{money(kpis.quotationValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Credit Adjustments</span>
                <span className="font-semibold text-slate-900">{money(kpis.creditValue)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Wallet className="size-4 text-[#071b38]" />
              Treasury Snapshot
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Collections</span>
                <span className="font-semibold text-slate-900">{money(kpis.collections)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Outstanding</span>
                <span className="font-semibold text-slate-900">{money(kpis.outstanding)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Collection Rate</span>
                <span className="font-semibold text-slate-900">
                  {kpis.salesTotal > 0
                    ? `${Math.round((kpis.collections / kpis.salesTotal) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="size-4 text-[#ff7a18]" />
              Master Data Snapshot
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Customers</span>
                <span className="font-semibold text-slate-900">{customers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Suppliers</span>
                <span className="font-semibold text-slate-900">{suppliers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Invoices in Range</span>
                <span className="font-semibold text-slate-900">{filteredInvoices.length}</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}