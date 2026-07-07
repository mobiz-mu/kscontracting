"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Users,
  BadgePercent,
  CreditCard,
  Clock,
  ChevronRight,
  Wallet,
  Building2,
  TrendingUp,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  Landmark,
  Truck,
  FileSpreadsheet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportFilterBar, type ReportFilterValue } from "@/components/reports/ReportFilterBar";
import { resolveDateRange } from "@/lib/reports/period";
import { cn } from "@/lib/utils";

/* =========================================================
   Types
========================================================= */

type Accent = "navy" | "orange" | "green" | "slate";

type InvoiceRow = {
  id: string;
  invoice_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_vat?: string | null;
  customer_brn?: string | null;
  customer_address?: string | null;
  invoice_type?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  site_address?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  credited_amount?: number | null;
  balance_amount?: number | null;
  created_at?: string | null;
};

type QuotationRow = {
  id: string;
  quote_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  quote_date?: string | null;
  valid_until?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  created_at?: string | null;
};

type CreditNoteRow = {
  id: string;
  credit_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  credit_date?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  created_at?: string | null;
};

type CustomerRow = {
  id: string | number;
  name?: string | null;
};

type SupplierRow = {
  id: string | number;
  name?: string | null;
};

type ApiListResponse<T> = {
  ok: boolean;
  data?: T[];
  meta?: {
    total?: number;
    hasMore?: boolean;
    page?: number;
    pageSize?: number;
  };
  kpi?: Record<string, unknown>;
  error?: string;
};

type SeriesPoint = {
  label: string;
  revenue: number;
  collections: number;
  credits: number;
  dues: number;
};

type StatusSlice = {
  name: string;
  value: number;
};

type AgingBucket = {
  name: string;
  value: number;
};

type DueRow = {
  customer: string;
  totalDue: number;
  overdue30: number;
  overdue60: number;
  overdue90: number;
  lastInvoice: string;
};

/* =========================================================
   Utils
========================================================= */

