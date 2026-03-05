// src/app/dashboard/DashboardClient.tsx
"use client";

import * as React from "react";
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
  expenses: number;
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

/* =========================
   Utils
========================= */

function money(n: number) {
  return `Rs ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtLastSync(d: Date) {
  // “Last Sync at 04 Mar 2026, 13:40 pm”
  const dd = d.toLocaleString(undefined, { day: "2-digit" });
  const mmm = d.toLocaleString(undefined, { month: "short" });
  const yyyy = d.toLocaleString(undefined, { year: "numeric" });
  const hhmm = d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  const ampm = d.toLocaleString(undefined, { hour: "numeric", hour12: true }).toLowerCase().includes("pm")
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
        seen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
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
        "transition-all duration-300 ease-out transform-gpu",
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
        className={cn("h-[178px] p-6", "flex flex-col justify-between")}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{kpi.label}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <TrendPill trend={kpi.trend} delta={kpi.delta} />
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", brandTone(kpi.accent))}>MUR</span>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[30px] font-extrabold tracking-tight text-slate-900 leading-none">{kpi.value}</div>
          </div>
          <div className="hidden sm:grid size-10 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <Sparkles className="size-4 text-slate-500" />
          </div>
        </div>

        <div className="mt-2 text-sm text-slate-600 line-clamp-2">{kpi.note || "\u00A0"}</div>
      </Card3D>
    </FadeInCard>
  );
}

/* =========================
   Tooltip (premium)
========================= */

function PremiumTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-slate-200 shadow-[0_18px_55px_rgba(2,6,23,0.18)] px-3 py-2">
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
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastSync, setLastSync] = React.useState<string>(fmtLastSync(new Date()));
  const [seed, setSeed] = React.useState(7);

  // IMPORTANT: Only company names you already used in screenshot set:
  const COMPANY_NAMES = React.useMemo(
    () => ["Abc Group Ltd", "MultiiMaint Ltd", "Dan & Shi Pest Control", "Heaven Academy"],
    []
  );

  const totals = React.useMemo(() => {
    const s = seed;
    return {
      revenueThisMonth: 4780 + s * 19,
      outstanding: 94074 + s * 53,
      expensesThisMonth: 7285 + s * 11,
      overdue: 890 + s * 7,
      newCustomers: 3,
      issued: 36 + (s % 5),
      paid: 29 + (s % 4),
      partial: 8 + (s % 3),
      overdueCount: 6 + (s % 4),
    };
  }, [seed]);

  const [kpis, setKpis] = React.useState<Kpi[]>([]);
  const [series, setSeries] = React.useState<SeriesPoint[]>([]);
  const [aging, setAging] = React.useState<AgingBucket[]>([]);
  const [statusSlices, setStatusSlices] = React.useState<StatusSlice[]>([]);
  const [dueRows, setDueRows] = React.useState<DueRow[]>([]);

  React.useEffect(() => {
    setKpis([
      {
        label: "Revenue (This Month)",
        value: money(totals.revenueThisMonth),
        note: "Month-to-date invoiced value.",
        accent: "navy",
        delta: `+${(2.4 + (seed % 4) * 0.7).toFixed(1)}%`,
        trend: "up",
      },
      {
        label: "Outstanding",
        value: money(totals.outstanding),
        note: "Open balances across issued & partial invoices.",
        accent: "orange",
        delta: `+${(1.3 + (seed % 3) * 0.6).toFixed(1)}%`,
        trend: "up",
      },
      {
        label: "Expenses (This Month)",
        value: money(totals.expensesThisMonth),
        note: "Operational spend recorded this month.",
        accent: "muted",
        delta: `-${(0.8 + (seed % 3) * 0.4).toFixed(1)}%`,
        trend: "down",
      },
      {
        label: "Overdue",
        value: money(totals.overdue),
        note: "Invoices past due date.",
        accent: "orange",
        delta: `+${(0.6 + (seed % 4) * 0.3).toFixed(1)}%`,
        trend: "up",
      },
    
    ]);

    const drift = (m: number) => Math.round((seed * m) / 3);
    setSeries([
      { name: "Jun", sales: 2100 + drift(8), expenses: 1180 + drift(4), invoices: 12 + (seed % 3), cash: 920 + drift(3) },
      { name: "Jul", sales: 2900 + drift(10), expenses: 1620 + drift(5), invoices: 18 + (seed % 4), cash: 1450 + drift(4) },
      { name: "Aug", sales: 1600 + drift(6), expenses: 1120 + drift(3), invoices: 10 + (seed % 3), cash: 720 + drift(2) },
      { name: "Sep", sales: 720 + drift(3), expenses: 960 + drift(3), invoices: 7 + (seed % 2), cash: 360 + drift(1) },
      { name: "Oct", sales: 3200 + drift(11), expenses: 1750 + drift(6), invoices: 21 + (seed % 5), cash: 1680 + drift(5) },
      { name: "Nov", sales: 1300 + drift(5), expenses: 930 + drift(2), invoices: 9 + (seed % 3), cash: 560 + drift(2) },
    ]);

    setAging([
      { name: "0–15 days", value: 22025 + seed * 35 },
      { name: "16–30 days", value: 15185 + seed * 28 },
      { name: "31–60 days", value: 9466 + seed * 20 },
      { name: "61–90 days", value: 5408 + seed * 14 },
      { name: "90+ days", value: 3226 + seed * 9 },
    ]);

    setStatusSlices([
      { name: "Paid", value: totals.paid },
      { name: "Issued", value: totals.issued },
      { name: "Partial", value: totals.partial },
      { name: "Overdue", value: totals.overdueCount },
    ]);

    setDueRows([
      { customer: COMPANY_NAMES[0], totalDue: 22597 + seed * 7, overdue30: 7263 + seed * 4, overdue60: 2128 + seed * 2, overdue90: 914 + seed, lastInvoice: "INV-2409" },
      { customer: COMPANY_NAMES[1], totalDue: 13946 + seed * 6, overdue30: 4249 + seed * 3, overdue60: 1621 + seed, overdue90: 0, lastInvoice: "INV-2411" },
      { customer: COMPANY_NAMES[2], totalDue: 9011 + seed * 5, overdue30: 1835 + seed * 2, overdue60: 0, overdue90: 0, lastInvoice: "INV-2410" },
      { customer: COMPANY_NAMES[3], totalDue: 7497 + seed * 4, overdue30: 2228 + seed * 2, overdue60: 914 + seed, overdue90: 0, lastInvoice: "INV-2408" },
    ]);
  }, [seed, totals, COMPANY_NAMES]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      await new Promise((r) => setTimeout(r, 380));
      setSeed((s) => (s + 3) % 97);
      setLastSync(fmtLastSync(new Date()));
    } catch (e: any) {
      setError(e?.message || "Failed to refresh");
    } finally {
      setLoading(false);
    }
  }

  const totalAging = aging.reduce((a, b) => a + b.value, 0);
  const pieColors = ["#071b38", "#ff7a18", "#64748b", "#0ea5e9", "#22c55e"];

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

      {/* ✅ NO BLANK SPACES: use tight gaps everywhere */}
      <div className="space-y-3">
        {/* Header row (NO big blue band) */}
        <FadeInCard>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[22px] sm:text-[26px] font-extrabold tracking-tight text-slate-900">Dashboard</div>
              <div className="mt-0.5 text-sm text-slate-600">Overview for invoices, cash flow, and performance.</div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="inline-flex items-center justify-end gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 shadow-sm">
                  {lastSync}
                </span>
                <Button
                  onClick={refresh}
                  className="rounded-2xl bg-[#ff7a18] text-white hover:bg-[#ff6a00] shadow-[0_18px_44px_rgba(255,122,24,0.22)]"
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 items-stretch">
          {kpis.map((k, i) => (
            <div key={k.label} className="h-full">
              <KpiTile kpi={k} delayMs={i * 55} />
            </div>
          ))}
        </div>

        {/* Charts row (tight) */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3 items-stretch">
          {/* Left: main chart */}
          <FadeInCard delayMs={60} className="xl:col-span-2 h-full">
            <Card3D glow="navy" className="p-5 h-full">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Revenue & Expenses (Last 6 months)</div>
                  <div className="mt-1 text-sm text-slate-600">Trend + cash overlay — dynamic enterprise insights.</div>
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
                      name="Expenses"
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
                  <div className="text-xs font-semibold text-slate-600">Avg. Expenses</div>
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

          {/* Right: stacked widgets (tight) */}
          <div className="grid gap-3 h-full">
            <FadeInCard delayMs={90} className="h-full">
              <Card3D glow="orange" className="p-5">
                <div className="text-sm font-semibold text-slate-900">Invoice Status</div>
                <div className="mt-1 text-sm text-slate-600">Operational breakdown (count).</div>

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
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{totals.overdueCount}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold text-slate-600">Partial (count)</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{totals.partial}</div>
                  </div>
                </div>
              </Card3D>
            </FadeInCard>

            <FadeInCard delayMs={120} className="h-full">
              <Card3D glow="neutral" className="p-5">
                <div className="text-sm font-semibold text-slate-900">Invoices & Cash</div>
                <div className="mt-1 text-sm text-slate-600">Monthly volume vs cash received.</div>

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
                  Enterprise tip: Monitor collections vs invoice issuance.
                </div>
              </Card3D>
            </FadeInCard>
          </div>
        </div>

        {/* Bottom row: Aging + Quick Actions (tight) */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3 items-stretch">
          <FadeInCard delayMs={140} className="xl:col-span-2 h-full">
            <Card3D glow="navy" className="p-5 h-full">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Receivables Aging</div>
                  <div className="mt-1 text-sm text-slate-600">Outstanding amounts by aging bucket.</div>
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
            <Card3D glow="orange" className="p-5 h-full">
              <div className="text-sm font-semibold text-slate-900">Quick Actions</div>
              <div className="mt-1 text-sm text-slate-600">One-click enterprise shortcuts.</div>

              <div className="mt-3 grid gap-2">
                <Button className="w-full rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_14px_40px_rgba(7,27,56,0.18)]">
                  <FileText className="mr-2 size-4" />
                  New Invoice
                </Button>
                <Button variant="outline" className="w-full rounded-2xl">
                  <Users className="mr-2 size-4" />
                  New Customer
                </Button>
                <Button variant="outline" className="w-full rounded-2xl">
                  <BadgePercent className="mr-2 size-4" />
                  VAT Report
                </Button>
                <Button variant="outline" className="w-full rounded-2xl">
                  <CreditCard className="mr-2 size-4" />
                  Record Payment
                </Button>
                <Button variant="outline" className="w-full rounded-2xl">
                  <Clock className="mr-2 size-4" />
                  Overdue List
                </Button>
              </div>

              <div className="mt-3 rounded-2xl bg-[#ff7a18]/10 p-3 ring-1 ring-[#ff7a18]/20">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#c25708]">Action Hint</div>
                  <Sparkles className="size-4 text-[#c25708]" />
                </div>
                <div className="mt-1 text-xs text-[#8a3f06]">
                  Review <span className="font-semibold">90+ days</span> weekly to keep collections tight.
                </div>
              </div>
            </Card3D>
          </FadeInCard>
        </div>

        {/* Due table (tight) */}
        <FadeInCard delayMs={200}>
          <Card3D glow="neutral" className="p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Invoice Due Details (by Customer)</div>
                <div className="mt-1 text-sm text-slate-600">Overdue segmentation — 30/60/90+ days.</div>
              </div>
              <div className="text-xs text-slate-500">Live demo data</div>
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
                {dueRows.map((r, i) => (
                  <div
                    key={r.customer}
                    className={cn("grid grid-cols-12 px-4 py-3 text-sm transition-colors hover:bg-slate-50")}
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
                ))}
              </div>
            </div>
          </Card3D>
        </FadeInCard>
      </div>
    </>
  );
}