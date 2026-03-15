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
  MoreHorizontal,
  Download,
  Printer,
  MessageCircle,
  CheckCircle2,
  Clock3,
  Building2,
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

type CreditNoteRow = {
  id: string;
  credit_no?: string;
  credit_note_number?: string;
  customer_id?: number | null;
  customer_name?: string | null;
  credit_date?: string | null;
  credit_note_date?: string | null;
  site_address?: string | null;
  subtotal?: number | null;
  vat?: number | null;
  total_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  issued_at?: string | null;
  invoice_id?: number | string | null;
  reason?: string | null;
  notes?: string | null;
};

type CreditNotesResponse = {
  ok: boolean;
  data: CreditNoteRow[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
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

function getCreditNo(r: CreditNoteRow) {
  return r.credit_no || r.credit_note_number || "—";
}

function getCreditDate(r: CreditNoteRow) {
  return r.credit_date || r.credit_note_date || null;
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

function statusTone(st?: string | null) {
  const s = String(st || "").toUpperCase();
  if (s === "APPLIED") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (s === "ISSUED") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
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
    <div className="rounded-[26px] border border-slate-200/90 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_14px_35px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-[26px] font-extrabold leading-none tracking-tight text-slate-950">
            {value}
          </div>
          {sub ? <div className="mt-2 text-xs text-slate-600">{sub}</div> : null}
        </div>

        <div className={cn("grid size-12 place-items-center rounded-2xl ring-1", tones[tone])}>
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
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
        statusTone(value || "")
      )}
    >
      {String(value || "—").replaceAll("_", " ")}
    </span>
  );
}

/* =========================================
   Page
========================================= */

