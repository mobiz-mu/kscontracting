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
  BarChart,
  Bar,
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
  Sparkles,
  Receipt,
  AlertTriangle,
  Landmark,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* =========================
   Types
========================= */

type Accent = "navy" | "orange" | "green" | "slate";

type Kpi = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  accent?: Accent;
  icon: React.ElementType;
};

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

/* =========================
   Utils
========================= */

function n2(v: any) {
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
  return `${dd}/${mm}/${yyyy}  •  ${hh}:${mi}`;
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

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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

function invoiceTypeKey(inv: InvoiceRow) {
  return String(inv.invoice_type ?? "").toUpperCase();
}

function invoiceStatusKey(inv: InvoiceRow) {
  return String(inv.status ?? "").toUpperCase();
}

function isVatReceivableInvoice(inv: InvoiceRow) {
  return (
    invoiceTypeKey(inv) === "VAT_INVOICE" &&
    !["DRAFT", "VOID"].includes(invoiceStatusKey(inv))
  );
}

function isPaidRevenueInvoice(inv: InvoiceRow) {
  return (
    invoiceTypeKey(inv) === "VAT_INVOICE" &&
    invoiceStatusKey(inv) === "PAID"
  );
}

function isCollectionInvoice(inv: InvoiceRow) {
  return (
    invoiceTypeKey(inv) === "VAT_INVOICE" &&
    invoiceStatusKey(inv) !== "VOID"
  );
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

/* =========================
   UI
========================= */

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
        "relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white",
        "shadow-[0_1px_0_rgba(15,23,42,0.05),0_12px_30px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),transparent_65%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function accentBadge(accent?: Accent) {
  if (accent === "orange") return "bg-[#ff8a1e]/10 text-[#c25708] ring-[#ff8a1e]/20";
  if (accent === "green") return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20";
  if (accent === "navy") return "bg-[#071b38]/10 text-[#071b38] ring-[#071b38]/15";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function TrendPill({
  trend,
  delta,
}: {
  trend?: "up" | "down" | "flat";
  delta?: string;
}) {
  if (!delta) return null;

  const cls =
    trend === "up"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
      : trend === "down"
      ? "bg-rose-500/10 text-rose-700 ring-rose-500/20"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", cls)}>
      {trend === "up" ? <ArrowUpRight className="size-3.5" /> : null}
      {trend === "down" ? <ArrowDownRight className="size-3.5" /> : null}
      {delta}
    </span>
  );
}

function KpiCard({ item }: { item: Kpi }) {
  const Icon = item.icon;

  return (
    <ShellCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {item.label}
          </div>
          <div className="mt-2 text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl xl:text-[22px]">
            {item.value}
          </div>
        </div>

        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-2xl ring-1",
            accentBadge(item.accent)
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs text-slate-500">Real data</div>
        <TrendPill trend={item.trend} delta={item.delta} />
      </div>
    </ShellCard>
  );
}

function PremiumTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_35px_rgba(2,6,23,0.14)]">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 space-y-1">
        {payload.map((p: any) => (
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

/* =========================
   Page
========================= */

export default function DashboardClient() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastSync, setLastSync] = React.useState("");

  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [quotations, setQuotations] = React.useState<QuotationRow[]>([]);
  const [creditNotes, setCreditNotes] = React.useState<CreditNoteRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);

  const [kpis, setKpis] = React.useState<Kpi[]>([]);
  const [series, setSeries] = React.useState<SeriesPoint[]>([]);
  const [statusSlices, setStatusSlices] = React.useState<StatusSlice[]>([]);
  const [aging, setAging] = React.useState<AgingBucket[]>([]);
  const [dueRows, setDueRows] = React.useState<DueRow[]>([]);

  const now = React.useMemo(() => new Date(), []);
  const currentMonthStart = React.useMemo(() => startOfMonth(now), [now]);
  const previousMonthStart = React.useMemo(() => startOfMonth(addMonths(now, -1)), [now]);
  const previousMonthEnd = React.useMemo(() => endOfMonth(addMonths(now, -1)), [now]);

  const fixedStart = React.useMemo(() => new Date(2026, 2, 1), []);
  const fixedMonths = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => addMonths(fixedStart, i)),
    [fixedStart]
  );

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

      const thisMonthCreditNotes = crnRows.filter((x) => {
        const d = safeDate(x.credit_date ?? x.created_at);
        return d ? isSameMonth(d, now) : false;
      });

      const prevMonthCreditNotes = crnRows.filter((x) => {
        const d = safeDate(x.credit_date ?? x.created_at);
        return d ? d >= previousMonthStart && d <= previousMonthEnd : false;
      });

      const thisMonthPaidRevenueInvoices = thisMonthInvoices.filter(isPaidRevenueInvoice);