function n2(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function moneyShort(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `Rs ${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Rs ${(n / 1_000).toFixed(1)}K`;
  return `Rs ${n.toFixed(0)}`;
}

function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDateTime(v?: Date | null) {
  const d = v ?? new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} â€¢ ${hh}:${mi}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleString("en-GB", { month: "short" });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function invoiceTypeKey(inv: InvoiceRow) {
  return String(inv.invoice_type ?? "").toUpperCase();
}

function invoiceStatusKey(inv: InvoiceRow) {
  return String(inv.status ?? "").toUpperCase();
}

/** Only real VAT invoices count as receivables/revenue â€” Pro Forma is excluded everywhere. */
function isVatReceivableInvoice(inv: InvoiceRow) {
  return (
    invoiceTypeKey(inv) === "VAT_INVOICE" &&
    !["DRAFT", "VOID"].includes(invoiceStatusKey(inv))
  );
}

function isPaidRevenueInvoice(inv: InvoiceRow) {
  return invoiceTypeKey(inv) === "VAT_INVOICE" && invoiceStatusKey(inv) === "PAID";
}

function isCollectionInvoice(inv: InvoiceRow) {
  return invoiceTypeKey(inv) === "VAT_INVOICE" && invoiceStatusKey(inv) !== "VOID";
}

function isOverdue(inv: InvoiceRow) {
  if (!isVatReceivableInvoice(inv)) return false;
  const due = safeDate(inv.due_date);
  const balance = n2(inv.balance_amount);
  if (!due || balance <= 0) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function daysPastDue(inv: InvoiceRow) {
  if (!isVatReceivableInvoice(inv)) return 0;
  const due = safeDate(inv.due_date);
  const balance = n2(inv.balance_amount);
  if (!due || balance <= 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = today.getTime() - due.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON. Got ${ct || "unknown"}`);
  }
  return JSON.parse(text) as T;
}

function deltaPct(current: number, prev: number) {
  if (prev <= 0 && current > 0) return { delta: "+100.0%", trend: "up" as const };
  if (prev <= 0 && current <= 0) return { delta: "0.0%", trend: "flat" as const };
  const pct = ((current - prev) / prev) * 100;
  return {
    delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    trend: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("flat" as const),
  };
}

/** The period immediately preceding [from, to] with the same length, used for delta comparisons. */
function priorPeriodRange(from: string, to: string) {
  const fromD = new Date(`${from}T00:00:00`);
  const toD = new Date(`${to}T23:59:59`);
  const spanMs = toD.getTime() - fromD.getTime();

  const priorTo = new Date(fromD.getTime() - 1);
  const priorFrom = new Date(priorTo.getTime() - spanMs);

  return { from: priorFrom, to: priorTo };
}

/* =========================================================
   Small building blocks
========================================================= */

function ShellCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white",
        "shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),transparent_60%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function accentClasses(accent: Accent) {
  if (accent === "orange") return { chip: "bg-[#ff8a1e]/10 text-[#c25708] ring-[#ff8a1e]/20", value: "text-slate-950" };
  if (accent === "green") return { chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20", value: "text-slate-950" };
  if (accent === "navy") return { chip: "bg-[#071b38]/10 text-[#071b38] ring-[#071b38]/15", value: "text-slate-950" };
  return { chip: "bg-slate-100 text-slate-700 ring-slate-200", value: "text-slate-950" };
}

function TrendPill({ trend, delta }: { trend?: "up" | "down" | "flat"; delta?: string }) {
  if (!delta) return null;
  const cls =
    trend === "up"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
      : trend === "down"
      ? "bg-rose-500/10 text-rose-700 ring-rose-500/20"
      : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1", cls)}>
      {trend === "up" ? <ArrowUpRight className="size-3" /> : null}
      {trend === "down" ? <ArrowDownRight className="size-3" /> : null}
      {delta}
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  trend,
  accent,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  accent: Accent;
  icon: React.ElementType;
  sub?: string;
}) {
  const a = accentClasses(accent);

  return (
    <ShellCard className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
          <div className={cn("mt-1.5 truncate text-lg font-extrabold tracking-tight sm:text-xl", a.value)}>
            {value}
          </div>
        </div>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl ring-1", a.chip)}>
          <Icon className="size-4" />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{sub ?? "vs. prior period"}</span>
        <TrendPill trend={trend} delta={delta} />
      </div>
    </ShellCard>
  );
}

type TooltipPayloadEntry = {
  dataKey: string;
  name: string;
  value: number;
  color?: string;
};

function PremiumTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_32px_rgba(2,6,23,0.14)]">
      <div className="text-[10.5px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="text-slate-600">{p.name}</span>
            <span className="font-semibold text-slate-900">
              {typeof p.value === "number" ? money(p.value) : String(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] font-extrabold tracking-tight text-slate-950">{title}</div>
        {sub ? <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

/* =========================================================
   Page
========================================================= */

export default function DashboardClient() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastSync, setLastSync] = React.useState("");

  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [quotations, setQuotations] = React.useState<QuotationRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);

  const [series, setSeries] = React.useState<SeriesPoint[]>([]);
  const [statusSlices, setStatusSlices] = React.useState<StatusSlice[]>([]);
  const [aging, setAging] = React.useState<AgingBucket[]>([]);
  const [dueRows, setDueRows] = React.useState<DueRow[]>([]);

  const periodInitialRange = resolveDateRange("this_month");
  const [periodFilter, setPeriodFilter] = React.useState<ReportFilterValue>({
    period: "this_month",
    from: periodInitialRange.from,
    to: periodInitialRange.to,
    group: "month",
  });

  // 12-month rolling trend window, independent of the period filter above â€”
  // this is a historical trend view, not a "current period" figure.
  const fixedStart = React.useMemo(() => new Date(2026, 2, 1), []);
  const fixedMonths = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => addMonths(fixedStart, i)),
    [fixedStart]
  );

  const buildDashboard = React.useCallback(
    (invRows: InvoiceRow[], crnRows: CreditNoteRow[]) => {
      const receivableInvoicesNow = invRows.filter(isVatReceivableInvoice);

      // ---- 12-month trend series ----
      const seriesMap = new Map<
        string,
        { revenue: number; collections: number; credits: number; dues: number }
      >();

      for (const m of fixedMonths) {
        seriesMap.set(monthKey(m), { revenue: 0, collections: 0, credits: 0, dues: 0 });
      }

      for (const inv of invRows) {
        const d = safeDate(inv.invoice_date ?? inv.created_at);
        if (!d) continue;
        const slot = seriesMap.get(monthKey(startOfMonth(d)));
        if (!slot) continue;

        if (isPaidRevenueInvoice(inv)) slot.revenue += n2(inv.total_amount);
        if (isCollectionInvoice(inv)) slot.collections += n2(inv.paid_amount);
        if (isVatReceivableInvoice(inv)) slot.dues += n2(inv.balance_amount);
      }

      for (const crn of crnRows) {
        const d = safeDate(crn.credit_date ?? crn.created_at);
        if (!d) continue;
        const slot = seriesMap.get(monthKey(startOfMonth(d)));
        if (!slot) continue;
        slot.credits += n2(crn.total_amount);
      }

      setSeries(
        fixedMonths.map((m) => {
          const slot = seriesMap.get(monthKey(m)) ?? { revenue: 0, collections: 0, credits: 0, dues: 0 };
          return { label: monthLabel(m), ...slot };
        })
      );

      // ---- Invoice status breakdown (current snapshot) ----
      const vatStatusRows = invRows.filter(
        (x) => invoiceTypeKey(x) === "VAT_INVOICE" && invoiceStatusKey(x) !== "VOID"
      );

      setStatusSlices([
        { name: "Issued", value: vatStatusRows.filter((x) => invoiceStatusKey(x) === "ISSUED").length },
        { name: "Paid", value: vatStatusRows.filter((x) => invoiceStatusKey(x) === "PAID").length },
        { name: "Partial", value: vatStatusRows.filter((x) => invoiceStatusKey(x) === "PARTIALLY_PAID").length },
        { name: "Overdue", value: vatStatusRows.filter((x) => isOverdue(x)).length },
      ]);

      // ---- Aging (current snapshot) ----
      const agingBuckets: AgingBucket[] = [
        { name: "0â€“15", value: 0 },
        { name: "16â€“30", value: 0 },
        { name: "31â€“60", value: 0 },
        { name: "61â€“90", value: 0 },
        { name: "90+", value: 0 },
      ];

      for (const inv of receivableInvoicesNow) {
        const bal = n2(inv.balance_amount);
        if (bal <= 0) continue;
        const d = daysPastDue(inv);
        if (d <= 15) agingBuckets[0].value += bal;
        else if (d <= 30) agingBuckets[1].value += bal;
        else if (d <= 60) agingBuckets[2].value += bal;
        else if (d <= 90) agingBuckets[3].value += bal;
        else agingBuckets[4].value += bal;
      }

      setAging(agingBuckets);

      // ---- Top due customers (current snapshot) ----
      const dueMap = new Map<
        string,
        {
          customer: string;
          totalDue: number;
          overdue30: number;
          overdue60: number;
          overdue90: number;
          lastInvoice: string;
          lastTs: number;
        }
      >();

      for (const inv of receivableInvoicesNow) {
        const bal = n2(inv.balance_amount);
        if (bal <= 0) continue;

        const customer = inv.customer_name?.trim() || "Unknown Customer";
        const d = daysPastDue(inv);
        const invDate = safeDate(inv.invoice_date ?? inv.created_at);
        const ts = invDate ? invDate.getTime() : 0;

        const current = dueMap.get(customer) ?? {
          customer,
          totalDue: 0,
          overdue30: 0,
          overdue60: 0,
          overdue90: 0,
          lastInvoice: "â€”",
          lastTs: 0,
        };

        current.totalDue += bal;
        if (d >= 30) current.overdue30 += bal;
        if (d >= 60) current.overdue60 += bal;
        if (d >= 90) current.overdue90 += bal;

        if (ts >= current.lastTs) {
          current.lastTs = ts;
          current.lastInvoice = inv.invoice_no || "â€”";
        }

        dueMap.set(customer, current);
      }

      const sortedDue = Array.from(dueMap.values())
        .sort((a, b) => b.totalDue - a.totalDue)
        .slice(0, 6)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentional: dropping lastTs, keeping the rest
        .map(({ lastTs, ...rest }) => rest);

      setDueRows(sortedDue);
    },
    [fixedMonths]
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [inv, quo, crn, cus, sup] = await Promise.all([
        safeGet<ApiListResponse<InvoiceRow>>("/api/invoices?page=1&pageSize=500"),
        safeGet<ApiListResponse<QuotationRow>>("/api/quotations?page=1&pageSize=500"),
        safeGet<ApiListResponse<CreditNoteRow>>("/api/credit-notes?page=1&pageSize=500"),
        safeGet<ApiListResponse<CustomerRow>>("/api/customers"),
        safeGet<ApiListResponse<SupplierRow>>("/api/suppliers?page=1&pageSize=500"),
      ]);

      const invRows = Array.isArray(inv.data) ? inv.data : [];
      const quoRows = Array.isArray(quo.data) ? quo.data : [];
      const crnRows = Array.isArray(crn.data) ? crn.data : [];
      const customerRows = Array.isArray(cus.data) ? cus.data : [];
      const supplierRows = Array.isArray(sup.data) ? sup.data : [];

      setInvoices(invRows);
      setQuotations(quoRows);
      setCustomers(customerRows);
      setSuppliers(supplierRows);

      buildDashboard(invRows, crnRows);
      setLastSync(fmtDateTime(new Date()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to refresh dashboard");
      setInvoices([]);
      setQuotations([]);
      setCustomers([]);
      setSuppliers([]);
      setSeries([]);
      setStatusSlices([]);
      setAging([]);
      setDueRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildDashboard]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ---- Single source of truth for headline figures: the selected period. ----
  // paid_amount = cash collected, credited_amount = credit notes applied
  // (not cash), balance_amount = outstanding. Pro Forma invoices are never
  // counted (isVatReceivableInvoice / isPaidRevenueInvoice / isCollectionInvoice
  // all require invoice_type === "VAT_INVOICE").
  function summarizeInvoicesInRange(rows: InvoiceRow[], from: Date, to: Date) {
    const inRange = rows.filter((inv) => {
      const d = safeDate(inv.invoice_date ?? inv.created_at);
      return d ? d >= from && d <= to : false;
    });

    return {
      revenue: inRange.filter(isPaidRevenueInvoice).reduce((s, x) => s + n2(x.total_amount), 0),
      paid: inRange.filter(isCollectionInvoice).reduce((s, x) => s + n2(x.paid_amount), 0),
      credited: inRange.filter(isVatReceivableInvoice).reduce((s, x) => s + n2(x.credited_amount), 0),
      outstanding: inRange.filter(isVatReceivableInvoice).reduce((s, x) => s + n2(x.balance_amount), 0),
      invoiceCount: inRange.length,
    };
  }

  const periodSummary = React.useMemo(() => {
    const from = new Date(`${periodFilter.from}T00:00:00`);
    const to = new Date(`${periodFilter.to}T23:59:59`);
    return summarizeInvoicesInRange(invoices, from, to);
  }, [invoices, periodFilter.from, periodFilter.to]);

  const priorPeriodSummary = React.useMemo(() => {
    const { from, to } = priorPeriodRange(periodFilter.from, periodFilter.to);
    return summarizeInvoicesInRange(invoices, from, to);
  }, [invoices, periodFilter.from, periodFilter.to]);

  const revenueDelta = deltaPct(periodSummary.revenue, priorPeriodSummary.revenue);
  const paidDelta = deltaPct(periodSummary.paid, priorPeriodSummary.paid);
  const creditedDelta = deltaPct(periodSummary.credited, priorPeriodSummary.credited);
  const outstandingDelta = deltaPct(periodSummary.outstanding, priorPeriodSummary.outstanding);

  // Snapshot figures unrelated to the period filter (current pipeline / aging total).
  const quotationPipeline = React.useMemo(
    () => quotations.filter((q) => String(q.status ?? "").toUpperCase() !== "VOID").reduce((s, x) => s + n2(x.total_amount), 0),
    [quotations]
  );

  const totalAging = React.useMemo(() => aging.reduce((s, x) => s + x.value, 0), [aging]);
  const overdueCount = React.useMemo(() => invoices.filter(isOverdue).length, [invoices]);

  const pieColors = ["#071b38", "#ff8a1e", "#0f766e", "#64748b", "#22c55e"];

  return (
    <div className="space-y-3 pb-1">
      {/* Hero */}
      <ShellCard className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.12),transparent_55%),radial-gradient(700px_260px_at_110%_0%,rgba(255,138,30,0.18),transparent_55%)]" />

        <div className="relative flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white ring-1 ring-white/15">
                <Building2 className="size-3.5" />
                KS Contracting
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[10.5px] font-semibold text-white ring-1 ring-white/15">
                <ShieldCheck className="size-3.5" />
                Executive Dashboard
              </span>
            </div>
            <h1 className="mt-2.5 text-xl font-extrabold tracking-tight text-white sm:text-2xl">Dashboard</h1>
            <p className="mt-0.5 text-[12.5px] text-blue-50/80">Real-time finance overview</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div suppressHydrationWarning className="rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15">
              {lastSync || "â€”"}
            </div>
            <Button
              onClick={() => void load()}
              disabled={loading}
              className="h-10 rounded-xl bg-[#ff8a1e] px-4 text-sm text-white hover:bg-[#f07c0f]"
            >
              <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </ShellCard>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
      ) : null}

      {/* Unified period-filterable KPI section â€” the single source of truth
          for Revenue / Cash Collected / Credited / Outstanding, replacing the
          previous duplicate "this month vs last month" cards. */}
      <ShellCard className="p-4 sm:p-5">
        <SectionHeader
          title="Performance Summary"
          sub={`${periodSummary.invoiceCount} invoice${periodSummary.invoiceCount === 1 ? "" : "s"} in the selected period`}
        />

        <div className="mt-3">
          <ReportFilterBar value={periodFilter} onChange={setPeriodFilter} showGrouping={false} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <KpiCard
            label="Revenue"
            value={money(periodSummary.revenue)}
            delta={revenueDelta.delta}
            trend={revenueDelta.trend}
            accent="navy"
            icon={TrendingUp}
          />
          <KpiCard
            label="Cash Collected"
            value={money(periodSummary.paid)}
            delta={paidDelta.delta}
            trend={paidDelta.trend}
            accent="green"
            icon={Landmark}
          />
          <KpiCard
            label="Credited"
            value={money(periodSummary.credited)}
            delta={creditedDelta.delta}
            trend={creditedDelta.trend}
            accent="slate"
            icon={Receipt}
          />
          <KpiCard
            label="Outstanding"
            value={money(periodSummary.outstanding)}
            delta={outstandingDelta.delta}
            trend={outstandingDelta.trend}
            accent="orange"
            icon={AlertTriangle}
          />
        </div>
      </ShellCard>

      {/* Trend + status breakdown */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.7fr_1fr]">
        <ShellCard className="p-4 sm:p-5">
          <SectionHeader
            title="Revenue, Collections & Credits"
            sub={`${fixedMonths[0] ? monthLabel(fixedMonths[0]) : ""} ${fixedStart.getFullYear()} â†’ ${
              fixedMonths[11] ? monthLabel(fixedMonths[11]) : ""
            } ${fixedMonths[11]?.getFullYear() ?? ""}`}
            right={
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 ring-1 ring-slate-200">
                MUR
              </span>
            }
          />

          <div className="mt-3 h-[240px] min-h-[220px] w-full min-w-0 overflow-hidden sm:h-[260px]">
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <AreaChart data={series} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#071b38" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#071b38" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dashboardCollections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(v) => moneyShort(Number(v))}
                />
                <Tooltip content={<PremiumTooltip />} />

                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#071b38" strokeWidth={2.5} fill="url(#dashboardRevenue)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                <Area type="monotone" dataKey="collections" name="Collected" stroke="#22c55e" strokeWidth={2.5} fill="url(#dashboardCollections)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                <Area type="monotone" dataKey="dues" name="Outstanding" stroke="#ef4444" strokeWidth={2} fill="transparent" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[#071b38]">
              <span className="inline-block size-2.5 rounded-full bg-[#071b38]" /> Revenue
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <span className="inline-block size-2.5 rounded-full bg-emerald-500" /> Collected
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700">
              <span className="inline-block size-2.5 rounded-full bg-rose-500" /> Outstanding
            </span>
          </div>
        </ShellCard>

        <ShellCard className="p-4 sm:p-5">
          <SectionHeader title="Invoice Status" right={<span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 ring-1 ring-slate-200">Live</span>} />

          <div className="mt-2 h-[180px] min-h-[170px] w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <PieChart>
                <Tooltip content={<PremiumTooltip />} />
                <Pie
                  data={statusSlices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={44}
                  outerRadius={68}
                  paddingAngle={3}
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {statusSlices.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {statusSlices.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                  {s.name}
                </div>
                <span className="text-xs font-extrabold text-slate-950">{s.value}</span>
              </div>
            ))}
          </div>
        </ShellCard>
      </div>

      {/* Aging + Snapshot/Quick actions */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <ShellCard className="p-4 sm:p-5">
          <SectionHeader
            title="Receivables Aging"
            right={<span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 ring-1 ring-slate-200">{money(totalAging)}</span>}
          />

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[170px_1fr]">
            <div className="h-[180px] min-h-[170px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={180} minWidth={0}>
                <PieChart>
                  <Tooltip content={<PremiumTooltip />} />
                  <Pie
                    data={aging}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={38}
                    outerRadius={64}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.95)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {aging.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-1.5">
              {aging.map((b, i) => {
                const pct = totalAging ? (b.value / totalAging) * 100 : 0;
                return (
                  <div key={b.name} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-slate-700">{b.name} days</div>
                      <div className="text-xs font-extrabold text-slate-950">{money(b.value)}</div>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full" style={{ width: `${clamp(pct, 0, 100)}%`, backgroundColor: pieColors[i % pieColors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ShellCard>

        <ShellCard className="p-4 sm:p-5">
          <SectionHeader title="Snapshot & Quick Actions" />

          <div className="mt-3 grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-200">
              <Users className="mx-auto size-3.5 text-slate-400" />
              <div className="mt-1 text-sm font-extrabold text-slate-950">{customers.length}</div>
              <div className="text-[10px] font-semibold text-slate-500">Customers</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-200">
              <Truck className="mx-auto size-3.5 text-slate-400" />
              <div className="mt-1 text-sm font-extrabold text-slate-950">{suppliers.length}</div>
              <div className="text-[10px] font-semibold text-slate-500">Suppliers</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-200">
              <FileSpreadsheet className="mx-auto size-3.5 text-slate-400" />
              <div className="mt-1 truncate text-sm font-extrabold text-slate-950">{moneyShort(quotationPipeline)}</div>
              <div className="text-[10px] font-semibold text-slate-500">Pipeline</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-200">
              <Clock className="mx-auto size-3.5 text-slate-400" />
              <div className="mt-1 text-sm font-extrabold text-slate-950">{overdueCount}</div>
              <div className="text-[10px] font-semibold text-slate-500">Overdue</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <Button
              className="h-10 justify-between rounded-xl bg-[#071b38] text-sm text-white hover:bg-[#06142b]"
              onClick={() => router.push("/sales/invoices/new")}
            >
              <span className="inline-flex items-center gap-2"><FileText className="size-4" /> New Invoice</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" className="h-10 justify-between rounded-xl text-sm" onClick={() => router.push("/payments/new")}>
              <span className="inline-flex items-center gap-2"><Wallet className="size-4" /> Record Payment</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" className="h-10 justify-between rounded-xl text-sm" onClick={() => router.push("/payments/report")}>
              <span className="inline-flex items-center gap-2"><CreditCard className="size-4" /> Payments Report</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" className="h-10 justify-between rounded-xl text-sm" onClick={() => router.push("/reports/vat")}>
              <span className="inline-flex items-center gap-2"><BadgePercent className="size-4" /> VAT Report</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" className="h-10 justify-between rounded-xl text-sm" onClick={() => router.push("/reports/soa")}>
              <span className="inline-flex items-center gap-2"><Clock className="size-4" /> Statement of Account</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" className="h-10 justify-between rounded-xl text-sm" onClick={() => router.push("/contacts")}>
              <span className="inline-flex items-center gap-2"><Users className="size-4" /> Customers</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </ShellCard>
      </div>

      {/* Top due customers */}
      <ShellCard className="p-4 sm:p-5">
        <SectionHeader title="Top Due Customers" right={<span className="text-[11px] font-semibold text-slate-400">{lastSync || "â€”"}</span>} />

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <div className="hidden grid-cols-12 bg-slate-50 px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-500 md:grid">
            <div className="col-span-4">Customer</div>
            <div className="col-span-2 text-right">Total Due</div>
            <div className="col-span-2 text-right">30+</div>
            <div className="col-span-2 text-right">60+</div>
            <div className="col-span-2 text-right">90+</div>
          </div>

          <div className="divide-y divide-slate-200 bg-white">
            {dueRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No outstanding balances</div>
            ) : (
              dueRows.map((r, i) => (
                <div key={`${r.customer}-${i}`}>
                  <div className="hidden grid-cols-12 px-3 py-2.5 text-sm md:grid">
                    <div className="col-span-4 min-w-0">
                      <div className="truncate font-semibold text-slate-900">{r.customer}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">Last: {r.lastInvoice}</div>
                    </div>
                    <div className="col-span-2 text-right font-bold text-slate-950">{money(r.totalDue)}</div>
                    <div className="col-span-2 text-right text-slate-700">{money(r.overdue30)}</div>
                    <div className="col-span-2 text-right text-slate-700">{money(r.overdue60)}</div>
                    <div className="col-span-2 text-right text-slate-700">{money(r.overdue90)}</div>
                  </div>

                  <div className="space-y-2 px-3 py-2.5 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{r.customer}</div>
                        <div className="text-[11px] text-slate-500">Last: {r.lastInvoice}</div>
                      </div>
                      <div className="text-right text-sm font-extrabold text-slate-950">{money(r.totalDue)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-500">30+</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-900">{money(r.overdue30)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-500">60+</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-900">{money(r.overdue60)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-500">90+</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-900">{money(r.overdue90)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ShellCard>
    </div>
  );
}


