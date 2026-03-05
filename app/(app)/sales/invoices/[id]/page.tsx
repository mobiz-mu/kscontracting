// app/(app)/sales/invoices/[id]/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  Send,
  Calendar,
  Building2,
  Mail,
  Phone,
  Hash,
  FileText,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* =========================
   Types (matches /api/invoices/[id])
========================= */

type ApiCustomer = {
  id?: string | number | null;
  name?: string | null;
  brn?: string | null;
  vat_no?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
} | null;

type ApiInvoice = {
  id: string;
  invoice_no: string;
  status?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  created_at?: string | null;
  issued_at?: string | null;
  customers?: ApiCustomer; // embedded by your /api/invoices/[id]
};

type ApiItem = {
  id: number | string;
  invoice_id: string;
  description: string;
  qty: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
};

type InvoiceGetResponse = {
  ok: boolean;
  data?: { invoice?: ApiInvoice; items?: ApiItem[] };
  error?: any;
  supabaseError?: any;
  details?: any;
};

type IssueResponse = {
  ok: boolean;
  data?: { id: string; invoice_no?: string; status?: string };
  error?: any;
  supabaseError?: any;
};

/* =========================
   Utils
========================= */

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(v: any) {
  const n = n2(v);
  return `Rs ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function isOverdue(balance: number, due?: string | null) {
  if (!(balance > 0) || !due) return false;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function getParamId(p: any): string {
  const raw = p?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

function statusStyle(s?: string | null) {
  const key = String(s ?? "").toUpperCase();
  if (key === "PAID") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (key === "ISSUED") return "bg-blue-50 text-blue-700 border-blue-200";
  if (key === "PARTIALLY_PAID") return "bg-amber-50 text-amber-800 border-amber-200";
  if (key === "VOID") return "bg-rose-50 text-rose-700 border-rose-200";
  if (key === "DRAFT") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    try {
      const j = JSON.parse(raw);
      throw new Error(j?.error?.message ?? j?.error ?? j?.message ?? `HTTP ${res.status}`);
    } catch {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 180)}`);
    }
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON. Got ${ct || "unknown"}: ${raw.slice(0, 120)}`);
  }

  return JSON.parse(raw) as T;
}

/* =========================
   UI atoms
========================= */

function Card3D({ children, className }: { children: React.ReactNode; className?: string }) {
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

function StatBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "navy" | "orange" | "emerald" | "rose";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 ring-slate-200 text-slate-900",
    navy: "bg-[#071b38] text-white ring-white/10",
    orange: "bg-[#ff7a18] text-white ring-white/10",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-900",
    rose: "bg-rose-50 ring-rose-200 text-rose-900",
  };

  return (
    <div className={cn("rounded-2xl p-4 ring-1", tones[tone])}>
      <div className={cn("text-xs font-semibold", tone === "navy" || tone === "orange" ? "text-white/70" : "text-slate-500")}>
        {label}
      </div>
      <div className={cn("mt-1 text-lg font-extrabold tracking-tight", tone === "navy" || tone === "orange" ? "text-white" : "text-slate-900")}>
        {value}
      </div>
    </div>
  );
}

/* =========================
   Page
========================= */

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();

  // ✅ ALWAYS derive id safely (handles string[] too)
  const id = React.useMemo(() => getParamId(params), [params]);
  const hasId = !!id && id !== "undefined" && id !== "null";

  const [loading, setLoading] = React.useState(false);
  const [issuing, setIssuing] = React.useState(false);
  const [err, setErr] = React.useState("");

  const [invoice, setInvoice] = React.useState<ApiInvoice | null>(null);
  const [items, setItems] = React.useState<ApiItem[]>([]);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  const load = React.useCallback(async () => {
    if (!hasId) return;

    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`/api/invoices/${id}`, { cache: "no-store" });
      const j = await safeJson<InvoiceGetResponse>(res);

      if (!j.ok) throw new Error(j?.error?.message ?? j?.error ?? "Invoice not found");

      const inv = j.data?.invoice ?? null;
      const its = (j.data?.items ?? []) as ApiItem[];

      setInvoice(inv);
      setItems(Array.isArray(its) ? its : []);
      setLastSync(new Date());

      if (!inv) setErr("Invoice not found.");
    } catch (e: any) {
      setErr(e?.message || "Failed to load invoice");
      setInvoice(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id, hasId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const issueInvoice = React.useCallback(async () => {
    if (!hasId) return;

    setIssuing(true);
    setErr("");

    try {
      const res = await fetch(`/api/invoices/${id}/issue`, {
        method: "POST",
        cache: "no-store",
      });

      const j = await safeJson<IssueResponse>(res);
      if (!j.ok) throw new Error(j?.error?.message ?? j?.error ?? "Issue failed");

      await load();

      // open print after issue
      window.open(`/sales/invoices/${id}/print`, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(e?.message || "Failed to issue invoice");
    } finally {
      setIssuing(false);
    }
  }, [id, hasId, load]);

  const total = n2(invoice?.total_amount);
  const subtotal = n2(invoice?.subtotal);
  const vat = n2(invoice?.vat_amount);
  const balance = n2(invoice?.balance_amount);

  // ✅ do NOT use "||" because 0 is valid
  const paid =
    typeof invoice?.paid_amount === "number" && Number.isFinite(invoice.paid_amount)
      ? n2(invoice.paid_amount)
      : Math.max(0, total - balance);

  const overdue = isOverdue(balance, invoice?.due_date ?? null);
  const statusKey = String(invoice?.status ?? "").toUpperCase();
  const canIssue = !!invoice && statusKey === "DRAFT";

  const cust = invoice?.customers ?? null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                  onClick={() => router.push("/sales/invoices")}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back
                </Button>

                {invoice ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                      statusStyle(invoice.status)
                    )}
                  >
                    {String(invoice.status ?? "—").replaceAll("_", " ")}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 border-slate-200">
                    —
                  </span>
                )}

                {overdue ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                    <AlertTriangle className="size-4" />
                    Overdue
                  </span>
                ) : null}

                {lastSync ? (
                  <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    <RefreshCw className="size-3.5 text-slate-500" />
                    Synced {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {invoice?.invoice_no || (loading ? "Loading…" : hasId ? "Invoice" : "Missing invoice id")}
              </h1>

              <div className="mt-1 text-sm text-slate-600">
                {cust?.name ? (
                  <>
                    Customer: <span className="font-semibold text-slate-900">{cust.name}</span>
                  </>
                ) : (
                  "Customer: —"
                )}
              </div>

              <div className="mt-1 text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="size-4 text-slate-400" />
                  Invoice: <span className="font-semibold text-slate-900">{fmtDate(invoice?.invoice_date ?? null)}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className={cn("inline-flex items-center gap-2", overdue && "text-rose-700")}>
                  <Calendar className={cn("size-4", overdue ? "text-rose-400" : "text-slate-400")} />
                  Due: <span className="font-semibold">{fmtDate(invoice?.due_date ?? null)}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                onClick={load}
                disabled={loading || !hasId}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Link href={hasId ? `/sales/invoices/${id}/print` : "#"} aria-disabled={!invoice || !hasId}>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                  disabled={!invoice || !hasId}
                >
                  <Printer className="mr-2 size-4" />
                  Print / PDF
                </Button>
              </Link>

              <Button
                onClick={issueInvoice}
                disabled={!canIssue || issuing || !hasId}
                className="h-11 rounded-2xl bg-[#ff7a18] text-white hover:bg-[#ff6a00] shadow-[0_18px_44px_rgba(255,122,24,0.22)]"
                title={!canIssue ? "Only Draft invoices can be issued" : "Issue invoice"}
              >
                {issuing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Issue & Print
              </Button>
            </div>
          </div>

          {!hasId ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Missing invoice id in URL. Open from the invoices list (click invoice number).
            </div>
          ) : err ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatBox label="Subtotal" value={invoice ? money(subtotal) : "—"} />
        <StatBox label="VAT" value={invoice ? money(vat) : "—"} />
        <StatBox label="Total" value={invoice ? money(total) : "—"} tone="navy" />
        <StatBox label="Balance" value={invoice ? money(balance) : "—"} tone={overdue ? "rose" : "orange"} />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px] items-start">
        {/* LEFT */}
        <div className="space-y-4">
          {/* Items */}
          <Card3D className="p-0">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Invoice Items</div>
                <div className="mt-0.5 text-xs text-slate-600">{invoice ? `${items.length} item(s)` : "—"}</div>
              </div>

              {invoice ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  <FileText className="size-4 text-slate-500" />
                  MUR
                </span>
              ) : null}
            </div>

            <div className="border-t border-slate-200 overflow-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                    <th>Description</th>
                    <th className="w-[110px] text-right">Qty</th>
                    <th className="w-[160px] text-right">Unit (excl.)</th>
                    <th className="w-[140px] text-right">VAT</th>
                    <th className="w-[170px] text-right">Line Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-4">
                          <div className="h-4 w-[360px] rounded bg-slate-200" />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="ml-auto h-4 w-10 rounded bg-slate-200" />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="ml-auto h-4 w-24 rounded bg-slate-200" />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="ml-auto h-4 w-24 rounded bg-slate-200" />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="ml-auto h-4 w-28 rounded bg-slate-200" />
                        </td>
                      </tr>
                    ))
                  ) : !invoice ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        No invoice loaded.
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        No items found for this invoice.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => (
                      <tr key={String(it.id)}>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{it.description}</div>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-700">{n2(it.qty)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-900">{money(it.unit_price_excl_vat)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-900">{money(it.vat_amount)}</td>
                        <td className="px-5 py-4 text-right font-extrabold text-slate-900">{money(it.line_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals footer */}
            <div className="border-t border-slate-200 bg-white px-5 py-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="text-xs text-slate-600">
                  {invoice?.notes?.trim() ? (
                    <>
                      <span className="font-semibold text-slate-900">Notes:</span> {invoice.notes.trim()}
                    </>
                  ) : (
                    <span className="text-slate-500">Tip: add notes (bank details / reference instructions) to show on print.</span>
                  )}
                </div>

                <div className="ml-auto w-full max-w-[360px] space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">{money(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>VAT</span>
                    <span className="font-semibold text-slate-900">{money(vat)}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Total</span>
                    <span className="font-extrabold text-slate-900">{money(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Paid</span>
                    <span className="font-semibold text-slate-900">{money(paid)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Balance</span>
                    <span className={cn("font-extrabold", balance > 0 ? "text-slate-900" : "text-emerald-700")}>
                      {money(balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card3D>
        </div>

        {/* RIGHT */}
        <div className="space-y-4 xl:sticky xl:top-[92px]">
          {/* Customer card */}
          <Card3D className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Bill To</div>
                <div className="mt-0.5 text-xs text-slate-600">Customer details (from invoice.customers)</div>
              </div>
              <div className="grid size-10 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                <Building2 className="size-4 text-slate-500" />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-sm font-extrabold text-slate-900">{cust?.name ?? "—"}</div>

              {cust?.address ? <div className="text-sm text-slate-600">{cust.address}</div> : <div className="text-sm text-slate-500">No address</div>}

              <div className="mt-2 grid gap-2">
                {cust?.email ? (
                  <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <Mail className="size-4 text-slate-400" />
                    <span className="font-semibold">{cust.email}</span>
                  </div>
                ) : null}

                {cust?.phone ? (
                  <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="size-4 text-slate-400" />
                    <span className="font-semibold">{cust.phone}</span>
                  </div>
                ) : null}

                {cust?.vat_no || cust?.brn ? (
                  <div className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <Hash className="size-4 text-slate-400" />
                    <span>
                      {cust?.vat_no ? (
                        <>
                          VAT: <span className="font-semibold text-slate-900">{cust.vat_no}</span>
                        </>
                      ) : null}
                      {cust?.vat_no && cust?.brn ? <span className="mx-2 text-slate-300">•</span> : null}
                      {cust?.brn ? (
                        <>
                          BRN: <span className="font-semibold text-slate-900">{cust.brn}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No VAT/BRN</div>
                )}
              </div>
            </div>
          </Card3D>

          {/* Actions card */}
          <Card3D className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Actions</div>
                <div className="mt-0.5 text-xs text-slate-600">Print, issue, and manage state.</div>
              </div>
              {invoice?.status ? (
                <Badge variant="secondary" className={cn("rounded-full border", statusStyle(invoice.status))}>
                  {String(invoice.status).replaceAll("_", " ")}
                </Badge>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2">
              <Link href={hasId ? `/sales/invoices/${id}/print` : "#"} aria-disabled={!invoice || !hasId}>
                <Button
                  className="w-full rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_14px_40px_rgba(7,27,56,0.18)]"
                  disabled={!invoice || !hasId}
                >
                  <Printer className="mr-2 size-4" />
                  Print / Save PDF
                </Button>
              </Link>

              <Button
                className="w-full rounded-2xl bg-[#ff7a18] text-white hover:bg-[#ff6a00] shadow-[0_18px_44px_rgba(255,122,24,0.22)]"
                onClick={issueInvoice}
                disabled={!canIssue || issuing || !hasId}
                title={!canIssue ? "Only Draft invoices can be issued" : "Issue invoice"}
              >
                {issuing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Issue Invoice
              </Button>

              <Button
                variant="outline"
                className="w-full rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                onClick={() => window.open(`/sales/invoices/${id}/print`, "_blank", "noopener,noreferrer")}
                disabled={!invoice || !hasId}
              >
                <FileText className="mr-2 size-4" />
                Open Print in New Tab
              </Button>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700">Payment Snapshot</div>
                {balance <= 0 && invoice ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="size-4" />
                    Settled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                    <CreditCard className="size-4" />
                    Outstanding
                  </span>
                )}
              </div>

              <div className="mt-2 grid gap-1 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Total</span>
                  <span className="font-semibold text-slate-900">{invoice ? money(total) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Paid</span>
                  <span className="font-semibold text-slate-900">{invoice ? money(paid) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Balance</span>
                  <span className={cn("font-extrabold", overdue ? "text-rose-700" : "text-slate-900")}>
                    {invoice ? money(balance) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {overdue ? (
              <div className="mt-3 rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="size-4" />
                  Overdue — consider sending a reminder today.
                </div>
              </div>
            ) : null}
          </Card3D>
        </div>
      </div>
    </div>
  );
}