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
  SlidersHorizontal,
  PieChart,
  Banknote,
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
  credited_amount?: number | null;
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
  vat_amount?: number | null;
  total_amount?: number | null;
  applied_amount?: number | null;
  remaining_amount?: number | null;
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

type RangeKey =
  | "thisMonth"
  | "lastMonth"
  | "last30"
  | "thisQuarter"
  | "lastQuarter"
  | "thisYear"
  | "lastYear"
  | "financialYear"
  | "custom"
  | "all";

type GroupKey = "none" | "monthly" | "quarterly" | "yearly";

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;

type SoaRow = {
  customer: string;
  invoices: number;
  billed: number;
  paid: number;
  credited: number;
  balance: number;
};

type VatRow = {
  date: string;
  document: string;
  customer: string;
  subtotal: number;
  vat: number;
  total: number;
  status: string;
};

type GroupedRow = {
  label: string;
  count: number;
  subtotal: number;
  vat: number;
  total: number;
  paid: number;
  credited: number;
  balance: number;
};

/* =========================
   Utils
========================= */

function n2(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthStartYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
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

function parseDate(v?: string | null) {
  if (!v) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function getRangeDates(range: RangeKey, customFrom: string, customTo: string) {
  const now = new Date();
  const end = endOfDay(now);

  if (range === "all") {
    return { start: null as Date | null, end: null as Date | null };
  }

  if (range === "custom") {
    return {
      start: customFrom ? startOfDay(parseDate(customFrom) ?? now) : null,
      end: customTo ? endOfDay(parseDate(customTo) ?? now) : null,
    };
  }

  if (range === "last30") {
    return { start: startOfDay(addDays(now, -30)), end };
  }

  if (range === "thisMonth") {
    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      end,
    };
  }

  if (range === "lastMonth") {
    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }

  if (range === "thisQuarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return {
      start: startOfDay(new Date(now.getFullYear(), quarterStartMonth, 1)),
      end,
    };
  }

  if (range === "lastQuarter") {
    const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const lastQuarterStart = new Date(now.getFullYear(), currentQuarterStartMonth - 3, 1);
    const lastQuarterEnd = new Date(now.getFullYear(), currentQuarterStartMonth, 0);
    return {
      start: startOfDay(lastQuarterStart),
      end: endOfDay(lastQuarterEnd),
    };
  }

  if (range === "thisYear") {
    return {
      start: startOfDay(new Date(now.getFullYear(), 0, 1)),
      end,
    };
  }

  if (range === "lastYear") {
    return {
      start: startOfDay(new Date(now.getFullYear() - 1, 0, 1)),
      end: endOfDay(new Date(now.getFullYear() - 1, 11, 31)),
    };
  }

  return {
    start: startOfDay(new Date(now.getFullYear(), 6, 1)),
    end,
  };
}

function rangeLabel(range: RangeKey, customFrom: string, customTo: string) {
  const labels: Record<RangeKey, string> = {
    thisMonth: "This Month",
    lastMonth: "Last Month",
    last30: "Last 30 Days",
    thisQuarter: "This Quarter",
    lastQuarter: "Last Quarter",
    thisYear: "This Year",
    lastYear: "Last Year",
    financialYear: "Financial Year",
    custom: "Custom Period",
    all: "All Data",
  };

  if (range === "custom" && (customFrom || customTo)) {
    return `${customFrom || "Start"} → ${customTo || "Today"}`;
  }

  return labels[range];
}

function inRange(dateValue: string | null | undefined, range: RangeKey, customFrom: string, customTo: string) {
  if (range === "all") return true;

  const d = parseDate(dateValue);
  if (!d) return false;

  const { start, end } = getRangeDates(range, customFrom, customTo);
  if (start && d < start) return false;
  if (end && d > end) return false;

  return true;
}