const STATUS_OPTIONS = ["ALL", "DRAFT", "ISSUED", "APPLIED", "VOID"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

export default function CreditNotesPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const [rows, setRows] = React.useState<CreditNoteRow[]>([]);
  const [meta, setMeta] = React.useState<CreditNotesResponse["meta"] | null>(null);

  const [q, setQ] = React.useState("");
  const qd = useDebounced(q, 350);

  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const [refreshTick, setRefreshTick] = React.useState(0);
  const [busyActionId, setBusyActionId] = React.useState<string>("");

  async function load(p = page) {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (qd.trim()) params.set("q", qd.trim());
      params.set("status", status);
      params.set("page", String(p));
      params.set("pageSize", String(pageSize));

      const res = await safeGet<CreditNotesResponse>(`/api/credit-notes?${params.toString()}`);
      if (!res.ok) throw new Error(res?.error?.message ?? res?.error ?? "Failed to load credit notes");

      setRows(Array.isArray(res.data) ? res.data : []);
      setMeta(res.meta ?? null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load credit notes");
      setRows([]);
      setMeta(null);
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

  const hasMore = meta?.hasMore ?? rows.length === pageSize;
  const totalCount = meta?.total ?? rows.length;

  const filteredStats = React.useMemo(() => {
    const totalValue = rows.reduce((s, r) => s + n2(r.total_amount), 0);
    const subtotalValue = rows.reduce((s, r) => s + n2(r.subtotal), 0);
    const vatValue = rows.reduce((s, r) => s + n2(r.vat), 0);

    const drafts = rows.filter((r) => String(r.status).toUpperCase() === "DRAFT").length;
    const issued = rows.filter((r) => String(r.status).toUpperCase() === "ISSUED").length;
    const applied = rows.filter((r) => String(r.status).toUpperCase() === "APPLIED").length;
    const voided = rows.filter((r) => String(r.status).toUpperCase() === "VOID").length;

    return {
      totalValue,
      subtotalValue,
      vatValue,
      drafts,
      issued,
      applied,
      voided,
    };
  }, [rows]);

  function exportCurrentCsv() {
    const head = [
      "Credit Note No",
      "Customer",
      "Date",
      "Subtotal (MUR)",
      "VAT (MUR)",
      "Total (MUR)",
      "Status",
      "Reason",
    ];

    const body = rows.map((r) => [
      getCreditNo(r),
      r.customer_name || `Customer #${r.customer_id ?? "—"}`,
      fmtDate(getCreditDate(r)),
      n2(r.subtotal).toFixed(2),
      n2(r.vat).toFixed(2),
      n2(r.total_amount).toFixed(2),
      r.status || "—",
      r.reason || "",
    ]);

    exportCsv("ks-contracting-credit-notes-register.csv", head, body);
  }

  function sendWhatsApp(id: string, creditNo: string, customerName: string | null) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const printUrl = `${base}/sales/credit-notes/${encodeURIComponent(id)}/print`;

    const text = [
      `Dear ${customerName || "Customer"},`,
      ``,
      `Please find your credit note ${creditNo}.`,
      `You can view / print it here:`,
      `${printUrl}`,
      ``,
      `KS Contracting Ltd`,
    ].join("\n");

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Surface className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(700px_300px_at_110%_0%,rgba(255,153,51,0.20),transparent_50%)]" />

        <div className="relative px-4 py-5 sm:px-6 sm:py-6 xl:px-7 xl:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip className="bg-white/12 text-white ring-white/15">
                  <FileText className="size-3.5 text-white/85" />
                  Sales
                </Chip>

                <Chip className="bg-[#ff8a1e]/18 text-[#ffd6ad] ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  Credit Note Control
                </Chip>

                <Chip className="bg-white text-[#071b38] ring-white/80">
                  <Building2 className="size-3.5 text-[#071b38]" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                Credit Notes Register
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-50/90 sm:text-[15px]">
                Premium enterprise credit note workspace for KS Contracting with live customer visibility,
                printable documents, linked invoice access, WhatsApp sharing, and refined financial control.
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

              <Link href="/sales/credit-notes/new">
                <Button className="h-11 rounded-2xl bg-[#ff8a1e] px-5 font-semibold text-white shadow-[0_14px_35px_rgba(255,138,30,0.30)] hover:bg-[#f07c0f]">
                  <Plus className="mr-2 size-4" />
                  New Credit Note
                </Button>
              </Link>
            </div>
          </div>

          {/* Search + filters */}
          <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search credit note number or customer name..."
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
                const count =
                  s === "ALL"
                    ? totalCount
                    : rows.filter((r) => String(r.status).toUpperCase() === s).length;

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

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <KPICard
          icon={FileText}
          label="Credit Note Count"
          value={String(totalCount)}
          sub={`Draft ${filteredStats.drafts} • Issued ${filteredStats.issued}`}
          tone="blue"
        />
        <KPICard
          icon={CircleDollarSign}
          label="Gross Credit Value"
          value={money(filteredStats.totalValue)}
          sub="All credit notes in current filter"
          tone="emerald"
        />
        <KPICard
          icon={Clock3}
          label="Applied"
          value={String(filteredStats.applied)}
          sub="Applied against balances"
          tone="orange"
        />
        <KPICard
          icon={AlertTriangle}
          label="Voided"
          value={String(filteredStats.voided)}
          sub="Cancelled credit notes"
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPICard
          icon={CheckCircle2}
          label="Subtotal"
          value={money(filteredStats.subtotalValue)}
          sub="Before VAT"
          tone="blue"
        />
        <KPICard
          icon={BadgeCheck}
          label="VAT"
          value={money(filteredStats.vatValue)}
          sub="Tax component"
          tone="orange"
        />
        <KPICard
          icon={CircleDollarSign}
          label="Average Credit Note"
          value={money(rows.length ? filteredStats.totalValue / rows.length : 0)}
          sub="Average document value"
          tone="emerald"
        />
      </div>

      {/* Register */}
      <Surface>
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="text-base font-bold tracking-tight text-slate-950">
                Premium Credit Note Register
              </div>
              <div className="mt-1 text-sm text-slate-600">
                All actions are grouped under the orange 3-dot menu for a cleaner executive layout.
              </div>
            </div>

            <div className="text-xs font-medium text-slate-500">
              {loading ? "Loading…" : `${rows.length} shown • ${totalCount} total`}
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden xl:block">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50/90">
                <tr className="border-b border-slate-200 text-left text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  <th className="w-[170px] px-5 py-4">Credit Note</th>
                  <th className="w-[240px] px-5 py-4">Customer</th>
                  <th className="w-[130px] px-5 py-4">Date</th>
                  <th className="w-[140px] px-5 py-4 text-right">Subtotal</th>
                  <th className="w-[120px] px-5 py-4 text-right">VAT</th>
                  <th className="w-[150px] px-5 py-4 text-right">Total</th>
                  <th className="w-[150px] px-5 py-4">Linked Invoice</th>
                  <th className="w-[140px] px-5 py-4 text-center">Status</th>
                  <th className="w-[84px] px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-5"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-5"><div className="h-4 w-40 rounded bg-slate-200" /></td>
                      <td className="px-5 py-5"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-5"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-5"><div className="ml-auto h-4 w-20 rounded bg-slate-200" /></td>
                      <td className="px-5 py-5"><div className="ml-auto h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-5"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-5 py-5"><div className="mx-auto h-6 w-24 rounded-full bg-slate-200" /></td>
                      <td className="px-5 py-5"><div className="ml-auto h-10 w-10 rounded-2xl bg-slate-200" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <div className="text-sm text-slate-500">No credit notes found.</div>
                      <div className="mt-4">
                        <Link href="/sales/credit-notes/new">
                          <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#0a2750]">
                            <Plus className="mr-2 size-4" />
                            Create your first credit note
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const id = safeId(r.id);
                    const href = id ? `/sales/credit-notes/${encodeURIComponent(id)}` : "";
                    const isBusy = busyActionId === id;

                    return (
                      <tr
                        key={id || getCreditNo(r)}
                        className="group transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-5 align-middle">
                          {href ? (
                            <Link
                              href={href}
                              className="inline-flex items-center gap-2 font-extrabold tracking-tight text-slate-950 hover:text-[#071b38]"
                            >
                              {getCreditNo(r)}
                              <ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-slate-600" />
                            </Link>
                          ) : (
                            <div className="font-extrabold tracking-tight text-slate-950">
                              {getCreditNo(r)}
                            </div>
                          )}

                          <div className="mt-1 text-xs text-slate-500">
                            Created {fmtDate(r.created_at)}
                          </div>
                        </td>

                        <td className="px-5 py-5 align-middle">
                          <div className="truncate font-semibold text-slate-900">
                            {r.customer_name?.trim() || `Customer #${r.customer_id ?? "—"}`}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Customer ID: {r.customer_id ?? "—"}
                          </div>
                        </td>

                        <td className="px-5 py-5 align-middle">
                          <div className="inline-flex items-center gap-2 font-medium text-slate-700">
                            <Calendar className="size-4 text-slate-400" />
                            {fmtDate(getCreditDate(r))}
                          </div>
                        </td>

                        <td className="px-5 py-5 text-right align-middle font-bold text-slate-900 tabular-nums">
                          {money(r.subtotal)}
                        </td>

                        <td className="px-5 py-5 text-right align-middle font-bold text-slate-900 tabular-nums">
                          {money(r.vat)}
                        </td>

                        <td className="px-5 py-5 text-right align-middle font-extrabold text-slate-950 tabular-nums">
                          {money(r.total_amount)}
                        </td>

                        <td className="px-5 py-5 align-middle">
                          {r.invoice_id ? (
                            <Link
                              href={`/sales/invoices/${encodeURIComponent(String(r.invoice_id))}`}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:underline"
                            >
                              {String(r.invoice_id)}
                              <ArrowUpRight className="size-4 text-slate-400" />
                            </Link>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="px-5 py-5 text-center align-middle">
                          <StatusPill value={r.status} />
                        </td>

                        <td className="px-5 py-5 text-right align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="group/menu h-11 w-11 rounded-2xl border-orange-200 bg-orange-50 p-0 hover:border-orange-300 hover:bg-orange-100"
                                disabled={isBusy}
                              >
                                <span className="sr-only">Actions</span>
                                {isBusy ? (
                                  <Loader2 className="size-4 animate-spin text-orange-600" />
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_infinite]" />
                                    <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_0.15s_infinite]" />
                                    <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_0.3s_infinite]" />
                                  </div>
                                )}
                              </Button>
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
                                    `/sales/credit-notes/${encodeURIComponent(id)}/print`,
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
                                  sendWhatsApp(id, getCreditNo(r), r.customer_name ?? null);
                                }}
                              >
                                <MessageCircle className="mr-2 size-4" />
                                Send to WhatsApp
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {r.invoice_id ? (
                                <DropdownMenuItem
                                  className="rounded-xl"
                                  onClick={() =>
                                    router.push(`/sales/invoices/${encodeURIComponent(String(r.invoice_id))}`)
                                  }
                                >
                                  <ArrowUpRight className="mr-2 size-4" />
                                  Open linked invoice
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="rounded-xl" disabled>
                                  <ArrowUpRight className="mr-2 size-4" />
                                  Open linked invoice
                                </DropdownMenuItem>
                              )}
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
        </div>

        {/* Mobile + tablet cards */}
        <div className="xl:hidden">
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
              <div className="text-sm text-slate-500">No credit notes found.</div>
              <div className="mt-4">
                <Link href="/sales/credit-notes/new">
                  <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#0a2750]">
                    <Plus className="mr-2 size-4" />
                    Create your first credit note
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 sm:p-5">
              {rows.map((r) => {
                const id = safeId(r.id);
                const href = id ? `/sales/credit-notes/${encodeURIComponent(id)}` : "";
                const isBusy = busyActionId === id;

                return (
                  <div
                    key={id || getCreditNo(r)}
                    className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_14px_30px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex items-center gap-2 font-extrabold tracking-tight text-slate-950"
                          >
                            {getCreditNo(r)}
                            <ArrowUpRight className="size-4 text-slate-400" />
                          </Link>
                        ) : (
                          <div className="font-extrabold tracking-tight text-slate-950">
                            {getCreditNo(r)}
                          </div>
                        )}

                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {r.customer_name?.trim() || `Customer #${r.customer_id ?? "—"}`}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Date: {fmtDate(getCreditDate(r))}
                        </div>

                        <div className="mt-2">
                          <StatusPill value={r.status} />
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="group/menu h-11 w-11 shrink-0 rounded-2xl border-orange-200 bg-orange-50 p-0 hover:border-orange-300 hover:bg-orange-100"
                            disabled={isBusy}
                          >
                            <span className="sr-only">Actions</span>
                            {isBusy ? (
                              <Loader2 className="size-4 animate-spin text-orange-600" />
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_infinite]" />
                                <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_0.15s_infinite]" />
                                <span className="size-1.5 rounded-full bg-orange-500 animate-[pulse_1.2s_ease-in-out_0.3s_infinite]" />
                              </div>
                            )}
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          className="w-64 rounded-2xl border-slate-200 p-2"
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
                                `/sales/credit-notes/${encodeURIComponent(id)}/print`,
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
                              sendWhatsApp(id, getCreditNo(r), r.customer_name ?? null);
                            }}
                          >
                            <MessageCircle className="mr-2 size-4" />
                            Send to WhatsApp
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {r.invoice_id ? (
                            <DropdownMenuItem
                              className="rounded-xl"
                              onClick={() =>
                                router.push(`/sales/invoices/${encodeURIComponent(String(r.invoice_id))}`)
                              }
                            >
                              <ArrowUpRight className="mr-2 size-4" />
                              Open linked invoice
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="rounded-xl" disabled>
                              <ArrowUpRight className="mr-2 size-4" />
                              Open linked invoice
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Total
                        </div>
                        <div className="mt-1 text-base font-extrabold text-slate-950 tabular-nums">
                          {money(r.total_amount)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-blue-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700/80">
                          Subtotal
                        </div>
                        <div className="mt-1 text-base font-extrabold text-blue-700 tabular-nums">
                          {money(r.subtotal)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-orange-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700/80">
                          VAT
                        </div>
                        <div className="mt-1 text-base font-extrabold text-orange-700 tabular-nums">
                          {money(r.vat)}
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

        {/* Pagination */}
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