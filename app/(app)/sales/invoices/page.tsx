"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CircleDollarSign,
  AlertTriangle,
  BadgeCheck,
  Clock3,
  MoreHorizontal,
  Wallet,
  Printer,
  MessageCircle,
  Download,
  Building2,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* =========================================
   Types
========================================= */

type InvoiceRow = {
  id: string;
  invoice_no: string;
  customer_id: number;
  customer_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: string;
  total_amount: number | null;
  balance_amount: number | null;
  paid_amount?: number | null;
  subtotal?: number | null;
  vat_amount?: number | null;
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
  kpi?: {
    totalInvoices: number;
    totalValue: number;
    totalOutstanding: number;
    overdueCount: number;
    byStatus: Record<string, number>;
  };
  error?: any;
  supabaseError?: any;
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

function safeId(id: any) {
  const s = String(id ?? "").trim();
  if (!s || s === "undefined" || s === "null") return "";
  return s;
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

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function statusTone(st?: string) {
  const s = String(st || "").toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (s === "ISSUED") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  if (s === "PARTIALLY_PAID") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  if (s === "VOID") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (s === "DRAFT") return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
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

const STATUS_OPTIONS = ["ALL", "DRAFT", "ISSUED", "PAID", "PARTIALLY_PAID", "VOID"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

export default function InvoicesPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const [rows, setRows] = React.useState<InvoiceRow[]>([]);
  const [meta, setMeta] = React.useState<InvoicesResponse["meta"] | null>(null);
  const [kpi, setKpi] = React.useState<InvoicesResponse["kpi"] | null>(null);

  const [q, setQ] = React.useState("");
  const qd = useDebounced(q, 350);

  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const [refreshTick, setRefreshTick] = React.useState(0);

  const hasMore = meta?.hasMore ?? rows.length === pageSize;
  const totalCount = meta?.total ?? rows.length;

  const statusCounts = kpi?.byStatus ?? {};
  const drafts = statusCounts["DRAFT"] ?? 0;
  const issued = statusCounts["ISSUED"] ?? 0;
  const paid = statusCounts["PAID"] ?? 0;
  const partial = statusCounts["PARTIALLY_PAID"] ?? 0;

  async function load(p = page) {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (qd.trim()) params.set("q", qd.trim());
      params.set("status", status);
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));

      const res = await safeGet<InvoicesResponse>(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error(res?.error?.message ?? res?.error ?? "Failed to load invoices");

      setRows(Array.isArray(res.data) ? res.data : []);
      setMeta(res.meta ?? null);
      setKpi(res.kpi ?? null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load invoices");
      setRows([]);
      setMeta(null);
      setKpi(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    setPage(1);
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qd, status]);

  React.useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshTick]);

  const totalValue = rows.reduce((s, r) => s + n2(r.total_amount), 0);
  const totalBalance = rows.reduce((s, r) => s + n2(r.balance_amount), 0);
  const totalPaid = rows.reduce((s, r) => s + (n2(r.total_amount) - n2(r.balance_amount)), 0);

  function exportCurrentCsv() {
    const head = [
      "Invoice No",
      "Customer",
      "Invoice Date",
      "Total",
      "Balance",
      "Status",
    ];

    const body = rows.map((r) => [
      r.invoice_no,
      r.customer_name || "—",
      fmtDate(r.invoice_date),
      n2(r.total_amount).toFixed(2),
      n2(r.balance_amount).toFixed(2),
      r.status || "—",
    ]);

    exportCsv("invoices-register.csv", head, body);
  }

  function addPayment(id: string, invoiceNo: string, balance: number) {
    router.push(
      `/sales/payments/new?invoiceId=${encodeURIComponent(id)}&invoiceNo=${encodeURIComponent(
        invoiceNo
      )}&amount=${encodeURIComponent(String(balance))}`
    );
  }

  function sendWhatsApp(id: string, invoiceNo: string, customerName: string | null) {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const printUrl = `${base}/sales/invoices/${encodeURIComponent(id)}/print`;

    const text = [
      `Dear ${customerName || "Customer"},`,
      ``,
      `Please find your invoice ${invoiceNo}.`,
      `You can view / print it here:`,
      `${printUrl}`,
      ``,
      `KS Contracting Ltd`,
    ].join("\n");

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>
                  <FileText className="size-3.5 text-slate-500" />
                  Sales Ledger
                </Chip>
                <Chip className="bg-[#ff7a18]/10 text-[#c25708] ring-[#ff7a18]/20">
                  <BadgeCheck className="size-3.5" />
                  Invoice Control
                </Chip>
                <Chip className="bg-slate-900 text-white ring-slate-900/20">
                  <Building2 className="size-3.5 text-white/85" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Invoice Register
              </h1>
              <div className="mt-1 text-sm text-slate-600">
                Ultra-premium enterprise invoice workspace with live figures, collections, payment actions,
                WhatsApp sharing, printing, and customer visibility.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-2xl h-11 bg-white/70 shadow-sm hover:bg-white"
                onClick={() => setRefreshTick((x) => x + 1)}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Button
                variant="outline"
                className="rounded-2xl h-11 bg-white/70 shadow-sm hover:bg-white"
                onClick={exportCurrentCsv}
                disabled={rows.length === 0}
              >
                <Download className="mr-2 size-4" />
                Export CSV
              </Button>

              <Link href="/sales/invoices/new">
                <Button className="rounded-2xl h-11 bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_16px_44px_rgba(7,27,56,0.18)]">
                  <Plus className="mr-2 size-4" />
                  New Invoice
                </Button>
              </Link>
            </div>
          </div>

          {/* Search + Status */}
          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search invoice no, customer name..."
                className="h-11 rounded-2xl pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip className="bg-white/70">
                <Filter className="size-3.5 text-slate-500" />
                Status
              </Chip>

              {STATUS_OPTIONS.map((s) => {
                const active = status === s;
                const count = s === "ALL" ? totalCount : statusCounts[String(s).toUpperCase()] ?? 0;

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "h-10 rounded-2xl px-4 text-sm font-semibold transition",
                      "ring-1 ring-slate-200 bg-white/70 hover:bg-white",
                      active && "ring-2 ring-[#ff7a18]/25 bg-white"
                    )}
                  >
                    {s === "ALL" ? "All" : s.replaceAll("_", " ")}
                    <span className="ml-2 text-xs font-extrabold text-slate-700">{count}</span>
                  </button>
                );
              })}
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
          icon={FileText}
          label="Invoice Count"
          value={String(kpi?.totalInvoices ?? (loading ? "…" : rows.length))}
          sub={`Draft ${drafts} • Issued ${issued} • Paid ${paid}`}
          tone="blue"
        />
        <KPICard
          icon={CircleDollarSign}
          label="Gross Value"
          value={money(kpi?.totalValue ?? totalValue)}
          sub="All invoices in current filter"
          tone="emerald"
        />
        <KPICard
          icon={Wallet}
          label="Collected"
          value={money(totalPaid)}
          sub={`Partial ${partial}`}
          tone="blue"
        />
        <KPICard
          icon={AlertTriangle}
          label="Outstanding"
          value={money(kpi?.totalOutstanding ?? totalBalance)}
          sub={`Overdue ${kpi?.overdueCount ?? 0}`}
          tone={n2(kpi?.totalOutstanding ?? totalBalance) > 0 ? "orange" : "emerald"}
        />
      </div>

      {/* Premium table */}
      <Card3D className="p-0">
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Premium Invoice Table</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Customer name visible, due date removed, payment and WhatsApp actions enabled.
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {loading ? "Loading…" : `${rows.length} shown • ${totalCount} total`}
          </div>
        </div>

        <div className="overflow-hidden rounded-b-3xl border-t border-slate-200">
          <div className="overflow-auto">
            <table className="w-full min-w-[1260px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th className="w-[200px]">Invoice</th>
                  <th className="w-[260px]">Customer</th>
                  <th className="w-[140px]">Invoice Date</th>
                  <th className="w-[150px] text-right">Total</th>
                  <th className="w-[150px] text-right">Paid</th>
                  <th className="w-[150px] text-right">Balance</th>
                  <th className="w-[140px]">Status</th>
                  <th className="w-[320px]">Quick Actions</th>
                  <th className="w-[64px] text-right"> </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-44 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4 text-right"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4 text-right"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4 text-right"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-4"><div className="h-6 w-24 rounded-full bg-slate-200" /></td>
                      <td className="px-5 py-4"><div className="h-9 w-64 rounded-2xl bg-slate-200" /></td>
                      <td className="px-5 py-4 text-right"><div className="ml-auto h-9 w-9 rounded-2xl bg-slate-200" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                      No invoices found.
                      <div className="mt-3">
                        <Link href="/sales/invoices/new">
                          <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]">
                            <Plus className="mr-2 size-4" />
                            Create your first invoice
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const id = safeId(r.id);
                    const total = n2(r.total_amount);
                    const bal = n2(r.balance_amount);
                    const paidAmt =
                      typeof r.paid_amount === "number" && Number.isFinite(r.paid_amount)
                        ? n2(r.paid_amount)
                        : Math.max(0, total - bal);

                    const href = id ? `/sales/invoices/${encodeURIComponent(id)}` : "";

                    return (
                      <tr
                        key={id || r.invoice_no}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!href) return;
                          router.push(href);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && href) router.push(href);
                        }}
                        className="group transition hover:bg-slate-50/70 cursor-pointer"
                      >
                        <td className="px-5 py-4">
                          {href ? (
                            <Link
                              href={href}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 font-extrabold text-slate-900 hover:underline"
                            >
                              {r.invoice_no}
                              <ArrowUpRight className="size-4 text-slate-400 group-hover:text-slate-600" />
                            </Link>
                          ) : (
                            <div className="font-extrabold text-slate-900">{r.invoice_no}</div>
                          )}
                          <div className="mt-1 text-xs text-slate-500">
                            {r.created_at ? `Created ${fmtDate(r.created_at)}` : "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{r.customer_name ?? "—"}</div>
                          <div className="mt-1 text-xs text-slate-500">Customer ID: {r.customer_id}</div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-2 text-slate-700">
                            <Calendar className="size-4 text-slate-400" />
                            {fmtDate(r.invoice_date)}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                          {money(total)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-emerald-700">
                          {money(paidAmt)}
                        </td>

                        <td className={cn(
                          "px-5 py-4 text-right font-extrabold",
                          bal > 0 ? "text-slate-900" : "text-emerald-700"
                        )}>
                          {money(bal)}
                        </td>

                        <td className="px-5 py-4">
                          <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", statusTone(r.status))}>
                            {String(r.status || "").replaceAll("_", " ") || "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            <Link href={href || "#"} aria-disabled={!href}>
                              <Button variant="outline" className="h-9 rounded-xl">
                                Open
                              </Button>
                            </Link>

                            <Button
                              variant="outline"
                              className="h-9 rounded-xl"
                              onClick={() => {
                                if (!id) return;
                                window.open(
                                  `/sales/invoices/${encodeURIComponent(id)}/print`,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }}
                              disabled={!id}
                            >
                              <Printer className="mr-2 size-4" />
                              Print
                            </Button>

                            <Button
                              className="h-9 rounded-xl bg-[#071b38] text-white hover:bg-[#06142b]"
                              onClick={() => {
                                if (!id) return;
                                addPayment(id, r.invoice_no, bal);
                              }}
                              disabled={!id}
                            >
                              <Wallet className="mr-2 size-4" />
                              Add Payment
                            </Button>

                            <Button
                              variant="outline"
                              className="h-9 rounded-xl"
                              onClick={() => {
                                if (!id) return;
                                sendWhatsApp(id, r.invoice_no, r.customer_name);
                              }}
                              disabled={!id}
                            >
                              <MessageCircle className="mr-2 size-4" />
                              WhatsApp
                            </Button>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="h-9 w-9 rounded-2xl p-0 bg-white/70 hover:bg-white">
                                <span className="sr-only">Actions</span>
                                <MoreHorizontal className="size-4 text-slate-600" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem asChild>
                                <Link href={href || "#"} aria-disabled={!href}>
                                  Open details
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={!id}
                                onClick={() => {
                                  if (!id) return;
                                  window.open(
                                    `/sales/invoices/${encodeURIComponent(id)}/print`,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }}
                              >
                                Print / Save PDF
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={!id}
                                onClick={() => {
                                  if (!id) return;
                                  addPayment(id, r.invoice_no, bal);
                                }}
                              >
                                Add payment
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                disabled={!id}
                                onClick={() => {
                                  if (!id) return;
                                  sendWhatsApp(id, r.invoice_no, r.customer_name);
                                }}
                              >
                                Send to WhatsApp
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem disabled>
                                Email send (next)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-600">
              Page <span className="font-semibold text-slate-900">{meta?.page ?? page}</span> •{" "}
              <span className="font-semibold text-slate-900">{rows.length}</span> rows
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-2xl"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
              >
                <ChevronLeft className="mr-2 size-4" />
                Prev
              </Button>

              <Button
                variant="outline"
                className="h-10 rounded-2xl"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || !hasMore}
              >
                Next
                <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card3D>
    </div>
  );
}