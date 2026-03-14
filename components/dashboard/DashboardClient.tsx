"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  FileText,
  Users,
  BadgePercent,
  CreditCard,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* =========================
   Types
========================= */

type Accent = "navy" | "orange" | "muted" | "green" | "neutral";

type Kpi = {
  label: string;
  value: string;
  note?: string;
  accent?: Accent;
  delta?: string;
  trend?: "up" | "down" | "flat";
};

type SeriesPoint = {
  name: string;
  sales: number;
  expenses: number; // using credit notes / adjustments as real negative business movement
  invoices: number;
  cash: number;
};

type AgingBucket = { name: string; value: number };
type StatusSlice = { name: string; value: number };

type DueRow = {
  customer: string;
  totalDue: number;
  overdue30: number;
  overdue60: number;
  overdue90: number;
  lastInvoice: string;
};

type InvoiceRow = {
  id: string;
  invoice_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
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
  kpi?: any;
  error?: any;
};

type MonthlyAccumulator = {
  sales: number;
  expenses: number;
  invoices: number;
  cash: number;
};

type CustomerDueAccumulator = {
  customer: string;
  totalDue: number;
  overdue30: number;
  overdue60: number;
  overdue90: number;
  lastInvoice: string;
  lastInvoiceDateTs: number;
};

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

