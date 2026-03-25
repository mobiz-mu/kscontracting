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
  Hash,
  FileText,
  CreditCard,
  CheckCircle2,
  MessageCircle,
  Mail,
  MapPin,
  Percent,
  Wallet,
  BadgeCheck,
  ReceiptText,
  ArrowUpRight,
  Link2,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* =========================
   Types
========================= */

type ApiCustomer = {
  id?: string | number | null;
  name?: string | null;
  brn?: string | null;
  vat_no?: string | null;
  address?: string | null;
} | null;

type ApiInvoice = {
  id: string;
  invoice_no: string;
  status?: string | null;
  invoice_type?: "VAT_INVOICE" | "PRO_FORMA" | "STANDARD" | "VAT" | "PROFORMA" | string | null;
  invoice_date?: string | null;
  notes?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  created_at?: string | null;
  issued_at?: string | null;
  site_address?: string | null;
  customers?: ApiCustomer;
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

type ShareLinkResponse = {
  ok: boolean;
  data?: {
    token?: string;
    share_url?: string;
    invoice_no?: string;
    expires_at?: string;
  };
  error?: any;
  supabaseError?: any;
  details?: any;
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

function invoiceTypeLabel(v?: string | null) {
  const x = String(v ?? "").toUpperCase();
  if (x === "PRO_FORMA" || x === "PROFORMA") return "PRO FORMA INVOICE";
  if (x === "VAT_INVOICE" || x === "VAT") return "VAT INVOICE";
  return "STANDARD INVOICE";
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

function StatBox({
  label,
  value,
  tone = "slate",
  sub,
}: {
  label: string;
  value: string;
  tone?: "slate" | "navy" | "orange" | "emerald";
  sub?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 ring-slate-200 text-slate-900",
    navy: "bg-[#071b38] text-white ring-white/10",
    orange: "bg-[#ff7a18] text-white ring-white/10",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-900",
  };

  return (
    <div className={cn("rounded-[24px] p-4 ring-1 sm:p-5", tones[tone])}>
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.18em]",
          tone === "navy" || tone === "orange" ? "text-white/70" : "text-slate-500"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-[22px] font-extrabold tracking-tight sm:text-[24px]",
          tone === "navy" || tone === "orange" ? "text-white" : "text-slate-950"
        )}
      >
        {value}
      </div>
      {sub ? (
        <div
          className={cn(
            "mt-1 text-xs",
            tone === "navy" || tone === "orange" ? "text-white/75" : "text-slate-600"
          )}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-9 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
        <Icon className="size-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </div>
        <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div>
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

  const id = React.useMemo(() => getParamId(params), [params]);
  const hasId = !!id && id !== "undefined" && id !== "null";

  const [loading, setLoading] = React.useState(false);
  const [issuing, setIssuing] = React.useState(false);
  const [creatingShare, setCreatingShare] = React.useState(false);
  const [copyingShare, setCopyingShare] = React.useState(false);
  const [err, setErr] = React.useState("");

  const [invoice, setInvoice] = React.useState<ApiInvoice | null>(null);
  const [items, setItems] = React.useState<ApiItem[]>([]);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  const [shareUrl, setShareUrl] = React.useState("");
  const [shareExpiresAt, setShareExpiresAt] = React.useState("");

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

  const createShareLink = React.useCallback(async () => {
    if (!hasId || !invoice) return "";

    setCreatingShare(true);
    setErr("");

    try {
      const res = await fetch(`/api/invoices/${id}/share-link`, {
        method: "POST",
      });

      const j = await safeJson<ShareLinkResponse>(res);

      if (!j.ok || !j.data?.share_url) {
        throw new Error(j?.error?.message ?? j?.error ?? "Failed to create private share link");
      }

      setShareUrl(j.data.share_url);
      setShareExpiresAt(j.data.expires_at ?? "");
      return j.data.share_url;
    } catch (e: any) {
      const message = e?.message || "Failed to create private share link";
      setErr(message);
      throw new Error(message);
    } finally {
      setCreatingShare(false);
    }
  }, [hasId, id, invoice]);

  const copyShareLink = React.useCallback(async () => {
    try {
      setCopyingShare(true);
      const url = shareUrl || (await createShareLink());
      if (!url) return;

      await navigator.clipboard.writeText(url);
      alert("Private invoice link copied.");
    } catch (e: any) {
      alert(e?.message || "Failed to copy share link");
    } finally {
      setCopyingShare(false);
    }
  }, [createShareLink, shareUrl]);

  const sendWhatsappInvoice = React.useCallback(async () => {
    try {
      if (!invoice || !hasId) return;

      const privateUrl = shareUrl || (await createShareLink());

      const message = `Hello,

Please find your ${invoiceTypeLabel(invoice.invoice_type)} from KS Contracting Ltd.
Invoice No: ${invoice.invoice_no}
Amount: ${money(invoice.total_amount)}

View invoice:
${privateUrl}

You can also download the PDF from the same page.

Thank you.`;

      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (e: any) {
      alert(e?.message || "Failed to prepare WhatsApp invoice link");
    }
  }, [createShareLink, hasId, invoice, shareUrl]);

  const sendEmailInvoice = React.useCallback(async () => {
    try {
      if (!invoice || !hasId) return;

      const privateUrl = shareUrl || (await createShareLink());

      const emailSubject = `${invoiceTypeLabel(invoice.invoice_type)} - ${invoice.invoice_no} - KS Contracting Ltd`;
      const emailBody = `Hello,

Please find your ${invoiceTypeLabel(invoice.invoice_type)} from KS Contracting Ltd.
Invoice No: ${invoice.invoice_no}
Amount: ${money(invoice.total_amount)}

View invoice:
${privateUrl}

You can also download the PDF from the same page.

Thank you.`;

      window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    } catch (e: any) {
      alert(e?.message || "Failed to prepare email invoice link");
    }
  }, [createShareLink, hasId, invoice, shareUrl]);

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

  const paid =
    typeof invoice?.paid_amount === "number" && Number.isFinite(invoice.paid_amount)
      ? n2(invoice.paid_amount)
      : Math.max(0, total - balance);

  const statusKey = String(invoice?.status ?? "").toUpperCase();
  const canIssue = !!invoice && statusKey === "DRAFT";

  const cust = invoice?.customers ?? null;
  const invoiceType = invoiceTypeLabel(invoice?.invoice_type);

  const printPath = hasId ? `/sales/invoices/${id}/print` : "#";
  const pdfDownloadPath = shareUrl
    ? shareUrl.replace("/share/invoice/", "/api/public/invoice-pdf/")
    : "";

  return (
    <div className="space-y-5">
      <Surface className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(700px_300px_at_110%_0%,rgba(255,153,51,0.20),transparent_50%)]" />

        <div className="relative px-4 py-5 sm:px-6 sm:py-6 xl:px-7 xl:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                  onClick={() => router.push("/sales/invoices")}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back
                </Button>

                {invoice?.status ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm",
                      statusStyle(invoice.status)
                    )}
                  >
                    {String(invoice.status ?? "—").replaceAll("_", " ")}
                  </span>
                ) : (
                  <Chip className="bg-white/12 text-white ring-white/15">—</Chip>
                )}

                {invoice ? (
                  <Chip className="bg-white/12 text-white ring-white/15">
                    <FileText className="size-3.5 text-white/85" />
                    {invoiceType}
                  </Chip>
                ) : null}

                {lastSync ? (
                  <Chip className="bg-white/12 text-white ring-white/15">
                    <RefreshCw className="size-3.5 text-white/85" />
                    Synced {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Chip>
                ) : null}

                <Chip className="bg-[#ff8a1e]/18 text-[#ffd6ad] ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                {invoice?.invoice_no || (loading ? "Loading…" : hasId ? "Invoice Details" : "Missing invoice id")}
              </h1>

              <div className="mt-2 text-sm text-blue-50/90 sm:text-[15px]">
                {cust?.name ? (
                  <>
                    Customer: <span className="font-bold text-white">{cust.name}</span>
                  </>
                ) : (
                  "Customer: —"
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-blue-50/85">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="size-4 text-blue-100/80" />
                  Date: <span className="font-semibold text-white">{fmtDate(invoice?.invoice_date ?? null)}</span>
                </span>

                <span className="inline-flex items-center gap-2">
                  <Percent className="size-4 text-blue-100/80" />
                  VAT: <span className="font-semibold text-white">15%</span>
                </span>

                {invoice?.site_address ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-4 text-blue-100/80" />
                    Site: <span className="font-semibold text-white">{invoice.site_address}</span>
                  </span>
                ) : null}

                {shareExpiresAt ? (
                  <span className="inline-flex items-center gap-2">
                    <Link2 className="size-4 text-blue-100/80" />
                    Private link expires: <span className="font-semibold text-white">{fmtDate(shareExpiresAt)}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                onClick={load}
                disabled={loading || !hasId}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Link href={printPath} aria-disabled={!invoice || !hasId}>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                  disabled={!invoice || !hasId}
                >
                  <Printer className="mr-2 size-4" />
                  Print / PDF
                </Button>
              </Link>

              <Button
                onClick={issueInvoice}
                disabled={!canIssue || issuing || !hasId}
                className="h-11 rounded-2xl bg-[#ff8a1e] px-5 font-semibold text-white shadow-[0_18px_44px_rgba(255,138,30,0.24)] hover:bg-[#f07c0f]"
                title={!canIssue ? "Only Draft invoices can be issued" : "Issue invoice"}
              >
                {issuing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Issue & Print
              </Button>
            </div>
          </div>

          {!hasId ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Missing invoice id in URL. Open from the invoices list.
            </div>
          ) : err ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <StatBox label="Sub Total" value={invoice ? money(subtotal) : "—"} />
        <StatBox label="VAT 15%" value={invoice ? money(vat) : "—"} />
        <StatBox label="Total" value={invoice ? money(total) : "—"} tone="navy" />
        <StatBox
          label="Balance"
          value={invoice ? money(balance) : "—"}
          tone={balance <= 0 ? "emerald" : "orange"}
          sub={invoice ? (balance <= 0 ? "Settled" : "Outstanding") : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="space-y-4">
          <Surface>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <div className="text-base font-bold tracking-tight text-slate-950">Invoice Items</div>
                <div className="mt-1 text-sm text-slate-600">
                  {invoice ? `${items.length} item(s) on this invoice` : "—"}
                </div>
              </div>

              {invoice ? (
                <Chip className="bg-slate-50 text-slate-700 ring-slate-200">
                  <ReceiptText className="size-4 text-slate-500" />
                  MUR
                </Chip>
              ) : null}
            </div>

            <div className="hidden md:block p-4 sm:p-5">
              <div className="grid grid-cols-[minmax(0,1.8fr)_90px_150px_140px_160px] gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Description</div>
                <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Qty</div>
                <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Unit Price</div>
                <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">VAT</div>
                <div className="text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Amount</div>
              </div>

              <div className="mt-3 space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="grid animate-pulse grid-cols-[minmax(0,1.8fr)_90px_150px_140px_160px] gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                    >
                      <div className="h-4 w-4/5 rounded bg-slate-200" />
                      <div className="ml-auto h-4 w-10 rounded bg-slate-200" />
                      <div className="ml-auto h-4 w-24 rounded bg-slate-200" />
                      <div className="ml-auto h-4 w-20 rounded bg-slate-200" />
                      <div className="ml-auto h-4 w-28 rounded bg-slate-200" />
                    </div>
                  ))
                ) : !invoice ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500">
                    No invoice loaded.
                  </div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500">
                    No items found for this invoice.
                  </div>
                ) : (
                  items.map((it) => (
                    <div
                      key={String(it.id)}
                      className="grid grid-cols-[minmax(0,1.8fr)_90px_150px_140px_160px] gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                    >
                      <div className="min-w-0">
                        <div className="whitespace-pre-wrap break-words font-semibold text-slate-900">
                          {it.description}
                        </div>
                      </div>
                      <div className="text-right font-semibold text-slate-700">{n2(it.qty)}</div>
                      <div className="text-right font-semibold text-slate-900">{money(it.unit_price_excl_vat)}</div>
                      <div className="text-right font-semibold text-slate-900">{money(it.vat_amount)}</div>
                      <div className="text-right font-extrabold text-slate-950">{money(it.line_total)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="md:hidden p-4">
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="h-4 w-3/4 rounded bg-slate-200" />
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="h-14 rounded-2xl bg-slate-100" />
                        <div className="h-14 rounded-2xl bg-slate-100" />
                        <div className="h-14 rounded-2xl bg-slate-100" />
                        <div className="h-14 rounded-2xl bg-slate-100" />
                      </div>
                    </div>
                  ))
                ) : !invoice ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500">
                    No invoice loaded.
                  </div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500">
                    No items found for this invoice.
                  </div>
                ) : (
                  items.map((it) => (
                    <div
                      key={String(it.id)}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_24px_rgba(15,23,42,0.05)]"
                    >
                      <div className="font-semibold text-slate-900 whitespace-pre-wrap break-words">
                        {it.description}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Qty
                          </div>
                          <div className="mt-1 font-bold text-slate-900">{n2(it.qty)}</div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Unit Price
                          </div>
                          <div className="mt-1 font-bold text-slate-900">{money(it.unit_price_excl_vat)}</div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            VAT
                          </div>
                          <div className="mt-1 font-bold text-slate-900">{money(it.vat_amount)}</div>
                        </div>

                        <div className="rounded-2xl bg-[#071b38] p-3">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                            Amount
                          </div>
                          <div className="mt-1 font-extrabold text-white">{money(it.line_total)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="text-sm text-slate-600">
                  {invoice?.notes?.trim() ? (
                    <>
                      <span className="font-semibold text-slate-900">Notes:</span> {invoice.notes.trim()}
                    </>
                  ) : (
                    <span className="text-slate-500">No additional notes on this invoice.</span>
                  )}
                </div>

                <div className="w-full space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Sub Total</span>
                    <span className="font-semibold text-slate-900">{money(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>VAT 15%</span>
                    <span className="font-semibold text-slate-900">{money(vat)}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between text-base">
                    <span className="font-semibold text-slate-700">Total</span>
                    <span className="font-extrabold text-slate-950">{money(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Paid</span>
                    <span className="font-semibold text-slate-900">{money(paid)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Balance</span>
                    <span className={cn("font-extrabold", balance > 0 ? "text-slate-950" : "text-emerald-700")}>
                      {money(balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Surface>
        </div>

        <div className="space-y-4 xl:sticky xl:top-[92px]">
          <Surface>
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-bold tracking-tight text-slate-950">Client Details</div>
                  <div className="mt-1 text-sm text-slate-600">Customer and site information</div>
                </div>
                <div className="grid size-10 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                  <Building2 className="size-4 text-slate-500" />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <InfoRow icon={Building2} label="Customer" value={cust?.name ?? "—"} />
              <InfoRow icon={MapPin} label="Address" value={cust?.address ?? "No customer address"} />

              {invoice?.site_address ? (
                <InfoRow icon={MapPin} label="Site Address" value={invoice.site_address} />
              ) : null}

              {cust?.vat_no ? (
                <InfoRow icon={Percent} label="Client VAT No." value={cust.vat_no} />
              ) : null}

              {cust?.brn ? (
                <InfoRow icon={Hash} label="Client BRN No." value={cust.brn} />
              ) : null}

              {!cust?.vat_no && !cust?.brn ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
                  No VAT or BRN on customer profile.
                </div>
              ) : null}
            </div>
          </Surface>

          <Surface>
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-bold tracking-tight text-slate-950">Actions</div>
                  <div className="mt-1 text-sm text-slate-600">Print, issue, share and collect</div>
                </div>
                {invoice?.status ? (
                  <Badge variant="secondary" className={cn("rounded-full border", statusStyle(invoice.status))}>
                    {String(invoice.status).replaceAll("_", " ")}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <Link href={printPath} aria-disabled={!invoice || !hasId}>
                <Button
                  className="h-11 w-full rounded-2xl bg-[#071b38] text-white shadow-[0_16px_40px_rgba(7,27,56,0.18)] hover:bg-[#0a2750]"
                  disabled={!invoice || !hasId}
                >
                  <Printer className="mr-2 size-4" />
                  Print / Save PDF
                </Button>
              </Link>

              <Button
                className="h-11 w-full rounded-2xl bg-[#ff8a1e] text-white shadow-[0_18px_44px_rgba(255,138,30,0.24)] hover:bg-[#f07c0f]"
                onClick={issueInvoice}
                disabled={!canIssue || issuing || !hasId}
                title={!canIssue ? "Only Draft invoices can be issued" : "Issue invoice"}
              >
                {issuing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Issue Invoice
              </Button>

              <Link
                href={hasId ? `/sales/payments/new?invoiceId=${encodeURIComponent(id)}&invoiceNo=${encodeURIComponent(invoice?.invoice_no || "")}&amount=${encodeURIComponent(String(balance))}` : "#"}
                aria-disabled={!invoice || !hasId || balance <= 0}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                  disabled={!invoice || !hasId || balance <= 0}
                >
                  <Wallet className="mr-2 size-4" />
                  Add Payment
                </Button>
              </Link>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                disabled={!invoice || !hasId || creatingShare}
                onClick={sendWhatsappInvoice}
              >
                {creatingShare ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <MessageCircle className="mr-2 size-4" />
                )}
                Send by WhatsApp
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                disabled={!invoice || !hasId || creatingShare}
                onClick={sendEmailInvoice}
              >
                {creatingShare ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 size-4" />
                )}
                Send by Email
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                disabled={!invoice || !hasId || creatingShare || copyingShare}
                onClick={copyShareLink}
              >
                {copyingShare ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 size-4" />
                )}
                Copy Private Link
              </Button>

              {shareUrl ? (
                <a href={pdfDownloadPath} target="_blank" rel="noreferrer">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                  >
                    <Download className="mr-2 size-4" />
                    Download Real PDF
                  </Button>
                </a>
              ) : null}

              <Button
                variant="outline"
                className="h-11 w-full rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                onClick={() => window.open(printPath, "_blank", "noopener,noreferrer")}
                disabled={!invoice || !hasId}
              >
                <ArrowUpRight className="mr-2 size-4" />
                Open Print in New Tab
              </Button>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-800">Payment Snapshot</div>
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

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total</span>
                    <span className="font-semibold text-slate-900">{invoice ? money(total) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Paid</span>
                    <span className="font-semibold text-slate-900">{invoice ? money(paid) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Balance</span>
                    <span className={cn("font-extrabold", balance > 0 ? "text-slate-950" : "text-emerald-700")}>
                      {invoice ? money(balance) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}