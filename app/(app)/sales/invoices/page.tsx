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
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "â€”";

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
      {String(value || "â€”").replaceAll("_", " ")}
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
        r.status || "â€”",
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