function fmtLastSync(d: Date) {
  const dd = d.toLocaleString(undefined, { day: "2-digit" });
  const mmm = d.toLocaleString(undefined, { month: "short" });
  const yyyy = d.toLocaleString(undefined, { year: "numeric" });
  const hhmm = d.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const ampm = d
    .toLocaleString(undefined, { hour: "numeric", hour12: true })
    .toLowerCase()
    .includes("pm")
    ? "pm"
    : "am";
  return `Last Sync at ${dd} ${mmm} ${yyyy}, ${hhmm} ${ampm}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function brandTone(a?: Accent) {
  if (a === "orange") return "bg-[#ff7a18]/12 text-[#c25708] ring-1 ring-[#ff7a18]/22";
  if (a === "navy") return "bg-[#071b38]/10 text-[#071b38] ring-1 ring-[#071b38]/18";
  if (a === "green") return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
  if (a === "muted") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
}

function safeDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleString(undefined, { month: "short" });
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function isOverdueRow(inv: InvoiceRow) {
  const balance = n2(inv.balance_amount);
  const due = safeDate(inv.due_date);
  if (!(balance > 0) || !due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function daysPastDue(inv: InvoiceRow) {
  const balance = n2(inv.balance_amount);
  const due = safeDate(inv.due_date);
  if (!(balance > 0) || !due) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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

/* =========================
   Premium Motion
========================= */

function useInViewOnce<T extends HTMLElement>(opts?: IntersectionObserverInit) {
  const ref = React.useRef<T | null>(null);
  const [seen, setSeen] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "120px", ...(opts || {}) }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [seen, opts]);

  return { ref, seen } as const;
}

function FadeInCard({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={cn(
        "transform-gpu transition-all duration-700 ease-out",
        seen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}

/* =========================
   3D Card
========================= */

function Card3D({
  children,
  className,
  glow = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "navy" | "orange" | "neutral";
}) {
  const glowCls =
    glow === "orange"
      ? "before:bg-[radial-gradient(60%_60%_at_25%_15%,rgba(255,122,24,0.18),transparent_60%)]"
      : glow === "navy"
      ? "before:bg-[radial-gradient(60%_60%_at_25%_15%,rgba(7,27,56,0.14),transparent_60%)]"
      : "before:bg-[radial-gradient(60%_60%_at_25%_15%,rgba(15,23,42,0.10),transparent_60%)]";

  return (
    <div
      className={cn(
        "relative rounded-3xl bg-white",
        "shadow-[0_1px_0_rgba(15,23,42,0.08),0_18px_45px_rgba(15,23,42,0.10)]",
        "ring-1 ring-slate-200/80",
        "transform-gpu transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(15,23,42,0.08),0_26px_70px_rgba(15,23,42,0.14)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:opacity-90",
        glowCls,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(180deg,rgba(255,255,255,0.82),transparent_58%)] opacity-55" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/60" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* =========================
   KPI
========================= */

function TrendPill({ trend, delta }: { trend?: Kpi["trend"]; delta?: string }) {
  if (!delta) return null;

  const up = trend === "up";
  const down = trend === "down";

  const cls = up
    ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20"
    : down
    ? "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20"
    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", cls)}>
      {up ? <ArrowUpRight className="size-3.5" /> : down ? <ArrowDownRight className="size-3.5" /> : null}
      {delta}
    </span>
  );
}

function KpiTile({ kpi, delayMs = 0 }: { kpi: Kpi; delayMs?: number }) {
  return (
    <FadeInCard delayMs={delayMs} className="h-full">
      <Card3D
        glow={kpi.accent === "orange" ? "orange" : kpi.accent === "navy" ? "navy" : "neutral"}
        className="flex h-[178px] flex-col justify-between p-6"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm font-semibold leading-tight text-slate-800">{kpi.label}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <TrendPill trend={kpi.trend} delta={kpi.delta} />
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", brandTone(kpi.accent))}>MUR</span>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[30px] font-extrabold leading-none tracking-tight text-slate-900">{kpi.value}</div>
          </div>
          <div className="hidden size-10 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 sm:grid">
            <Sparkles className="size-4 text-slate-500" />
          </div>
        </div>

        <div className="mt-2 line-clamp-2 text-sm text-slate-600">{kpi.note || "\u00A0"}</div>
      </Card3D>
    </FadeInCard>
  );
}

/* =========================
   Tooltip
========================= */

function PremiumTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-white/95 px-3 py-2 shadow-[0_18px_55px_rgba(2,6,23,0.18)] ring-1 ring-slate-200 backdrop-blur-xl">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      <div className="mt-1 space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <span className="text-slate-600">{p.name}</span>
            <span className="font-semibold text-slate-900">
              {typeof p.value === "number" ? (p.dataKey === "invoices" ? p.value : money(p.value)) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   Dashboard
========================= */

export default function DashboardClient() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastSync, setLastSync] = React.useState<string>(fmtLastSync(new Date()));

  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [quotations, setQuotations] = React.useState<QuotationRow[]>([]);
  const [creditNotes, setCreditNotes] = React.useState<CreditNoteRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);

  const [kpis, setKpis] = React.useState<Kpi[]>([]);
  const [series, setSeries] = React.useState<SeriesPoint[]>([]);
  const [aging, setAging] = React.useState<AgingBucket[]>([]);
  const [statusSlices, setStatusSlices] = React.useState<StatusSlice[]>([]);
  const [dueRows, setDueRows] = React.useState<DueRow[]>([]);

  const now = React.useMemo(() => new Date(), []);
  const currentMonthStart = React.useMemo(() => startOfMonth(now), [now]);
  const previousMonthStart = React.useMemo(() => startOfMonth(addMonths(now, -1)), [now]);
  const previousMonthEnd = React.useMemo(() => endOfMonth(addMonths(now, -1)), [now]);

  const buildDashboard = React.useCallback(
    (
      invRows: InvoiceRow[],
      quoRows: QuotationRow[],
      crnRows: CreditNoteRow[],
      customerRows: CustomerRow[],
      supplierRows: SupplierRow[]
    ) => {
      const thisMonthInvoices = invRows.filter((x) => {
        const d = safeDate(x.invoice_date ?? x.created_at);
        return d ? isSameMonth(d, now) : false;
      });

      const prevMonthInvoices = invRows.filter((x) => {
        const d = safeDate(x.invoice_date ?? x.created_at);
        return d ? d >= previousMonthStart && d <= previousMonthEnd : false;
      });

      const thisMonthCredits = crnRows.filter((x) => {
        const d = safeDate(x.credit_date ?? x.created_at);
        return d ? isSameMonth(d, now) : false;
      });

      const prevMonthCredits = crnRows.filter((x) => {
        const d = safeDate(x.credit_date ?? x.created_at);
        return d ? d >= previousMonthStart && d <= previousMonthEnd : false;
      });

      const revenueThisMonth = thisMonthInvoices.reduce((s, x) => s + n2(x.total_amount), 0);
      const revenuePrevMonth = prevMonthInvoices.reduce((s, x) => s + n2(x.total_amount), 0);

      const outstanding = invRows.reduce((s, x) => s + n2(x.balance_amount), 0);
      const outstandingPrevMonth = prevMonthInvoices.reduce((s, x) => s + n2(x.balance_amount), 0);

      const adjustmentsThisMonth = thisMonthCredits.reduce((s, x) => s + n2(x.total_amount), 0);
      const adjustmentsPrevMonth = prevMonthCredits.reduce((s, x) => s + n2(x.total_amount), 0);

      const overdueValue = invRows
        .filter((x) => isOverdueRow(x))
        .reduce((s, x) => s + n2(x.balance_amount), 0);

      const overdueValuePrevMonth = prevMonthInvoices
        .filter((x) => isOverdueRow(x))
        .reduce((s, x) => s + n2(x.balance_amount), 0);

      const quotationPipeline = quoRows.reduce((s, x) => s + n2(x.total_amount), 0);
      const quotationsThisMonth = quoRows.filter((x) => {
        const d = safeDate(x.quote_date ?? x.created_at);
        return d ? isSameMonth(d, now) : false;
      }).length;

      const vatThisMonth = thisMonthInvoices.reduce((s, x) => s + n2(x.vat_amount), 0);
      const receivedThisMonth = thisMonthInvoices.reduce((s, x) => s + n2(x.paid_amount), 0);

      function pctDelta(current: number, prev: number) {
        if (prev <= 0 && current > 0) return { delta: "+100.0%", trend: "up" as const };
        if (prev <= 0 && current <= 0) return { delta: "0.0%", trend: "flat" as const };
        const pct = ((current - prev) / prev) * 100;
        return {
          delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
          trend: pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("flat" as const),
        };
      }

      const revenueDelta = pctDelta(revenueThisMonth, revenuePrevMonth);
      const outstandingDelta = pctDelta(outstanding, outstandingPrevMonth);
      const adjustmentsDelta = pctDelta(adjustmentsThisMonth, adjustmentsPrevMonth);
      const overdueDelta = pctDelta(overdueValue, overdueValuePrevMonth);

      setKpis([
        {
          label: "Revenue (This Month)",
          value: money(revenueThisMonth),
          note: `${thisMonthInvoices.length} invoice(s) issued this month.`,
          accent: "navy",
          delta: revenueDelta.delta,
          trend: revenueDelta.trend,
        },
        {
          label: "Outstanding",
          value: money(outstanding),
          note: "Open balances across all unpaid and partial invoices.",
          accent: "orange",
          delta: outstandingDelta.delta,
          trend: outstandingDelta.trend,
        },
        {
          label: "Credit Notes / Adjustments",
          value: money(adjustmentsThisMonth),
          note: `${thisMonthCredits.length} credit note(s) this month.`,
          accent: "muted",
          delta: adjustmentsDelta.delta,
          trend: adjustmentsDelta.trend,
        },
        {
          label: "Overdue",
          value: money(overdueValue),
          note: `${invRows.filter((x) => isOverdueRow(x)).length} overdue invoice(s).`,
          accent: "orange",
          delta: overdueDelta.delta,
          trend: overdueDelta.trend,
        },
      ]);

      const monthStarts = Array.from({ length: 6 }).map((_, i) => startOfMonth(addMonths(now, -5 + i)));

      const seriesMap = new Map<string, MonthlyAccumulator>();
      for (const m of monthStarts) {
        seriesMap.set(monthKey(m), { sales: 0, expenses: 0, invoices: 0, cash: 0 });
      }

      for (const inv of invRows) {
        const d = safeDate(inv.invoice_date ?? inv.created_at);
        if (!d) continue;
        const key = monthKey(startOfMonth(d));
        const row = seriesMap.get(key);
        if (!row) continue;
        row.sales += n2(inv.total_amount);
        row.cash += n2(inv.paid_amount);
        row.invoices += 1;
      }

      for (const crn of crnRows) {
        const d = safeDate(crn.credit_date ?? crn.created_at);
        if (!d) continue;
        const key = monthKey(startOfMonth(d));
        const row = seriesMap.get(key);
        if (!row) continue;
        row.expenses += n2(crn.total_amount);
      }

      setSeries(
        monthStarts.map((m) => {
          const row = seriesMap.get(monthKey(m)) ?? { sales: 0, expenses: 0, invoices: 0, cash: 0 };
          return {
            name: monthLabel(m),
            sales: row.sales,
            expenses: row.expenses,
            invoices: row.invoices,
            cash: row.cash,
          };
        })
      );

      const agingBuckets: AgingBucket[] = [
        { name: "0–15 days", value: 0 },
        { name: "16–30 days", value: 0 },
        { name: "31–60 days", value: 0 },
        { name: "61–90 days", value: 0 },
        { name: "90+ days", value: 0 },
      ];

      for (const inv of invRows) {
        const bal = n2(inv.balance_amount);
        if (bal <= 0) continue;
        const days = daysPastDue(inv);

        if (days <= 15) agingBuckets[0].value += bal;
        else if (days <= 30) agingBuckets[1].value += bal;
        else if (days <= 60) agingBuckets[2].value += bal;
        else if (days <= 90) agingBuckets[3].value += bal;
        else agingBuckets[4].value += bal;
      }

      setAging(agingBuckets);

      const paidCount = invRows.filter((x) => String(x.status ?? "").toUpperCase() === "PAID").length;
      const issuedCount = invRows.filter((x) => String(x.status ?? "").toUpperCase() === "ISSUED").length;
      const partialCount = invRows.filter((x) => String(x.status ?? "").toUpperCase() === "PARTIALLY_PAID").length;
      const overdueCount = invRows.filter((x) => isOverdueRow(x)).length;

      setStatusSlices([
        { name: "Paid", value: paidCount },
        { name: "Issued", value: issuedCount },
        { name: "Partial", value: partialCount },
        { name: "Overdue", value: overdueCount },
      ]);

      const dueMap = new Map<string, CustomerDueAccumulator>();

      for (const inv of invRows) {
        const bal = n2(inv.balance_amount);
        if (bal <= 0) continue;

        const customer = inv.customer_name?.trim() || "Unknown Customer";
        const days = daysPastDue(inv);
        const invDate = safeDate(inv.invoice_date ?? inv.created_at);
        const invTs = invDate ? invDate.getTime() : 0;

        const current =
          dueMap.get(customer) ??
          {
            customer,
            totalDue: 0,
            overdue30: 0,
            overdue60: 0,
            overdue90: 0,
            lastInvoice: "—",
            lastInvoiceDateTs: 0,
          };

        current.totalDue += bal;
        if (days >= 30) current.overdue30 += bal;
        if (days >= 60) current.overdue60 += bal;
        if (days >= 90) current.overdue90 += bal;
        if (invTs >= current.lastInvoiceDateTs) {
          current.lastInvoiceDateTs = invTs;
          current.lastInvoice = inv.invoice_no || "—";
        }

        dueMap.set(customer, current);
      }

      const sortedDue = Array.from(dueMap.values())
        .sort((a, b) => b.totalDue - a.totalDue)
        .slice(0, 8)
        .map(({ lastInvoiceDateTs, ...rest }) => rest);

      setDueRows(sortedDue);

      const totalCustomers = customerRows.length;
      const totalSuppliers = supplierRows.length;
      const totalAging = agingBuckets.reduce((a, b) => a + b.value, 0);

      // keep values available in UI by deriving from state inputs
      // no return needed, but these help with notes elsewhere if you want later
      void totalCustomers;
      void totalSuppliers;
      void totalAging;
      void quotationPipeline;
      void quotationsThisMonth;
      void vatThisMonth;
      void receivedThisMonth;
    },
    [now, previousMonthEnd, previousMonthStart]
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
      setCreditNotes(crnRows);
      setCustomers(customerRows);
      setSuppliers(supplierRows);

      buildDashboard(invRows, quoRows, crnRows, customerRows, supplierRows);
      setLastSync(fmtLastSync(new Date()));
    } catch (e: any) {
      setError(e?.message || "Failed to refresh");
      setInvoices([]);
      setQuotations([]);
      setCreditNotes([]);
      setCustomers([]);
      setSuppliers([]);
      setKpis([]);
      setSeries([]);
      setAging([]);
      setStatusSlices([]);
      setDueRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildDashboard]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totalAging = React.useMemo(() => aging.reduce((a, b) => a + b.value, 0), [aging]);

  const pieColors = ["#071b38", "#ff7a18", "#64748b", "#0ea5e9", "#22c55e"];

  const revenueThisMonth = React.useMemo(() => {
    return invoices
      .filter((x) => {
        const d = safeDate(x.invoice_date ?? x.created_at);
        return d ? d >= currentMonthStart : false;
      })
      .reduce((s, x) => s + n2(x.total_amount), 0);
  }, [invoices, currentMonthStart]);

  const quotationPipeline = React.useMemo(
    () => quotations.reduce((s, x) => s + n2(x.total_amount), 0),
    [quotations]
  );

  const creditNoteValue = React.useMemo(
    () => creditNotes.reduce((s, x) => s + n2(x.total_amount), 0),
    [creditNotes]
  );

  const collections = React.useMemo(
    () => invoices.reduce((s, x) => s + n2(x.paid_amount), 0),
    [invoices]
  );

  const outstanding = React.useMemo(
    () => invoices.reduce((s, x) => s + n2(x.balance_amount), 0),
    [invoices]
  );

  const issuedCount = React.useMemo(
    () => invoices.filter((x) => String(x.status ?? "").toUpperCase() === "ISSUED").length,
    [invoices]
  );

  const overdueCount = React.useMemo(
    () => invoices.filter((x) => isOverdueRow(x)).length,
    [invoices]
  );

  return (
    <>
      <style jsx global>{`
        @keyframes floatIn {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div className="space-y-3">
        {/* Header */}
        <FadeInCard>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[22px] font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
                Dashboard
              </div>
              <div className="mt-0.5 text-sm text-slate-600">
                Live overview for invoices, collections, quotations, VAT and receivables.
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="inline-flex items-center justify-end gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 shadow-sm">
                  {lastSync}
                </span>
                <Button
                  onClick={() => void load()}
                  className="rounded-2xl bg-[#ff7a18] text-white shadow-[0_18px_44px_rgba(255,122,24,0.22)] hover:bg-[#ff6a00]"
                  disabled={loading}
                >
                  <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </FadeInCard>

        {error ? (
          <FadeInCard>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          </FadeInCard>
        ) : null}

        {/* KPI tiles */}
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => (
            <div key={k.label} className="h-full">
              <KpiTile kpi={k} delayMs={i * 55} />
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-3">
          <FadeInCard delayMs={60} className="h-full xl:col-span-2">
            <Card3D glow="navy" className="h-full p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Revenue, Adjustments & Cash (Last 6 months)
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Real invoice totals, real credit notes, and real cash received.
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-500">MUR</div>
              </div>

              <div className="mt-3 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 10, right: 18, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#071b38" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#071b38" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff7a18" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#ff7a18" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip content={<PremiumTooltip />} />

                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Revenue"
                      stroke="#071b38"
                      strokeWidth={3}
                      fill="url(#revFill)"
                      dot={false}
                      isAnimationActive
                      animationDuration={850}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Adjustments"
                      stroke="#64748b"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive
                      animationDuration={850}
                    />
                    <Area
                      type="monotone"
                      dataKey="cash"
                      name="Cash Received"
                      stroke="#ff7a18"
                      strokeWidth={2.5}
                      fill="url(#cashFill)"
                      dot={false}
                      isAnimationActive
                      animationDuration={850}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-600">Avg. Revenue</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {money(series.reduce((a, b) => a + b.sales, 0) / Math.max(1, series.length))}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-600">Avg. Adjustments</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {money(series.reduce((a, b) => a + b.expenses, 0) / Math.max(1, series.length))}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-600">Invoices / Month</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {Math.round(series.reduce((a, b) => a + b.invoices, 0) / Math.max(1, series.length))}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-600">Cash / Month</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {money(series.reduce((a, b) => a + b.cash, 0) / Math.max(1, series.length))}
                  </div>
                </div>
              </div>
            </Card3D>
          </FadeInCard>

          <div className="grid h-full gap-3">
            <FadeInCard delayMs={90} className="h-full">
              <Card3D glow="orange" className="p-5">
                <div className="text-sm font-semibold text-slate-900">Invoice Status</div>
                <div className="mt-1 text-sm text-slate-600">Live operational breakdown from invoice records.</div>

                <div className="mt-3 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<PremiumTooltip />} />
                      <Legend verticalAlign="bottom" height={26} />
                      <Pie
                        data={statusSlices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={82}
                        paddingAngle={2}
                        isAnimationActive
                        animationDuration={850}
                      >
                        {statusSlices.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold text-slate-600">Overdue (count)</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{overdueCount}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold text-slate-600">Issued (count)</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{issuedCount}</div>
                  </div>
                </div>
              </Card3D>
            </FadeInCard>

            <FadeInCard delayMs={120} className="h-full">
              <Card3D glow="neutral" className="p-5">
                <div className="text-sm font-semibold text-slate-900">Invoices & Cash</div>
                <div className="mt-1 text-sm text-slate-600">Monthly invoice volume against cash received.</div>

                <div className="mt-3 h-[210px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip content={<PremiumTooltip />} />
                      <Bar
                        dataKey="invoices"
                        name="Invoices"
                        fill="#071b38"
                        radius={[12, 12, 0, 0]}
                        isAnimationActive
                        animationDuration={850}
                      />
                      <Bar
                        dataKey="cash"
                        name="Cash"
                        fill="#ff7a18"
                        radius={[12, 12, 0, 0]}
                        isAnimationActive
                        animationDuration={850}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Collections are calculated from real invoice paid amounts.
                </div>
              </Card3D>
            </FadeInCard>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-3">
          <FadeInCard delayMs={140} className="h-full xl:col-span-2">
            <Card3D glow="navy" className="h-full p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Receivables Aging</div>
                  <div className="mt-1 text-sm text-slate-600">Outstanding balances by aging bucket.</div>
                </div>
                <div className="text-xs font-semibold text-slate-500">{money(totalAging)} total</div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<PremiumTooltip />} />
                      <Pie
                        data={aging}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={54}
                        outerRadius={94}
                        paddingAngle={2}
                        isAnimationActive
                        animationDuration={850}
                      >
                        {aging.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-2">
                  {aging.map((b, i) => {
                    const pct = totalAging ? (b.value / totalAging) * 100 : 0;
                    return (
                      <div key={b.name} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-800">{b.name}</div>
                          <div className="text-sm font-extrabold text-slate-900">{money(b.value)}</div>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${clamp(pct, 2, 100)}%`,
                              background: pieColors[i % pieColors.length],
                              transition: "width 650ms ease",
                            }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{pct.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card3D>
          </FadeInCard>

          <FadeInCard delayMs={170} className="h-full">
            <Card3D glow="orange" className="h-full p-5">
              <div className="text-sm font-semibold text-slate-900">Quick Actions</div>
              <div className="mt-1 text-sm text-slate-600">Fast access to the most-used workflows.</div>

              <div className="mt-3 grid gap-2">
                <Button
                  className="w-full rounded-2xl bg-[#071b38] text-white shadow-[0_14px_40px_rgba(7,27,56,0.18)] hover:bg-[#06142b]"
                  onClick={() => router.push("/sales/invoices/new")}
                >
                  <FileText className="mr-2 size-4" />
                  New Invoice
                </Button>

                <Button variant="outline" className="w-full rounded-2xl" onClick={() => router.push("/contacts")}>
                  <Users className="mr-2 size-4" />
                  New Customer
                </Button>

                <Button variant="outline" className="w-full rounded-2xl" onClick={() => router.push("/reports/vat")}>
                  <BadgePercent className="mr-2 size-4" />
                  VAT Report
                </Button>

                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => router.push("/sales/invoices")}
                >
                  <CreditCard className="mr-2 size-4" />
                  Record Payment
                </Button>

                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => router.push("/reports/soa")}
                >
                  <Clock className="mr-2 size-4" />
                  Overdue List
                </Button>
              </div>

              <div className="mt-3 rounded-2xl bg-[#ff7a18]/10 p-3 ring-1 ring-[#ff7a18]/20">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#c25708]">Live Insight</div>
                  <Sparkles className="size-4 text-[#c25708]" />
                </div>
                <div className="mt-1 text-xs text-[#8a3f06]">
                  Revenue this month is <span className="font-semibold">{money(revenueThisMonth)}</span>. Quotation pipeline is{" "}
                  <span className="font-semibold">{money(quotationPipeline)}</span>.
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-700">Master Data</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                    Customers: <span className="font-extrabold text-slate-900">{customers.length}</span>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                    Suppliers: <span className="font-extrabold text-slate-900">{suppliers.length}</span>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                    Quotations: <span className="font-extrabold text-slate-900">{quotations.length}</span>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                    Credit Notes: <span className="font-extrabold text-slate-900">{creditNotes.length}</span>
                  </div>
                </div>
              </div>
            </Card3D>
          </FadeInCard>
        </div>

        {/* Due table */}
        <FadeInCard delayMs={200}>
          <Card3D glow="neutral" className="p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Invoice Due Details (by Customer)</div>
                <div className="mt-1 text-sm text-slate-600">Top customer exposures with 30/60/90+ day split.</div>
              </div>
              <div className="text-xs text-slate-500">Real data</div>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <div className="col-span-4">Customer</div>
                <div className="col-span-2 text-right">Total Due</div>
                <div className="col-span-2 text-right">30+ Days</div>
                <div className="col-span-2 text-right">60+ Days</div>
                <div className="col-span-2 text-right">90+ Days</div>
              </div>

              <div className="divide-y divide-slate-200">
                {dueRows.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    No outstanding customer balances found.
                  </div>
                ) : (
                  dueRows.map((r, i) => (
                    <div
                      key={`${r.customer}-${i}`}
                      className="grid grid-cols-12 px-4 py-3 text-sm transition-colors hover:bg-slate-50"
                      style={{ animation: `floatIn 650ms ease ${(i * 55) / 1000}s both` }}
                    >
                      <div className="col-span-4">
                        <div className="font-semibold text-slate-900">{r.customer}</div>
                        <div className="text-xs text-slate-500">Last invoice: {r.lastInvoice}</div>
                      </div>
                      <div className="col-span-2 text-right font-semibold text-slate-900">{money(r.totalDue)}</div>
                      <div className="col-span-2 text-right text-slate-800">{money(r.overdue30)}</div>
                      <div className="col-span-2 text-right text-slate-800">{money(r.overdue60)}</div>
                      <div className="col-span-2 text-right text-slate-800">{money(r.overdue90)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Total Sales</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{money(invoices.reduce((s, x) => s + n2(x.total_amount), 0))}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Collections</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{money(collections)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Credit Notes</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{money(creditNoteValue)}</div>
              </div>
            </div>
          </Card3D>
        </FadeInCard>
      </div>
    </>
  );
}