function groupLabel(dateValue: string | null | undefined, group: GroupKey) {
  const d = parseDate(dateValue);
  if (!d) return "Undated";

  const year = d.getFullYear();
  const month = d.getMonth();

  if (group === "monthly") {
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }

  if (group === "quarterly") {
    return `${year} Q${Math.floor(month / 3) + 1}`;
  }

  if (group === "yearly") {
    return String(year);
  }

  return "All";
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escapeCsv = (value: CsvValue) => {
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
        "relative overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-slate-200/80",
        "shadow-[0_1px_0_rgba(15,23,42,0.05),0_14px_34px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(620px_220px_at_12%_0%,rgba(7,27,56,0.10),transparent_62%)]" />
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
        "inline-flex min-h-9 items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-bold transition",
        "focus:outline-none focus:ring-2 focus:ring-[#ff7a18]/30",
        active
          ? "bg-[#071b38] text-white shadow-sm ring-1 ring-[#071b38]"
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
    emerald: "bg-emerald-50 text-emerald-950 ring-emerald-200",
    rose: "bg-rose-50 text-rose-950 ring-rose-200",
  };

  return (
    <div className={cn("rounded-[1.15rem] p-4 ring-1", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={cn(
              "truncate text-[11px] font-bold uppercase tracking-[0.16em]",
              tone === "navy" || tone === "orange" ? "text-white/70" : "text-slate-500"
            )}
          >
            {title}
          </div>
          <div className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">
            {value}
          </div>
          {sub ? (
            <div
              className={cn(
                "mt-1 truncate text-xs",
                tone === "navy" || tone === "orange" ? "text-white/70" : "text-slate-500"
              )}
            >
              {sub}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-2xl",
            tone === "navy"
              ? "bg-white/10"
              : tone === "orange"
              ? "bg-white/15"
              : "bg-white/70"
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        <Icon className="size-3.5" />
        {title}
      </div>
      <div className="mt-1 truncate text-base font-black text-slate-900">{value}</div>
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
    <Card3D className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <Icon className="size-4 text-slate-700" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-slate-900">{title}</div>
            <div className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">{desc}</div>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card3D>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 ring-1 ring-slate-200">
      {text}
    </div>
  );
}

/* =========================
   Page
========================= */

export default function ReportsPage() {
  const [range, setRange] = React.useState<RangeKey>("thisMonth");
  const [groupBy, setGroupBy] = React.useState<GroupKey>("monthly");
  const [customFrom, setCustomFrom] = React.useState(monthStartYmd());
  const [customTo, setCustomTo] = React.useState(todayYmd());
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
        safeGet<ApiListResponse<Invoice>>("/api/invoices?page=1&pageSize=500"),
        safeGet<ApiListResponse<Quotation>>("/api/quotations?page=1&pageSize=500"),
        safeGet<ApiListResponse<CreditNote>>("/api/credit-notes?page=1&pageSize=500"),
        safeGet<ApiListResponse<Customer>>("/api/customers"),
        safeGet<ApiListResponse<Supplier>>("/api/suppliers"),
      ]);

      setInvoices(Array.isArray(inv.data) ? inv.data : []);
      setQuotations(Array.isArray(quo.data) ? quo.data : []);
      setCreditNotes(Array.isArray(crn.data) ? crn.data : []);
      setCustomers(Array.isArray(cus.data) ? cus.data : []);
      setSuppliers(Array.isArray(sup.data) ? sup.data : []);
    } catch (error: unknown) {
      setErr(getErrorMessage(error, "Failed to load reports"));
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
      const matchesRange = inRange(x.invoice_date ?? x.created_at, range, customFrom, customTo);
      const matchesStatus =
        invoiceStatus === "ALL" || String(x.status ?? "").toUpperCase() === invoiceStatus;

      return matchesQuery && matchesRange && matchesStatus;
    });
  }, [invoices, query, range, customFrom, customTo, invoiceStatus]);

  const filteredQuotations = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return quotations.filter((x) => {
      const hay =
        `${x.quote_no ?? ""} ${x.customer_name ?? ""} ${x.site_address ?? ""}`.toLowerCase();

      return (
        (!q || hay.includes(q)) &&
        inRange(x.quote_date ?? x.created_at, range, customFrom, customTo)
      );
    });
  }, [quotations, query, range, customFrom, customTo]);

  const filteredCreditNotes = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return creditNotes.filter((x) => {
      const hay =
        `${x.credit_no ?? ""} ${x.customer_name ?? ""} ${x.site_address ?? ""}`.toLowerCase();

      return (
        (!q || hay.includes(q)) &&
        inRange(x.credit_date ?? x.created_at, range, customFrom, customTo)
      );
    });
  }, [creditNotes, query, range, customFrom, customTo]);

  const kpis = React.useMemo(() => {
    const salesSubtotal = filteredInvoices.reduce((s, x) => s + n2(x.subtotal), 0);
    const salesVat = filteredInvoices.reduce((s, x) => s + n2(x.vat_amount), 0);
    const salesTotal = filteredInvoices.reduce((s, x) => s + n2(x.total_amount), 0);
    const collections = filteredInvoices.reduce((s, x) => s + n2(x.paid_amount), 0);
    const credited = filteredInvoices.reduce((s, x) => s + n2(x.credited_amount), 0);
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
      credited,
      outstanding,
      issuedCount,
      draftCount,
      quotationValue,
      creditValue,
    };
  }, [filteredInvoices, filteredQuotations, filteredCreditNotes]);

  const groupedRows = React.useMemo<GroupedRow[]>(() => {
    if (groupBy === "none") return [];

    const map = new Map<string, GroupedRow>();

    for (const inv of filteredInvoices) {
      const label = groupLabel(inv.invoice_date ?? inv.created_at, groupBy);
      const row =
        map.get(label) ??
        {
          label,
          count: 0,
          subtotal: 0,
          vat: 0,
          total: 0,
          paid: 0,
          credited: 0,
          balance: 0,
        };

      row.count += 1;
      row.subtotal += n2(inv.subtotal);
      row.vat += n2(inv.vat_amount);
      row.total += n2(inv.total_amount);
      row.paid += n2(inv.paid_amount);
      row.credited += n2(inv.credited_amount);
      row.balance += n2(inv.balance_amount);

      map.set(label, row);
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredInvoices, groupBy]);

  const soaRows = React.useMemo<SoaRow[]>(() => {
    const map = new Map<string, SoaRow>();

    for (const inv of filteredInvoices) {
      const name = inv.customer_name || "Unknown Customer";
      const row =
        map.get(name) ??
        {
          customer: name,
          invoices: 0,
          billed: 0,
          paid: 0,
          credited: 0,
          balance: 0,
        };

      row.invoices += 1;
      row.billed += n2(inv.total_amount);
      row.paid += n2(inv.paid_amount);
      row.credited += n2(inv.credited_amount);
      row.balance += n2(inv.balance_amount);

      map.set(name, row);
    }

    return Array.from(map.values()).sort((a, b) => b.balance - a.balance);
  }, [filteredInvoices]);

  const vatRows = React.useMemo<VatRow[]>(() => {
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

  const activeLabel = rangeLabel(range, customFrom, customTo);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(820px_360px_at_12%_-20%,rgba(7,27,56,0.16),transparent_60%),radial-gradient(640px_360px_at_110%_-10%,rgba(255,122,24,0.16),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                <PieChart className="size-3.5 text-[#ff7a18]" />
                Enterprise Insights
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Reports & Management Analytics
              </h1>

              <div className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Compact executive reporting for invoices, VAT, quotations, credit notes, customer
                exposure and collections performance.
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                variant="outline"
                className="h-10 rounded-2xl"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Button
                className="h-10 rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
                onClick={() =>
                  downloadCsv(
                    "master-sales-report.csv",
                    filteredInvoices.map((x) => ({
                      invoice_no: x.invoice_no,
                      date: fmtDate(x.invoice_date),
                      customer: x.customer_name ?? "",
                      status: x.status ?? "",
                      subtotal: n2(x.subtotal).toFixed(2),
                      vat: n2(x.vat_amount).toFixed(2),
                      total: n2(x.total_amount).toFixed(2),
                      paid_cash: n2(x.paid_amount).toFixed(2),
                      credited: n2(x.credited_amount).toFixed(2),
                      balance: n2(x.balance_amount).toFixed(2),
                    }))
                  )
                }
              >
                <Download className="mr-2 size-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["thisMonth", "This Month"],
              ["lastMonth", "Last Month"],
              ["last30", "Last 30 Days"],
              ["thisQuarter", "This Quarter"],
              ["lastQuarter", "Last Quarter"],
              ["thisYear", "This Year"],
              ["lastYear", "Last Year"],
              ["financialYear", "Financial Year"],
              ["custom", "Custom"],
              ["all", "All"],
            ].map(([key, label]) => (
              <Pill
                key={key}
                active={range === key}
                onClick={() => setRange(key as RangeKey)}
              >
                {label}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card3D className="p-4">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.75fr_0.75fr_0.7fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer, invoice, quotation, site..."
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
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="VOID">Void</option>
            </select>
          </div>

          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupKey)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
            >
              <option value="monthly">Group Monthly</option>
              <option value="quarterly">Group Quarterly</option>
              <option value="yearly">Group Yearly</option>
              <option value="none">No Grouping</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
            <CalendarDays className="size-4 shrink-0 text-slate-400" />
            <span className="truncate font-bold">{activeLabel}</span>
          </div>
        </div>

        {range === "custom" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-bold text-slate-500">From Date</div>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-bold text-slate-500">To Date</div>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
            {filteredInvoices.length} invoices
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
            {filteredQuotations.length} quotations
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
            {filteredCreditNotes.length} credit notes
          </span>
        </div>

        {err ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        ) : null}
      </Card3D>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Gross Sales"
          value={money(kpis.salesTotal)}
          icon={TrendingUp}
          tone="navy"
          sub={`${kpis.issuedCount} issued`}
        />
        <MetricCard
          title="VAT"
          value={money(kpis.salesVat)}
          icon={Receipt}
          tone="orange"
          sub="Tax exposure"
        />
        <MetricCard
          title="Paid Cash"
          value={money(kpis.collections)}
          icon={Wallet}
          tone="emerald"
          sub="Actual receipts"
        />
        <MetricCard
          title="Credited"
          value={money(kpis.credited)}
          icon={Landmark}
          sub="Credit notes applied"
        />
        <MetricCard
          title="Outstanding"
          value={money(kpis.outstanding)}
          icon={AlertTriangle}
          tone={kpis.outstanding > 0 ? "rose" : "emerald"}
          sub={`${kpis.draftCount} drafts`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <MetricCard
          title="Quotation Pipeline"
          value={money(kpis.quotationValue)}
          icon={FileText}
          sub={`${filteredQuotations.length} quotations`}
        />
        <MetricCard
          title="Credit Note Value"
          value={money(kpis.creditValue)}
          icon={Banknote}
          sub={`${filteredCreditNotes.length} documents`}
        />
        <MetricCard
          title="Directory"
          value={`${customers.length + suppliers.length}`}
          icon={Users}
          sub={`${customers.length} customers • ${suppliers.length} suppliers`}
        />
      </div>

      {/* Grouped Summary */}
      {groupBy !== "none" ? (
        <SectionCard
          title="Period Breakdown"
          desc="Grouped financial movement by selected report period."
          icon={BarChart3}
          action={
            <Button
              variant="outline"
              className="h-10 rounded-2xl"
              onClick={() =>
                downloadCsv(
                  "period-breakdown.csv",
                  groupedRows.map((r) => ({
                    period: r.label,
                    invoices: r.count,
                    subtotal: r.subtotal.toFixed(2),
                    vat: r.vat.toFixed(2),
                    total: r.total.toFixed(2),
                    paid_cash: r.paid.toFixed(2),
                    credited: r.credited.toFixed(2),
                    outstanding: r.balance.toFixed(2),
                  }))
                )
              }
            >
              <Download className="mr-2 size-4" />
              Export
            </Button>
          }
        >
          {groupedRows.length === 0 ? (
            <EmptyState text="No grouped report data found for the selected period." />
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {groupedRows.map((r) => (
                  <div key={r.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-slate-900">{r.label}</div>
                        <div className="text-xs text-slate-500">{r.count} invoices</div>
                      </div>
                      <div className="text-right font-black text-slate-900">{money(r.total)}</div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2">
                        <div className="text-slate-500">Paid</div>
                        <div className="font-bold text-emerald-700">{money(r.paid)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <div className="text-slate-500">Credited</div>
                        <div className="font-bold text-slate-900">{money(r.credited)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <div className="text-slate-500">VAT</div>
                        <div className="font-bold text-slate-900">{money(r.vat)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <div className="text-slate-500">Balance</div>
                        <div className="font-bold text-rose-700">{money(r.balance)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-bold">
                      <th>Period</th>
                      <th className="text-right">Invoices</th>
                      <th className="text-right">Subtotal</th>
                      <th className="text-right">VAT</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Paid</th>
                      <th className="text-right">Credited</th>
                      <th className="text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedRows.map((r) => (
                      <tr key={r.label}>
                        <td className="px-4 py-3 font-black text-slate-900">{r.label}</td>
                        <td className="px-4 py-3 text-right">{r.count}</td>
                        <td className="px-4 py-3 text-right">{money(r.subtotal)}</td>
                        <td className="px-4 py-3 text-right">{money(r.vat)}</td>
                        <td className="px-4 py-3 text-right font-black">{money(r.total)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {money(r.paid)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{money(r.credited)}</td>
                        <td className="px-4 py-3 text-right font-black text-rose-700">
                          {money(r.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      ) : null}

      {/* SOA */}
      <SectionCard
        title="Statement of Account"
        desc="Customer-level billed, paid cash, credited amount and outstanding balances."
        icon={FileText}
        action={
          <Button
            variant="outline"
            className="h-10 rounded-2xl"
            onClick={() =>
              downloadCsv(
                "statement-of-account.csv",
                soaRows.map((r) => ({
                  customer: r.customer,
                  invoices: r.invoices,
                  billed: r.billed.toFixed(2),
                  paid_cash: r.paid.toFixed(2),
                  credited: r.credited.toFixed(2),
                  outstanding: r.balance.toFixed(2),
                }))
              )
            }
          >
            <Download className="mr-2 size-4" />
            Export SOA
          </Button>
        }
      >
        {soaRows.length === 0 ? (
          <EmptyState text="No SOA data found for the selected filters." />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {soaRows.map((r) => (
                <div key={r.customer} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-black text-slate-900">{r.customer}</div>
                  <div className="mt-1 text-xs text-slate-500">{r.invoices} invoices</div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <MiniStat title="Billed" value={money(r.billed)} icon={FileText} />
                    <MiniStat title="Paid" value={money(r.paid)} icon={Wallet} />
                    <MiniStat title="Credited" value={money(r.credited)} icon={Landmark} />
                    <MiniStat title="Outstanding" value={money(r.balance)} icon={AlertTriangle} />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-bold">
                    <th>Customer</th>
                    <th className="text-right">Invoices</th>
                    <th className="text-right">Billed</th>
                    <th className="text-right">Paid Cash</th>
                    <th className="text-right">Credited</th>
                    <th className="text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {soaRows.map((r) => (
                    <tr key={r.customer}>
                      <td className="px-4 py-3 font-black text-slate-900">{r.customer}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{r.invoices}</td>
                      <td className="px-4 py-3 text-right text-slate-900">{money(r.billed)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {money(r.paid)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {money(r.credited)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-rose-700">
                        {money(r.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      {/* VAT + Sales */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="VAT Report"
          desc="VAT movement sourced from filtered invoice records."
          icon={Receipt}
          action={
            <Button
              variant="outline"
              className="h-10 rounded-2xl"
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
            <MiniStat title="Taxable Base" value={money(kpis.salesSubtotal)} icon={Receipt} />
            <MiniStat title="VAT" value={money(kpis.salesVat)} icon={Landmark} />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-bold">
                  <th>Date</th>
                  <th>Document</th>
                  <th>Customer</th>
                  <th className="text-right">Subtotal</th>
                  <th className="text-right">VAT</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vatRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No VAT lines found.
                    </td>
                  </tr>
                ) : (
                  vatRows.slice(0, 10).map((r, idx) => (
                    <tr key={`${r.document}-${idx}`}>
                      <td className="px-4 py-3 text-slate-700">{r.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.document}</td>
                      <td className="px-4 py-3 text-slate-700">{r.customer}</td>
                      <td className="px-4 py-3 text-right">{money(r.subtotal)}</td>
                      <td className="px-4 py-3 text-right font-bold">{money(r.vat)}</td>
                      <td className="px-4 py-3 text-right font-black">{money(r.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Sales Performance"
          desc="Top sales documents by value, with cash and balance visibility."
          icon={BarChart3}
          action={
            <Button
              variant="outline"
              className="h-10 rounded-2xl"
              onClick={() =>
                downloadCsv(
                  "sales-performance.csv",
                  filteredInvoices.map((x) => ({
                    invoice_no: x.invoice_no,
                    customer: x.customer_name ?? "",
                    date: fmtDate(x.invoice_date),
                    status: x.status ?? "",
                    total: n2(x.total_amount).toFixed(2),
                    paid_cash: n2(x.paid_amount).toFixed(2),
                    credited: n2(x.credited_amount).toFixed(2),
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
            <MiniStat title="Issued" value={`${kpis.issuedCount}`} icon={CheckCircle2} />
            <MiniStat
              title="Collection Rate"
              value={
                kpis.salesTotal > 0
                  ? `${Math.round((kpis.collections / kpis.salesTotal) * 100)}%`
                  : "0%"
              }
              icon={Wallet}
            />
          </div>

          <div className="mt-4 space-y-3">
            {salesRows.length === 0 ? (
              <EmptyState text="No sales documents found." />
            ) : (
              salesRows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900">
                        {row.invoice_no}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {row.customer_name || "—"} • {fmtDate(row.invoice_date)}
                      </div>
                      {row.site_address ? (
                        <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {row.site_address}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-sm font-black text-slate-900">
                        {money(n2(row.total_amount))}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Paid {money(n2(row.paid_amount))} • Credit{" "}
                        {money(n2(row.credited_amount))}
                      </div>
                      <div className="mt-1 text-xs font-bold text-rose-700">
                        Balance {money(n2(row.balance_amount))}
                      </div>
                      <div className="mt-2 inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
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
        desc="Compact executive position for directors and finance review meetings."
        icon={Building2}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Commercial Snapshot
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Total Sales</span>
                <span className="font-bold text-slate-900">{money(kpis.salesTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Quotation Pipeline</span>
                <span className="font-bold text-slate-900">{money(kpis.quotationValue)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Credit Adjustments</span>
                <span className="font-bold text-slate-900">{money(kpis.creditValue)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Wallet className="size-4 text-[#071b38]" />
              Treasury Snapshot
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Paid Cash</span>
                <span className="font-bold text-slate-900">{money(kpis.collections)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Credited</span>
                <span className="font-bold text-slate-900">{money(kpis.credited)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Outstanding</span>
                <span className="font-bold text-slate-900">{money(kpis.outstanding)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Users className="size-4 text-[#ff7a18]" />
              Master Data Snapshot
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Customers</span>
                <span className="font-bold text-slate-900">{customers.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Suppliers</span>
                <span className="font-bold text-slate-900">{suppliers.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Invoices in Period</span>
                <span className="font-bold text-slate-900">{filteredInvoices.length}</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}