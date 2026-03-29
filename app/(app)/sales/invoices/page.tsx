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
  Wallet,
  Printer,
  MessageCircle,
  Download,
  Building2,
  CheckCircle2,
  Ban,
  Eye,
  Loader2,
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

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(v: any) {
  const n = n2(v);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [yyyy, mm, dd] = v.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

async function safeMutation(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  const raw = await res.text();
  let parsed: any = null;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!res.ok) {
    throw new Error(
      parsed?.error?.message ?? parsed?.error ?? parsed?.message ?? `HTTP ${res.status}`
    );
  }

  return parsed;
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
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        "bg-white/90 text-slate-700 ring-1 ring-white/70 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white",
        "shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {children}
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
    orange: "bg-orange-50 ring-orange-200 text-orange-700",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-700",
    rose: "bg-rose-50 ring-rose-200 text-rose-700",
  };

  return (
    <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_14px_35px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">
            {label}
          </div>
          <div className="mt-2 text-[22px] font-extrabold leading-none tracking-tight text-slate-950 sm:text-[26px]">
            {value}
          </div>
          {sub ? <div className="mt-2 text-xs text-slate-600">{sub}</div> : null}
        </div>

        <div className={cn("grid size-11 place-items-center rounded-2xl ring-1 sm:size-12", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ value }: { value?: string | null }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:px-3 sm:text-[11px]",
        statusTone(value || "")
      )}
    >
      {String(value || "—").replaceAll("_", " ")}
    </span>
  );
}

