"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Send,
  Calendar,
  Building2,
  Hash,
  FileText,
  MessageCircle,
  Mail,
  MapPin,
  Percent,
  BadgeCheck,
  Link2,
  Download,
  ShieldCheck,
  ExternalLink,
  PencilLine,
  Sparkles,
  Wallet,
  ReceiptText,
  Clock3,
  Copy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  invoice_type?:
    | "VAT_INVOICE"
    | "PRO_FORMA"
    | "STANDARD"
    | "VAT"
    | "PROFORMA"
    | string
    | null;
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
  customer_name?: string | null;
  customer_vat?: string | null;
  customer_brn?: string | null;
  customer_address?: string | null;
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
  if (key === "PARTIALLY_PAID")
    return "bg-amber-50 text-amber-800 border-amber-200";
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
      throw new Error(
        j?.error?.message ?? j?.error ?? j?.message ?? `HTTP ${res.status}`
      );
    } catch {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 180)}`);
    }
  }

  if (!ct.includes("application/json")) {
    throw new Error(
      `Expected JSON. Got ${ct || "unknown"}: ${raw.slice(0, 120)}`
    );
  }

  return JSON.parse(raw) as T;
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
        "relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white",
        "shadow-[0_1px_0_rgba(15,23,42,0.04),0_16px_40px_rgba(15,23,42,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "slate" | "navy" | "orange" | "emerald";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 ring-slate-200 text-slate-900",
    navy: "bg-[#071b38] text-white ring-white/10",
    orange: "bg-[#ff7a18] text-white ring-white/10",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-900",
  };

  return (
    <div className={cn("rounded-[20px] p-4 ring-1", tones[tone])}>
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-4",
            tone === "navy" || tone === "orange" ? "text-white/80" : "text-slate-500"
          )}
        />
        <div
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.18em]",
            tone === "navy" || tone === "orange" ? "text-white/70" : "text-slate-500"
          )}
        >
          {label}
        </div>
      </div>
      <div
        className={cn(
          "mt-3 text-xl font-extrabold tracking-tight",
          tone === "navy" || tone === "orange" ? "text-white" : "text-slate-950"
        )}
      >
        {value}
      </div>
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
      <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
        <Icon className="size-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </div>
        <div className="mt-1 break-words text-sm font-semibold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function CompactActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  loading,
  variant = "outline",
  className,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "outline" | "solid";
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      className={cn(
        "h-9 rounded-xl px-3 text-xs font-semibold",
        variant === "outline" &&
          "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50",
        variant === "solid" &&
          "border-transparent bg-[#071b38] text-white hover:bg-[#0b2347]",
        className
      )}
    >
      {loading ? (
        <RefreshCw className="mr-2 size-3.5 animate-spin" />
      ) : (
        <Icon className="mr-2 size-3.5" />
      )}
      {label}
    </Button>
  );
}

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

      if (!j.ok) {
        throw new Error(j?.error?.message ?? j?.error ?? "Invoice not found");
      }

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
        throw new Error(
          j?.error?.message ??
            j?.error ??
            "Failed to create public secure invoice link"
        );
      }

      setShareUrl(j.data.share_url);
      setShareExpiresAt(j.data.expires_at ?? "");
      return j.data.share_url;
    } catch (e: any) {
      const message =
        e?.message || "Failed to create public secure invoice link";
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
      alert("Public secure invoice link copied.");
    } catch (e: any) {
      alert(e?.message || "Failed to copy public invoice link");
    } finally {
      setCopyingShare(false);
    }
  }, [createShareLink, shareUrl]);

  const openPublicInvoice = React.useCallback(async () => {
    try {
      const url = shareUrl || (await createShareLink());
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message || "Failed to open public invoice");
    }
  }, [createShareLink, shareUrl]);

  const openPublicPdf = React.useCallback(async () => {
    try {
      const url = shareUrl || (await createShareLink());
      if (!url) return;
      window.open(
        url.replace("/public-invoice/", "/api/public/invoice-pdf/"),
        "_blank",
        "noopener,noreferrer"
      );
    } catch (e: any) {
      alert(e?.message || "Failed to open public PDF");
    }
  }, [createShareLink, shareUrl]);

  const sendWhatsappInvoice = React.useCallback(async () => {
    try {
      if (!invoice || !hasId) return;

      const publicUrl = shareUrl || (await createShareLink());
      const pdfUrl = publicUrl.replace(
        "/public-invoice/",
        "/api/public/invoice-pdf/"
      );

      const message =
        `Hello,\n\n` +
        `Please find your ${invoiceTypeLabel(
          invoice.invoice_type
        )} from KS Contracting Ltd.\n` +
        `Invoice No: ${invoice.invoice_no}\n` +
        `Amount: ${money(invoice.total_amount)}\n\n` +
        `View invoice:\n${publicUrl}\n\n` +
        `Download PDF:\n${pdfUrl}\n\n` +
        `This secure link only allows invoice viewing and PDF download.`;

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

      const publicUrl = shareUrl || (await createShareLink());
      const pdfUrl = publicUrl.replace(
        "/public-invoice/",
        "/api/public/invoice-pdf/"
      );
      const emailSubject = `${invoiceTypeLabel(
        invoice.invoice_type
      )} - ${invoice.invoice_no} - KS Contracting Ltd`;
      const emailBody =
        `Hello,\n\n` +
        `Please find your ${invoiceTypeLabel(
          invoice.invoice_type
        )} from KS Contracting Ltd.\n` +
        `Invoice No: ${invoice.invoice_no}\n` +
        `Amount: ${money(invoice.total_amount)}\n\n` +
        `View invoice:\n${publicUrl}\n\n` +
        `Download PDF:\n${pdfUrl}\n\n` +
        `This secure link only allows invoice viewing and PDF download.\n\n` +
        `Thank you.`;

      window.location.href = `mailto:?subject=${encodeURIComponent(
        emailSubject
      )}&body=${encodeURIComponent(emailBody)}`;
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

  const goToEditDraft = React.useCallback(() => {
    if (!hasId || !invoice) return;
    router.push(`/sales/invoices/new?edit=${encodeURIComponent(id)}`);
  }, [hasId, id, invoice, router]);

  const total = n2(invoice?.total_amount);
  const subtotal = n2(invoice?.subtotal);
  const vat = n2(invoice?.vat_amount);
  const balance = n2(invoice?.balance_amount);
  const paid = Math.max(0, total - balance);

  const statusKey = String(invoice?.status ?? "").toUpperCase();
  const canIssue = !!invoice && statusKey === "DRAFT";
  const canEdit = !!invoice && statusKey === "DRAFT";

  const cust = invoice?.customers ?? null;
  const displayCustomerName = invoice?.customer_name ?? cust?.name ?? "—";
  const displayCustomerAddress =
    invoice?.customer_address ?? cust?.address ?? "No customer address";
  const displayCustomerVat = invoice?.customer_vat ?? cust?.vat_no ?? "";
  const displayCustomerBrn = invoice?.customer_brn ?? cust?.brn ?? "";

  const invoiceType = invoiceTypeLabel(invoice?.invoice_type);

  return (
    <div className="space-y-4">
      <Surface className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_55%,#163d73_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(780px_260px_at_-5%_-10%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(520px_220px_at_110%_0%,rgba(255,153,51,0.16),transparent_48%)]" />

        <div className="relative px-4 py-4 sm:px-5 sm:py-5 xl:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CompactActionButton
                  icon={ArrowLeft}
                  label="Back"
                  onClick={() => router.push("/sales/invoices")}
                  className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                />

                {invoice?.status ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm",
                      statusStyle(invoice.status)
                    )}
                  >
                    {String(invoice.status ?? "—").replaceAll("_", " ")}
                  </span>
                ) : null}

                {invoice ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                    <ReceiptText className="size-3.5 text-white/85" />
                    {invoiceType}
                  </span>
                ) : null}

                {lastSync ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                    <Clock3 className="size-3.5 text-white/85" />
                    {lastSync.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}

                <span className="inline-flex items-center gap-2 rounded-full bg-[#ff8a1e]/14 px-2.5 py-1 text-[11px] font-semibold text-[#ffd6ad] ring-1 ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  KS Contracting
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h1 className="truncate text-[28px] font-extrabold tracking-tight text-white sm:text-[32px]">
                    {invoice?.invoice_no ||
                      (loading
                        ? "Loading..."
                        : hasId
                        ? "Invoice Details"
                        : "Missing invoice id")}
                  </h1>
                  <div className="mt-1 text-sm text-blue-50/90">
                    {displayCustomerName}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 sm:mt-0">
                  <CompactActionButton
                    icon={RefreshCw}
                    label="Refresh"
                    onClick={load}
                    disabled={loading || !hasId}
                    loading={loading}
                    className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  />

                  {canEdit ? (
                    <CompactActionButton
                      icon={PencilLine}
                      label="Edit Draft"
                      onClick={goToEditDraft}
                      className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                    />
                  ) : null}

                  <CompactActionButton
                    icon={Send}
                    label="Issue"
                    onClick={issueInvoice}
                    disabled={!canIssue || issuing || !hasId}
                    loading={issuing}
                    variant="solid"
                    className="bg-[#ff8a1e] text-white hover:bg-[#f07c0f]"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-blue-50/85">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-100/80" />
                  {fmtDate(invoice?.invoice_date ?? null)}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Percent className="size-3.5 text-blue-100/80" />
                  VAT 15%
                </span>

                {invoice?.site_address ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-blue-100/80" />
                    {invoice.site_address}
                  </span>
                ) : null}

                {shareExpiresAt ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-blue-100/80" />
                    Link expires {fmtDate(shareExpiresAt)}
                  </span>
                ) : null}
              </div>

              {canEdit ? (
                <div className="mt-3 rounded-2xl border border-[#ffbe82]/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,231,204,0.12)_45%,rgba(255,155,61,0.16)_100%)] px-3 py-2.5 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/95">
                    <Sparkles className="size-3.5 text-[#ffd6ad]" />
                    <span className="font-semibold">Draft invoice.</span>
                    <span className="text-white/80">
                      You can still edit lines, customer details and site address before issuing.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {!hasId ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Missing invoice id in URL. Open from the invoices list.
            </div>
          ) : err ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MiniStat icon={Wallet} label="Subtotal" value={invoice ? money(subtotal) : "—"} />
        <MiniStat icon={Percent} label="VAT" value={invoice ? money(vat) : "—"} />
        <MiniStat icon={ReceiptText} label="Total" value={invoice ? money(total) : "—"} tone="navy" />
        <MiniStat
          icon={BadgeCheck}
          label="Balance"
          value={invoice ? money(balance) : "—"}
          tone={balance <= 0 ? "emerald" : "orange"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Surface>
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold tracking-tight text-slate-950">
                    Invoice Summary
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Compact executive financial overview
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    Paid {money(paid)}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    Items {items.length}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
              <div className="space-y-4">
                <InfoRow
                  icon={Building2}
                  label="Customer"
                  value={displayCustomerName}
                />
                <InfoRow
                  icon={MapPin}
                  label="Customer Address"
                  value={displayCustomerAddress}
                />
                {invoice?.site_address ? (
                  <InfoRow
                    icon={MapPin}
                    label="Site Address"
                    value={invoice.site_address}
                  />
                ) : null}
              </div>

              <div className="space-y-4">
                <InfoRow
                  icon={Calendar}
                  label="Invoice Date"
                  value={fmtDate(invoice?.invoice_date ?? null)}
                />
                {displayCustomerVat ? (
                  <InfoRow
                    icon={Percent}
                    label="Client VAT No."
                    value={displayCustomerVat}
                  />
                ) : null}
                {displayCustomerBrn ? (
                  <InfoRow
                    icon={Hash}
                    label="Client BRN No."
                    value={displayCustomerBrn}
                  />
                ) : null}
              </div>
            </div>
          </Surface>

          <Surface>
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold tracking-tight text-slate-950">
                    Invoice Items
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Full line breakdown
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                >
                  {items.length} line{items.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500">
                  Loading...
                </div>
              ) : !invoice ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500">
                  No invoice loaded.
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500">
                  No items found for this invoice.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((it, index) => (
                    <div
                      key={String(it.id)}
                      className="rounded-[20px] border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                            Item {index + 1}
                          </div>

                          <div className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-900">
                            {it.description}
                          </div>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-[#071b38] px-3 py-2 text-right">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                            Amount
                          </div>
                          <div className="mt-1 text-sm font-extrabold text-white">
                            {money(it.line_total)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Qty
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {n2(it.qty)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Unit Price
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {money(it.unit_price_excl_vat)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            VAT
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {money(it.vat_amount)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            VAT Rate
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {Math.round(n2(it.vat_rate) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Surface>
        </div>

        <div className="space-y-4">
          <Surface className="2xl:sticky 2xl:top-[88px]">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold tracking-tight text-slate-950">
                    Share & Delivery
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Public invoice view and real PDF
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  Public Secure
                </Badge>
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                <CompactActionButton
                  icon={ExternalLink}
                  label="Open Public"
                  onClick={openPublicInvoice}
                  disabled={!invoice || !hasId || creatingShare}
                  loading={creatingShare}
                  className="w-full justify-start"
                />

                <CompactActionButton
                  icon={Download}
                  label="Open PDF"
                  onClick={openPublicPdf}
                  disabled={!invoice || !hasId || creatingShare}
                  loading={creatingShare}
                  className="w-full justify-start"
                />

                <CompactActionButton
                  icon={MessageCircle}
                  label="WhatsApp"
                  onClick={sendWhatsappInvoice}
                  disabled={!invoice || !hasId || creatingShare}
                  loading={creatingShare}
                  className="w-full justify-start"
                />

                <CompactActionButton
                  icon={Mail}
                  label="Email"
                  onClick={sendEmailInvoice}
                  disabled={!invoice || !hasId || creatingShare}
                  loading={creatingShare}
                  className="w-full justify-start"
                />

                <CompactActionButton
                  icon={Copy}
                  label="Copy Link"
                  onClick={copyShareLink}
                  disabled={!invoice || !hasId || creatingShare || copyingShare}
                  loading={copyingShare}
                  className="w-full justify-start sm:col-span-2 2xl:col-span-1"
                />
              </div>

              {shareUrl ? (
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Current Share Link
                  </div>
                  <div className="mt-2 break-all text-xs font-medium text-slate-700">
                    {shareUrl}
                  </div>
                </div>
              ) : null}

              {invoice?.notes ? (
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Notes
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-700">
                    {invoice.notes}
                  </div>
                </div>
              ) : null}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}