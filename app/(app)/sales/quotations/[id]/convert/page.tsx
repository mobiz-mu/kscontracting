"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Calendar,
  Clock3,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  ReceiptText,
  Sparkles,
  RefreshCw,
  BadgeCheck,
  Percent,
  Hash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getErrorMessage } from "@/lib/utils";

type QuoteItem = {
  id: number | string;
  description: string;
  qty: number;
  unit_price_excl_vat?: number;
  vat_rate?: number;
  vat_amount?: number;
  line_total?: number;
};

type Quote = {
  id: string;
  quote_no?: string | null;
  quotation_no?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_vat?: string | null;
  customer_brn?: string | null;
  customer_address?: string | null;
  quote_date?: string | null;
  valid_until?: string | null;
  status?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  site_address?: string | null;
  converted_invoice_id?: string | null;
  items?: QuoteItem[];
};

function n2(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(v: unknown) {
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

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusTone(status?: string | null) {
  const s = String(status ?? "").toUpperCase();
  if (s === "ACCEPTED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "VOID") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
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

export default function ConvertQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [converting, setConverting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [invoiceDate, setInvoiceDate] = React.useState(todayISO());
  const [dueDate, setDueDate] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/quotations/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load quotation");
      }

      const q = json.data as Quote;
      setQuote(q);
      setInvoiceDate(todayISO());
      setDueDate(q?.valid_until || "");
      setLastSync(new Date());

      if (q?.converted_invoice_id) {
        router.replace(`/sales/invoices/${encodeURIComponent(q.converted_invoice_id)}`);
        return;
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load quotation"));
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!id) return;
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: load on mount/param change only
  }, [id]);

  async function doConvert() {
    try {
      if (!quote?.id) return;

      if (String(quote.status ?? "").toUpperCase() !== "ACCEPTED") {
        setError("Only accepted quotations can be converted to Pro Forma invoice.");
        return;
      }

      if (!quote.customer_id) {
        setError("This quotation is missing a linked customer and cannot be converted.");
        return;
      }

      setError("");
      setConverting(true);

      const res = await fetch(`/api/quotations/${encodeURIComponent(quote.id)}/convert`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoice_type: "PRO_FORMA",
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          issue_now: false,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message ?? json?.error ?? "Failed to convert quotation");
      }

      const invoiceId = String(json?.data?.invoice_id ?? "").trim();

      if (!invoiceId) {
        throw new Error("Pro Forma invoice created but invoice id is missing in response");
      }

      router.push(`/sales/invoices/${encodeURIComponent(invoiceId)}`);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to convert quotation"));
    } finally {
      setConverting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500">
        Loading quotation...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-8 text-sm text-rose-600">
        {error || "Quotation not found"}
      </div>
    );
  }

  const status = String(quote.status ?? "DRAFT").toUpperCase();
  const canConvert = status === "ACCEPTED" && !quote.converted_invoice_id;
  const busy = converting;

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
                  onClick={() => router.push(`/sales/quotations/${quote.id}`)}
                  className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                />

                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm",
                    statusTone(status)
                  )}
                >
                  {status}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                  <ReceiptText className="size-3.5 text-white/85" />
                  PRO FORMA ONLY
                </span>

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
                    Convert to Pro Forma Invoice
                  </h1>
                  <div className="mt-1 text-sm text-blue-50/90">
                    {quote.quote_no || quote.quotation_no || "—"} • {quote.customer_name || "—"}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 sm:mt-0">
                  <CompactActionButton
                    icon={RefreshCw}
                    label="Refresh"
                    onClick={() => void load()}
                    disabled={loading}
                    loading={loading}
                    className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  />

                  {quote.converted_invoice_id ? (
                    <CompactActionButton
                      icon={ArrowUpRight}
                      label="Open Invoice"
                      onClick={() =>
                        router.push(`/sales/invoices/${encodeURIComponent(quote.converted_invoice_id!)}`)
                      }
                      variant="solid"
                    />
                  ) : (
                    <CompactActionButton
                      icon={FileText}
                      label="Convert"
                      onClick={() => void doConvert()}
                      disabled={!canConvert || busy}
                      loading={busy}
                      variant="solid"
                    />
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-blue-50/85">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-100/80" />
                  Quote date {fmtDate(quote.quote_date)}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-100/80" />
                  Valid until {fmtDate(quote.valid_until)}
                </span>
              </div>

              {canConvert ? (
                <div className="mt-3 rounded-2xl border border-[#ffbe82]/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,231,204,0.12)_45%,rgba(255,155,61,0.16)_100%)] px-3 py-2.5 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/95">
                    <Sparkles className="size-3.5 text-[#ffd6ad]" />
                    <span className="font-semibold">Pro Forma conversion only.</span>
                    <span className="text-white/80">
                      This accepted quotation will create a Pro Forma invoice, not a VAT invoice.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {status !== "ACCEPTED" && !quote.converted_invoice_id ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This quotation must be accepted before it can be converted to a Pro Forma invoice.
            </div>
          ) : null}

          {error ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MiniStat icon={FileText} label="Subtotal" value={money(quote.subtotal)} />
        <MiniStat icon={Percent} label="VAT" value={money(quote.vat_amount)} />
        <MiniStat icon={ReceiptText} label="Total" value={money(quote.total_amount)} tone="navy" />
        <MiniStat
          icon={quote.converted_invoice_id ? ShieldCheck : CheckCircle2}
          label="State"
          value={quote.converted_invoice_id ? "Converted" : status}
          tone={quote.converted_invoice_id || status === "ACCEPTED" ? "emerald" : "slate"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Surface>
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold tracking-tight text-slate-950">
                    Customer Summary
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Client details that will carry into the Pro Forma invoice
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
              <div className="space-y-4">
                <InfoRow
                  icon={Building2}
                  label="Customer"
                  value={quote.customer_name || "—"}
                />
                <InfoRow
                  icon={Percent}
                  label="VAT No."
                  value={quote.customer_vat || "—"}
                />
                <InfoRow
                  icon={Hash}
                  label="BRN No."
                  value={quote.customer_brn || "—"}
                />
              </div>

              <div className="space-y-4">
                <InfoRow
                  icon={Building2}
                  label="Address"
                  value={quote.customer_address || "—"}
                />
                <InfoRow
                  icon={Building2}
                  label="Site Address"
                  value={quote.site_address || "—"}
                />
              </div>
            </div>
          </Surface>

          <Surface>
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold tracking-tight text-slate-950">
                    Quotation Items
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Items to be copied into the Pro Forma invoice
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {(quote.items ?? []).length} line{(quote.items ?? []).length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {(quote.items ?? []).length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500">
                  No items found for this quotation.
                </div>
              ) : (
                <div className="space-y-3">
                  {(quote.items ?? []).map((item, index) => (
                    <div
                      key={String(item.id)}
                      className="rounded-[20px] border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                            Item {index + 1}
                          </div>

                          <div className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-900">
                            {item.description}
                          </div>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-[#071b38] px-3 py-2 text-right">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                            Amount
                          </div>
                          <div className="mt-1 text-sm font-extrabold text-white">
                            {money(item.line_total)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Qty
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {n2(item.qty)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            Unit Price
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {money(item.unit_price_excl_vat)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            VAT
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {money(item.vat_amount)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            VAT Rate
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {Math.round(n2(item.vat_rate) * 100)}%
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
                    Pro Forma Setup
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Final settings before conversion
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  PFI
                </span>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  <Calendar className="size-4 text-slate-400" />
                  Pro Forma Date
                </label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-11 rounded-2xl"
                  disabled={busy || !canConvert}
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  <Clock3 className="size-4 text-slate-400" />
                  Reference Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-11 rounded-2xl"
                  disabled={busy || !canConvert}
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Important
                </div>
                <div className="mt-2 text-sm font-medium text-slate-700">
                  This conversion will create a <span className="font-bold">Pro Forma Invoice</span> only.
                  It should not be treated as a VAT invoice.
                </div>
              </div>

              <CompactActionButton
                icon={FileText}
                label={quote.converted_invoice_id ? "Already Converted" : "Convert to Pro Forma"}
                onClick={() => void doConvert()}
                disabled={!canConvert || busy || !!quote.converted_invoice_id}
                loading={busy}
                variant="solid"
                className="w-full justify-center"
              />
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}