function DotsActionButton({ busy }: { busy?: boolean }) {
  return (
    <Button
      variant="outline"
      className={cn(
        "h-10 w-10 rounded-2xl border-orange-200 bg-orange-50 p-0 shadow-sm transition-all",
        "hover:border-orange-300 hover:bg-orange-100 hover:shadow-[0_10px_24px_rgba(249,115,22,0.18)]",
        "focus-visible:ring-2 focus-visible:ring-orange-300"
      )}
      disabled={busy}
    >
      <span className="sr-only">Actions</span>
      {busy ? (
        <Loader2 className="size-4 animate-spin text-orange-600" />
      ) : (
        <div className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_infinite]" />
          <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_0.15s_infinite]" />
          <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_0.3s_infinite]" />
        </div>
      )}
    </Button>
  );
}

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
  const [busyActionId, setBusyActionId] = React.useState<string>("");

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
      "Total (MUR)",
      "Paid (MUR)",
      "Balance (MUR)",
      "Status",
    ];

    const body = rows.map((r) => {
      const total = n2(r.total_amount);
      const bal = n2(r.balance_amount);
      const paidAmt =
        typeof r.paid_amount === "number" && Number.isFinite(r.paid_amount)
          ? n2(r.paid_amount)
          : Math.max(0, total - bal);

      return [
        r.invoice_no,
        r.customer_name || `Customer #${r.customer_id}`,
        fmtDate(r.invoice_date),
        total.toFixed(2),
        paidAmt.toFixed(2),
        bal.toFixed(2),
        r.status || "—",
      ];
    });

    exportCsv("ks-contracting-invoices-register.csv", head, body);
  }

  function addPayment(id: string, invoiceNo: string, balance: number) {
    router.push(
      `/sales/payments/new?invoiceId=${encodeURIComponent(id)}&invoiceNo=${encodeURIComponent(
        invoiceNo
      )}&amount=${encodeURIComponent(String(balance))}`
    );
  }

  async function sendWhatsApp(id: string, invoiceNo: string, customerName: string | null) {
    try {
      const shareRes = await fetch(`/api/invoices/${encodeURIComponent(id)}/share-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const shareJson = await shareRes.json();

      if (!shareRes.ok || !shareJson?.ok || !shareJson?.data?.share_url) {
        throw new Error(
          shareJson?.supabaseError?.message ||
            shareJson?.details ||
            shareJson?.error ||
            "Failed to create public invoice link"
        );
      }

      const publicUrl = String(shareJson.data.share_url);
      const pdfUrl = publicUrl.replace("/public-invoice/", "/api/public/invoice-pdf/");

      const text = [
        `Dear ${customerName || "Customer"},`,
        ``,
        `Please find your invoice ${invoiceNo}.`,
        `View invoice:`,
        publicUrl,
        ``,
        `Download PDF:`,
        pdfUrl,
        ``,
        `KS Contracting Ltd`,
      ].join("\n");

      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      window.alert(e?.message || "Failed to create public invoice link");
    }
  }

  async function markInvoicePaid(id: string) {
    const ok = window.confirm("Mark this invoice as PAID?");
    if (!ok) return;

    try {
      setBusyActionId(id);
      await safeMutation(`/api/invoices/${encodeURIComponent(id)}/mark-paid`);
      setRefreshTick((x) => x + 1);
    } catch (e: any) {
      window.alert(e?.message || "Failed to mark invoice as paid");
    } finally {
      setBusyActionId("");
    }
  }

  async function voidInvoice(id: string, invoiceNo: string) {
    const ok = window.confirm(`Void invoice ${invoiceNo}?`);
    if (!ok) return;

    try {
      setBusyActionId(id);
      await safeMutation(`/api/invoices/${encodeURIComponent(id)}/void`);
      setRefreshTick((x) => x + 1);
    } catch (e: any) {
      window.alert(e?.message || "Failed to void invoice");
    } finally {
      setBusyActionId("");
    }
  }

  function actionMenu(
    id: string,
    href: string,
    invoiceNo: string,
    balance: number,
    customerName: string | null,
    statusValue: string,
    isBusy: boolean
  ) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div>
            <DotsActionButton busy={isBusy} />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-64 rounded-2xl border-slate-200 p-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
        >
          <DropdownMenuItem
            className="rounded-xl"
            onClick={() => href && router.push(href)}
            disabled={!href}
          >
            <Eye className="mr-2 size-4" />
            Open details
          </DropdownMenuItem>

          <DropdownMenuItem
            className="rounded-xl"
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
            <Printer className="mr-2 size-4" />
            Print / Save PDF
          </DropdownMenuItem>

          <DropdownMenuItem
            className="rounded-xl"
            disabled={!id}
            onClick={() => {
              if (!id) return;
              addPayment(id, invoiceNo, balance);
            }}
          >
            <Wallet className="mr-2 size-4" />
            Add payment
          </DropdownMenuItem>

          <DropdownMenuItem
            className="rounded-xl"
            disabled={!id}
            onClick={() => {
              if (!id) return;
              void sendWhatsApp(id, invoiceNo, customerName);
            }}
          >
            <MessageCircle className="mr-2 size-4" />
            Send to WhatsApp
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="rounded-xl text-emerald-700 focus:text-emerald-700"
            disabled={!id || String(statusValue).toUpperCase() === "PAID"}
            onClick={() => {
              if (!id) return;
              void markInvoicePaid(id);
            }}
          >
            <CheckCircle2 className="mr-2 size-4" />
            Mark as paid
          </DropdownMenuItem>

          <DropdownMenuItem
            className="rounded-xl text-rose-700 focus:text-rose-700"
            disabled={!id || String(statusValue).toUpperCase() === "VOID"}
            onClick={() => {
              if (!id) return;
              void voidInvoice(id, invoiceNo);
            }}
          >
            <Ban className="mr-2 size-4" />
            Void invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-5">
      <Surface className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(700px_300px_at_110%_0%,rgba(255,153,51,0.20),transparent_50%)]" />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 xl:px-7 xl:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip className="bg-white/12 text-white ring-white/15">
                  <FileText className="size-3.5 text-white/85" />
                  Sales Ledger
                </Chip>

                <Chip className="bg-[#ff8a1e]/18 text-[#ffd6ad] ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  Invoice Control
                </Chip>

                <Chip className="bg-white text-[#071b38] ring-white/80">
                  <Building2 className="size-3.5 text-[#071b38]" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                Invoice Register
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-50/90 sm:text-[15px]">
                Premium enterprise invoice workspace for KS Contracting with clean financial visibility,
                MUR currency formatting, refined customer presentation, payment workflows, WhatsApp sharing,
                print access, and luxury SaaS-grade usability.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                onClick={() => setRefreshTick((x) => x + 1)}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                onClick={exportCurrentCsv}
                disabled={rows.length === 0}
              >
                <Download className="mr-2 size-4" />
                Export CSV
              </Button>

              <Link href="/sales/invoices/new">
                <Button className="h-11 rounded-2xl bg-[#ff8a1e] px-5 font-semibold text-white shadow-[0_14px_35px_rgba(255,138,30,0.30)] hover:bg-[#f07c0f]">
                  <Plus className="mr-2 size-4" />
                  New Invoice
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search invoice number or customer name..."
                className="h-12 rounded-2xl border-white/15 bg-white text-slate-900 pl-10 shadow-sm placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip className="bg-white text-slate-700 ring-white/70">
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
                      "h-10 rounded-2xl px-4 text-sm font-semibold transition-all",
                      "border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/16",
                      active && "border-[#ffb266] bg-white text-[#071b38] shadow-sm"
                    )}
                  >
                    {s === "ALL" ? "All" : s.replaceAll("_", " ")}
                    <span
                      className={cn(
                        "ml-2 text-xs font-extrabold",
                        active ? "text-[#ff8a1e]" : "text-white/90"
                      )}
                    >
                      {count}
                    </span>
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
      </Surface>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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

      <Surface>
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight text-slate-950">
                Premium Invoice Register
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Compact luxury register layout with always-visible action menu and no bottom horizontal scroll.
              </div>
            </div>

            <div className="text-xs font-medium text-slate-500">
              {loading ? "Loading…" : `${rows.length} shown • ${totalCount} total`}
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="px-4 py-3 sm:px-5">
            <div
              className={cn(
                "grid items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3",
                "grid-cols-[minmax(130px,1.1fr)_minmax(180px,1.5fr)_110px_120px_120px_120px_110px_56px]"
              )}
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Invoice</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Customer</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Date</div>
              <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Total</div>
              <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Paid</div>
              <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Balance</div>
              <div className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Status</div>
              <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">⋯</div>
            </div>
          </div>

          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "grid items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 animate-pulse",
                      "grid-cols-[minmax(130px,1.1fr)_minmax(180px,1.5fr)_110px_120px_120px_120px_110px_56px]"
                    )}
                  >
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="h-4 w-36 rounded bg-slate-200" />
                    <div className="h-4 w-20 rounded bg-slate-200" />
                    <div className="ml-auto h-4 w-20 rounded bg-slate-200" />
                    <div className="ml-auto h-4 w-20 rounded bg-slate-200" />
                    <div className="ml-auto h-4 w-20 rounded bg-slate-200" />
                    <div className="mx-auto h-6 w-20 rounded-full bg-slate-200" />
                    <div className="ml-auto h-10 w-10 rounded-2xl bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-sm text-slate-500">No invoices found.</div>
                <div className="mt-4">
                  <Link href="/sales/invoices/new">
                    <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#0a2750]">
                      <Plus className="mr-2 size-4" />
                      Create your first invoice
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => {
                  const id = safeId(r.id);
                  const total = n2(r.total_amount);
                  const bal = n2(r.balance_amount);
                  const paidAmt =
                    typeof r.paid_amount === "number" && Number.isFinite(r.paid_amount)
                      ? n2(r.paid_amount)
                      : Math.max(0, total - bal);
                  const href = id ? `/sales/invoices/${encodeURIComponent(id)}` : "";
                  const isBusy = busyActionId === id;

                  return (
                    <div
                      key={id || r.invoice_no}
                      className={cn(
                        "grid items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-all",
                        "hover:border-slate-300 hover:shadow-[0_14px_35px_rgba(15,23,42,0.06)]",
                        "grid-cols-[minmax(130px,1.1fr)_minmax(180px,1.5fr)_110px_120px_120px_120px_110px_56px]"
                      )}
                    >
                      <div className="min-w-0">
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex max-w-full items-center gap-2 truncate font-extrabold tracking-tight text-slate-950 hover:text-[#071b38]"
                          >
                            <span className="truncate">{r.invoice_no}</span>
                            <ArrowUpRight className="size-4 shrink-0 text-slate-400" />
                          </Link>
                        ) : (
                          <div className="truncate font-extrabold tracking-tight text-slate-950">
                            {r.invoice_no}
                          </div>
                        )}

                        <div className="mt-1 truncate text-xs text-slate-500">
                          Created {fmtDate(r.created_at)}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">
                          {r.customer_name?.trim() || `Customer #${r.customer_id}`}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          Customer ID: {r.customer_id}
                        </div>
                      </div>

                      <div className="text-sm font-medium text-slate-700">
                        {fmtDate(r.invoice_date)}
                      </div>

                      <div className="text-right font-extrabold text-slate-950 tabular-nums">
                        {money(total)}
                      </div>

                      <div className="text-right font-bold text-emerald-700 tabular-nums">
                        {money(paidAmt)}
                      </div>

                      <div
                        className={cn(
                          "text-right font-extrabold tabular-nums",
                          bal > 0 ? "text-slate-950" : "text-emerald-700"
                        )}
                      >
                        {money(bal)}
                      </div>

                      <div className="flex justify-center">
                        <StatusPill value={r.status} />
                      </div>

                      <div className="flex justify-end">
                        {actionMenu(
                          id,
                          href,
                          r.invoice_no,
                          bal,
                          r.customer_name,
                          r.status,
                          isBusy
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-3xl border border-slate-200 p-4">
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-44 rounded bg-slate-200" />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="h-16 rounded-2xl bg-slate-100" />
                    <div className="h-16 rounded-2xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-14 text-center sm:px-5">
              <div className="text-sm text-slate-500">No invoices found.</div>
              <div className="mt-4">
                <Link href="/sales/invoices/new">
                  <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#0a2750]">
                    <Plus className="mr-2 size-4" />
                    Create your first invoice
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 sm:p-5">
              {rows.map((r) => {
                const id = safeId(r.id);
                const total = n2(r.total_amount);
                const bal = n2(r.balance_amount);
                const paidAmt =
                  typeof r.paid_amount === "number" && Number.isFinite(r.paid_amount)
                    ? n2(r.paid_amount)
                    : Math.max(0, total - bal);
                const href = id ? `/sales/invoices/${encodeURIComponent(id)}` : "";
                const isBusy = busyActionId === id;

                return (
                  <div
                    key={id || r.invoice_no}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex max-w-full items-center gap-2 font-extrabold tracking-tight text-slate-950"
                          >
                            <span className="truncate">{r.invoice_no}</span>
                            <ArrowUpRight className="size-4 shrink-0 text-slate-400" />
                          </Link>
                        ) : (
                          <div className="font-extrabold tracking-tight text-slate-950">
                            {r.invoice_no}
                          </div>
                        )}

                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {r.customer_name?.trim() || `Customer #${r.customer_id}`}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Date: {fmtDate(r.invoice_date)}
                        </div>

                        <div className="mt-2">
                          <StatusPill value={r.status} />
                        </div>
                      </div>

                      <div className="shrink-0">
                        {actionMenu(
                          id,
                          href,
                          r.invoice_no,
                          bal,
                          r.customer_name,
                          r.status,
                          isBusy
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Total
                        </div>
                        <div className="mt-1 text-base font-extrabold text-slate-950 tabular-nums">
                          {money(total)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-emerald-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700/80">
                          Paid
                        </div>
                        <div className="mt-1 text-base font-extrabold text-emerald-700 tabular-nums">
                          {money(paidAmt)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-orange-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700/80">
                          Balance
                        </div>
                        <div
                          className={cn(
                            "mt-1 text-base font-extrabold tabular-nums",
                            bal > 0 ? "text-orange-700" : "text-emerald-700"
                          )}
                        >
                          {money(bal)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Created {fmtDate(r.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="text-xs text-slate-600">
            Page <span className="font-semibold text-slate-950">{meta?.page ?? page}</span> •{" "}
            <span className="font-semibold text-slate-950">{rows.length}</span> rows
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
      </Surface>
    </div>
  );
}