const prevMonthPaidRevenueInvoices = prevMonthInvoices.filter(isPaidRevenueInvoice);

const receivableInvoicesNow = invRows.filter(isVatReceivableInvoice);
const receivableInvoicesPrev = prevMonthInvoices.filter(isVatReceivableInvoice);

const thisMonthCollectionInvoices = thisMonthInvoices.filter(isCollectionInvoice);
const prevMonthCollectionInvoices = prevMonthInvoices.filter(isCollectionInvoice);

const revenueThisMonth = thisMonthPaidRevenueInvoices.reduce(
  (s, x) => s + n2(x.total_amount),
  0
);

const revenuePrevMonth = prevMonthPaidRevenueInvoices.reduce(
  (s, x) => s + n2(x.total_amount),
  0
);

const outstandingNow = receivableInvoicesNow.reduce(
  (s, x) => s + n2(x.balance_amount),
  0
);

const outstandingPrev = receivableInvoicesPrev.reduce(
  (s, x) => s + n2(x.balance_amount),
  0
);

const collectionsThisMonth = thisMonthCollectionInvoices.reduce(
  (s, x) => s + n2(x.paid_amount),
  0
);

const collectionsPrevMonth = prevMonthCollectionInvoices.reduce(
  (s, x) => s + n2(x.paid_amount),
  0
);

      const creditThisMonth = thisMonthCreditNotes.reduce((s, x) => s + n2(x.total_amount), 0);
      const creditPrevMonth = prevMonthCreditNotes.reduce((s, x) => s + n2(x.total_amount), 0);

      const revenueDelta = deltaPct(revenueThisMonth, revenuePrevMonth);
      const outstandingDelta = deltaPct(outstandingNow, outstandingPrev);
      const collectionsDelta = deltaPct(collectionsThisMonth, collectionsPrevMonth);
      const creditDelta = deltaPct(creditThisMonth, creditPrevMonth);

      setKpis([
        {
          label: "Revenue",
          value: money(revenueThisMonth),
          delta: revenueDelta.delta,
          trend: revenueDelta.trend,
          accent: "navy",
          icon: TrendingUp,
        },
        {
          label: "Outstanding",
          value: money(outstandingNow),
          delta: outstandingDelta.delta,
          trend: outstandingDelta.trend,
          accent: "orange",
          icon: AlertTriangle,
        },
        {
          label: "Collections",
          value: money(collectionsThisMonth),
          delta: collectionsDelta.delta,
          trend: collectionsDelta.trend,
          accent: "green",
          icon: Landmark,
        },
        {
          label: "Credit Notes",
          value: money(creditThisMonth),
          delta: creditDelta.delta,
          trend: creditDelta.trend,
          accent: "slate",
          icon: Receipt,
        },
      ]);

      const seriesMap = new Map<
        string,
        { revenue: number; collections: number; credits: number; dues: number }
      >();

      for (const m of fixedMonths) {
        seriesMap.set(monthKey(m), {
          revenue: 0,
          collections: 0,
          credits: 0,
          dues: 0,
        });
      }

      for (const inv of invRows) {
  const d = safeDate(inv.invoice_date ?? inv.created_at);
  if (!d) continue;

  const key = monthKey(startOfMonth(d));
  const slot = seriesMap.get(key);
  if (!slot) continue;

  if (isPaidRevenueInvoice(inv)) {
    slot.revenue += n2(inv.total_amount);
  }

  if (isCollectionInvoice(inv)) {
    slot.collections += n2(inv.paid_amount);
  }

  if (isVatReceivableInvoice(inv)) {
    slot.dues += n2(inv.balance_amount);
  }
}

      for (const crn of crnRows) {
        const d = safeDate(crn.credit_date ?? crn.created_at);
        if (!d) continue;

        const key = monthKey(startOfMonth(d));
        const slot = seriesMap.get(key);
        if (!slot) continue;

        slot.credits += n2(crn.total_amount);
      }

      setSeries(
        fixedMonths.map((m) => {
          const slot = seriesMap.get(monthKey(m)) ?? {
            revenue: 0,
            collections: 0,
            credits: 0,
            dues: 0,
          };

          return {
            label: monthLabel(m),
            revenue: slot.revenue,
            collections: slot.collections,
            credits: slot.credits,
            dues: slot.dues,
          };
        })
      );


      const vatStatusRows = invRows.filter(
        (x) => invoiceTypeKey(x) === "VAT_INVOICE" && invoiceStatusKey(x) !== "VOID"
      );
  
      const paidCount = vatStatusRows.filter((x) => invoiceStatusKey(x) === "PAID").length;
      const issuedCount = vatStatusRows.filter((x) => invoiceStatusKey(x) === "ISSUED").length;
      const partialCount = vatStatusRows.filter((x) => invoiceStatusKey(x) === "PARTIALLY_PAID").length;
      const overdueCount = vatStatusRows.filter((x) => isOverdue(x)).length;

      setStatusSlices([
        { name: "Issued", value: issuedCount },
        { name: "Paid", value: paidCount },
        { name: "Partial", value: partialCount },
        { name: "Overdue", value: overdueCount },
      ]);

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
        .map(({ lastTs, ...rest }) => rest);

      setDueRows(sortedDue);

      void quoRows;
      void customerRows;
      void supplierRows;
    },
    [fixedMonths, now, previousMonthEnd, previousMonthStart]
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
      setLastSync(fmtDateTime(new Date()));
    } catch (e: any) {
      setError(e?.message || "Failed to refresh dashboard");
      setInvoices([]);
      setQuotations([]);
      setCreditNotes([]);
      setCustomers([]);
      setSuppliers([]);
      setKpis([]);
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

  const revenueThisMonth = React.useMemo(() => {
  return invoices
    .filter((x) => {
      const d = safeDate(x.invoice_date ?? x.created_at);
      return d ? d >= currentMonthStart : false;
    })
    .filter(isPaidRevenueInvoice)
    .reduce((s, x) => s + n2(x.total_amount), 0);
}, [invoices, currentMonthStart]);

const collections = React.useMemo(
  () =>
    invoices
      .filter(isCollectionInvoice)
      .reduce((s, x) => s + n2(x.paid_amount), 0),
  [invoices]
);

const outstanding = React.useMemo(
  () =>
    invoices
      .filter(isVatReceivableInvoice)
      .reduce((s, x) => s + n2(x.balance_amount), 0),
  [invoices]
);

  const quotationPipeline = React.useMemo(
    () => quotations.reduce((s, x) => s + n2(x.total_amount), 0),
    [quotations]
  );


  const creditNoteValue = React.useMemo(
    () => creditNotes.reduce((s, x) => s + n2(x.total_amount), 0),
    [creditNotes]
  );


  const totalAging = React.useMemo(() => aging.reduce((s, x) => s + x.value, 0), [aging]);

  const pieColors = ["#071b38", "#ff8a1e", "#0f766e", "#64748b", "#22c55e"];

  return (
    <div className="space-y-3 pb-1">
      <ShellCard className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.12),transparent_55%),radial-gradient(700px_260px_at_110%_0%,rgba(255,138,30,0.18),transparent_55%)]" />

        <div className="relative p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15">
                  <Building2 className="size-3.5" />
                  KS Contracting
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15">
                  <ShieldCheck className="size-3.5" />
                  Executive Dashboard
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-blue-50/85">Real-time finance overview</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div suppressHydrationWarning className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/15">
                {lastSync || "-"}
              </div>
              <Button
                onClick={() => void load()}
                disabled={loading}
                className="h-11 rounded-2xl bg-[#ff8a1e] px-4 text-white hover:bg-[#f07c0f]"
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </ShellCard>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.75fr_0.95fr]">
        <ShellCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight text-slate-950">
                Revenue / Collections / Credits
              </div>
              <div className="mt-0.5 text-xs text-slate-500">Mar 2026 â†’ Feb 2027</div>
            </div>

            <div className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
              Rs MUR
            </div>
          </div>

          <div className="mt-3 min-w-0 h-[210px] sm:h-[230px] lg:h-[245px] xl:h-[230px] 2xl:h-[250px]">
           <ResponsiveContainer width="100%" height={250}>                                                                                              <AreaChart data={series} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#071b38" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#071b38" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dashboardCollections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff8a1e" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#ff8a1e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(v) => moneyShort(Number(v))}
                />
                <Tooltip content={<PremiumTooltip />} />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#071b38"
                  strokeWidth={3}
                  fill="url(#dashboardRevenue)"
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="collections"
                  name="Collections"
                  stroke="#ff8a1e"
                  strokeWidth={3}
                  fill="url(#dashboardCollections)"
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="credits"
                  name="Credits"
                  stroke="#64748b"
                  strokeWidth={2.5}
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Revenue
                </div>
                <div className="mt-1 text-sm font-extrabold text-slate-950">
                  {money(revenueThisMonth)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Pipeline
                </div>
                <div className="mt-1 text-sm font-extrabold text-slate-950">
                  {money(quotationPipeline)}
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-200">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Payment Effected
                </div>
                <div className="mt-1 text-sm font-extrabold text-emerald-900">
                  {money(collections)}
                </div>
              </div>

              <div className="rounded-2xl bg-rose-50 px-3 py-3 ring-1 ring-rose-200">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
                  Dues
                </div>
                <div className="mt-1 text-sm font-extrabold text-rose-900">
                  {money(outstanding)}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-extrabold tracking-tight text-slate-950">
                    Payment Effected vs Dues
                  </div>
                  <div className="text-[11px] text-slate-500">Mar 2026 â†’ Feb 2027</div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                    Payment
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-rose-700">
                    <span className="inline-block size-2.5 rounded-full bg-rose-500" />
                    Dues
                  </span>
                </div>
              </div>

             <div className="min-w-0 h-[190px] sm:h-[210px]">
                <ResponsiveContainer width="100%" height={210}>  
                  <BarChart
                    data={series}
                    margin={{ top: 8, right: 6, left: -16, bottom: 0 }}
                    barCategoryGap={14}
                  >
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={62}
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                      tickFormatter={(v) => moneyShort(Number(v))}
                    />
                    <Tooltip content={<PremiumTooltip />} />
                    <Bar
                      dataKey="collections"
                      name="Payment Effected"
                      fill="#22c55e"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={18}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="dues"
                      name="Dues"
                      fill="#ef4444"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={18}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </ShellCard>

        <div className="grid gap-3">
          <ShellCard className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold tracking-tight text-slate-950">Invoice Status</div>
              <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                Live
              </div>
            </div>

            <div className="mt-3 min-w-0 h-[200px]">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Tooltip content={<PremiumTooltip />} />
                  <Pie
                    data={statusSlices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={76}
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
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: pieColors[i % pieColors.length] }}
                    />
                    {s.name}
                  </div>
                  <span className="text-sm font-extrabold text-slate-950">{s.value}</span>
                </div>
              ))}
            </div>
          </ShellCard>

          <ShellCard className="p-4 sm:p-5">
            <div className="text-sm font-extrabold tracking-tight text-slate-950">Quick Actions</div>

            <div className="mt-3 grid gap-2">
              <Button
                className="h-11 justify-between rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
                onClick={() => router.push("/sales/invoices/new")}
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="size-4" />
                  New Invoice
                </span>
                <ChevronRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                className="h-11 justify-between rounded-2xl"
                onClick={() => router.push("/payments/new")}
              >
                <span className="inline-flex items-center gap-2">
                  <Wallet className="size-4" />
                  Payment Effected
                </span>
                <ChevronRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                className="h-11 justify-between rounded-2xl"
                onClick={() => router.push("/payments")}
              >
                <span className="inline-flex items-center gap-2">
                  <CreditCard className="size-4" />
                  Payments Report
                </span>
                <ChevronRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                className="h-11 justify-between rounded-2xl"
                onClick={() => router.push("/reports/vat")}
              >
                <span className="inline-flex items-center gap-2">
                  <BadgePercent className="size-4" />
                  VAT Report
                </span>
                <ChevronRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                className="h-11 justify-between rounded-2xl"
                onClick={() => router.push("/reports/soa")}
              >
                <span className="inline-flex items-center gap-2">
                  <Clock className="size-4" />
                  Overdue List
                </span>
                <ChevronRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                className="h-11 justify-between rounded-2xl"
                onClick={() => router.push("/contacts")}
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="size-4" />
                  Customers
                </span>
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="mt-3 rounded-2xl bg-[#ff8a1e]/10 p-3 ring-1 ring-[#ff8a1e]/20">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c25708]">
                  Insight
                </div>
                <Sparkles className="size-4 text-[#c25708]" />
              </div>
              <div className="mt-1 text-sm font-semibold text-[#8a3f06]">
                {money(revenueThisMonth)} this month
              </div>
            </div>
          </ShellCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <ShellCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold tracking-tight text-slate-950">Receivables Aging</div>
            <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
              {money(totalAging)}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
           <div className="min-w-0 h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Tooltip content={<PremiumTooltip />} />
                  <Pie
                    data={aging}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={72}
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

            <div className="grid gap-2">
              {aging.map((b, i) => {
                const pct = totalAging ? (b.value / totalAging) * 100 : 0;
                return (
                  <div key={b.name} className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-800">{b.name} days</div>
                      <div className="text-sm font-extrabold text-slate-950">{money(b.value)}</div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${clamp(pct, 0, 100)}%`,
                          backgroundColor: pieColors[i % pieColors.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ShellCard>

        <ShellCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold tracking-tight text-slate-950">Business Snapshot</div>
            <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
              Live
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Customers</div>
              <div className="mt-1 text-lg font-extrabold text-slate-950">{customers.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Suppliers</div>
              <div className="mt-1 text-lg font-extrabold text-slate-950">{suppliers.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Quotations</div>
              <div className="mt-1 text-lg font-extrabold text-slate-950">{quotations.length}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Credit Notes</div>
              <div className="mt-1 text-lg font-extrabold text-slate-950">{creditNotes.length}</div>
            </div>
          </div>

         <div className="mt-3 min-w-0 h-[200px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series} margin={{ top: 10, right: 0, left: -18, bottom: 0 }} barCategoryGap={14}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(v) => moneyShort(Number(v))}
                />
                <Tooltip content={<PremiumTooltip />} />
                <Bar
                  dataKey="collections"
                  name="Collections"
                  fill="#071b38"
                  radius={[10, 10, 0, 0]}
                  isAnimationActive={false}
                  maxBarSize={20}
                />
                <Bar
                  dataKey="credits"
                  name="Credits"
                  fill="#ff8a1e"
                  radius={[10, 10, 0, 0]}
                  isAnimationActive={false}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ShellCard>
      </div>

      <ShellCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-extrabold tracking-tight text-slate-950">Top Due Customers</div>
          <div className="text-xs font-semibold text-slate-500">{lastSync || "-"}</div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
          <div className="hidden grid-cols-12 bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 md:grid">
            <div className="col-span-4">Customer</div>
            <div className="col-span-2 text-right">Total Due</div>
            <div className="col-span-2 text-right">30+</div>
            <div className="col-span-2 text-right">60+</div>
            <div className="col-span-2 text-right">90+</div>
          </div>

          <div className="divide-y divide-slate-200 bg-white">
            {dueRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                No outstanding balances
              </div>
            ) : (
              dueRows.map((r, i) => (
                <div key={`${r.customer}-${i}`}>
                  <div className="hidden grid-cols-12 px-3 py-3 text-sm md:grid">
                    <div className="col-span-4 min-w-0">
                      <div className="truncate font-semibold text-slate-900">{r.customer}</div>
                      <div className="mt-0.5 text-xs text-slate-500">Last: {r.lastInvoice}</div>
                    </div>
                    <div className="col-span-2 text-right font-bold text-slate-950">{money(r.totalDue)}</div>
                    <div className="col-span-2 text-right text-slate-700">{money(r.overdue30)}</div>
                    <div className="col-span-2 text-right text-slate-700">{money(r.overdue60)}</div>
                    <div className="col-span-2 text-right text-slate-700">{money(r.overdue90)}</div>
                  </div>

                  <div className="space-y-2 px-3 py-3 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{r.customer}</div>
                        <div className="text-xs text-slate-500">Last: {r.lastInvoice}</div>
                      </div>
                      <div className="text-right text-sm font-extrabold text-slate-950">{money(r.totalDue)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">30+</div>
                        <div className="mt-1 text-xs font-semibold text-slate-900">{money(r.overdue30)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">60+</div>
                        <div className="mt-1 text-xs font-semibold text-slate-900">{money(r.overdue60)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">90+</div>
                        <div className="mt-1 text-xs font-semibold text-slate-900">{money(r.overdue90)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Total Sales</div>
            <div className="mt-1 text-sm font-extrabold text-slate-950">
              {money(invoices.reduce((s, x) => s + n2(x.total_amount), 0))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Collections</div>
            <div className="mt-1 text-sm font-extrabold text-slate-950">{money(collections)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Credit Notes</div>
            <div className="mt-1 text-sm font-extrabold text-slate-950">{money(creditNoteValue)}</div>
          </div>
        </div>
      </ShellCard>
    </div>
  );
}


