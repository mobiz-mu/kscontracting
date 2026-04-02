"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Calendar,
  Building2,
  ArrowUpRight,
  Printer,
  XCircle,
  PencilLine,
  Sparkles,
  RefreshCw,
  ReceiptText,
  Clock3,
  BadgeCheck,
  Percent,
  MapPin,
  Hash,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  notes?: string | null;
  items?: QuoteItem[];
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

function statusClasses(status?: string | null) {
  const s = String(status ?? "").toUpperCase();

  if (s === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s === "VOID") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (s === "DRAFT") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }

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

export default function QuotationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState(false);
  const [voiding, setVoiding] = React.useState(false);
  const [error, setError] = React.useState("");
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/quotations/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load quotation");
      }

      setQuote((json.data ?? null) as Quote);
      setLastSync(new Date());
    } catch (e: any) {
      setError(e?.message || "Failed to load quotation");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!id) return;
    void load();
  }, [id]);

  async function acceptQuote() {
    try {
      if (!quote?.id) return;

      setAccepting(true);
      setError("");

      const res = await fetch(`/api/quotations/${encodeURIComponent(quote.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "ACCEPTED",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to accept quotation");
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to accept quotation");
    } finally {
      setAccepting(false);
    }
  }

  async function voidQuote() {
    try {
      if (!quote?.id) return;

      const ok = window.confirm("Are you sure you want to void this quotation?");
      if (!ok) return;

      setVoiding(true);
      setError("");

      const res = await fetch(`/api/quotations/${encodeURIComponent(quote.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "VOID",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to void quotation");
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to void quotation");
    } finally {
      setVoiding(false);
    }
  }

  function goToEditDraft() {
    if (!quote?.id) return;
    router.push(`/sales/quotations/new?edit=${encodeURIComponent(quote.id)}`);
  }

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading quotation...</div>;
  }

  if (!quote) {
    return (
      <div className="p-8 text-sm text-rose-600">
        {error || "Quotation not found"}
      </div>
    );
  }

  const status = String(quote.status ?? "DRAFT").toUpperCase();
  const canAccept = status === "DRAFT";
  const canEdit = status === "DRAFT";
  const canConvert = status === "ACCEPTED" && !quote.converted_invoice_id;
  const alreadyConverted = !!quote.converted_invoice_id;

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
                  onClick={() => router.push("/sales/quotations")}
                  className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                />

                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm",
                    statusClasses(status)
                  )}
                >
                  {status}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
                  <ReceiptText className="size-3.5 text-white/85" />
                  QUOTATION
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
                    {quote.quote_no || quote.quotation_no || "Quotation Details"}
                  </h1>
                  <div className="mt-1 text-sm text-blue-50/90">
                    {quote.customer_name || "—"}
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

                  <CompactActionButton
                    icon={Printer}
                    label="Print"
                    onClick={() =>
                      window.open(
                        `/sales/quotations/${encodeURIComponent(quote.id)}/print`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
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

                  {canAccept ? (
                    <CompactActionButton
                      icon={CheckCircle2}
                      label="Accept"
                      onClick={() => void acceptQuote()}
                      disabled={accepting}
                      loading={accepting}
                      variant="solid"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    />
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-blue-50/85">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-100/80" />
                  {fmtDate(quote.quote_date)}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-100/80" />
                  Valid until {fmtDate(quote.valid_until)}
                </span>

                {quote.site_address ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-blue-100/80" />
                    {quote.site_address}
                  </span>
                ) : null}
              </div>

              {canEdit ? (
                <div className="mt-3 rounded-2xl border border-[#ffbe82]/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,231,204,0.12)_45%,rgba(255,155,61,0.16)_100%)] px-3 py-2.5 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/95">
                    <Sparkles className="size-3.5 text-[#ffd6ad]" />
                    <span className="font-semibold">Draft quotation.</span>
                    <span className="text-white/80">
                      You can still edit customer details, site address, items and notes before accepting.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

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
          icon={alreadyConverted ? ArrowUpRight : status === "ACCEPTED" ? CheckCircle2 : XCircle}
          label="State"
          value={alreadyConverted ? "Converted" : status}
          tone={alreadyConverted || status === "ACCEPTED" ? "emerald" : canEdit ? "orange" : "slate"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Surface>
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold tracking-tight text-slate-950">
                    Quotation Summary
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Compact executive client and commercial overview
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    Items {(quote.items ?? []).length}
                  </span>
                  {alreadyConverted ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Converted
                    </span>
                  ) : null}
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
                  icon={MapPin}
                  label="Customer Address"
                  value={quote.customer_address || "—"}
                />
                {quote.site_address ? (
                  <InfoRow
                    icon={MapPin}
                    label="Site Address"
                    value={quote.site_address}
                  />
                ) : null}
              </div>

              <div className="space-y-4">
                <InfoRow
                  icon={Calendar}
                  label="Quotation Date"
                  value={fmtDate(quote.quote_date)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Valid Until"
                  value={fmtDate(quote.valid_until)}
                />
                {quote.customer_vat ? (
                  <InfoRow
                    icon={Percent}
                    label="Client VAT No."
                    value={quote.customer_vat}
                  />
                ) : null}
                {quote.customer_brn ? (
                  <InfoRow
                    icon={Hash}
                    label="Client BRN No."
                    value={quote.customer_brn}
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
                    Quotation Items
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Full line breakdown
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

              {quote.notes ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Notes
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-700">
                    {quote.notes}
                  </div>
                </div>
              ) : null}
            </div>
          </Surface>
        </div>

        <div className="space-y-4">
          <Surface className="2xl:sticky 2xl:top-[88px]">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold tracking-tight text-slate-950">
                    Actions
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Compact quotation workflow controls
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {status}
                </span>
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                {canEdit ? (
                  <CompactActionButton
                    icon={PencilLine}
                    label="Edit Draft"
                    onClick={goToEditDraft}
                    className="w-full justify-start"
                  />
                ) : null}

                {canAccept ? (
                  <CompactActionButton
                    icon={CheckCircle2}
                    label="Accept Quote"
                    onClick={() => void acceptQuote()}
                    disabled={accepting}
                    loading={accepting}
                    variant="solid"
                    className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"
                  />
                ) : null}

                {canConvert ? (
                  <CompactActionButton
                    icon={Send}
                    label="Convert to Invoice"
                    onClick={() =>
                      router.push(`/sales/quotations/${encodeURIComponent(quote.id)}/convert`)
                    }
                    variant="solid"
                    className="w-full justify-start"
                  />
                ) : null}

                {alreadyConverted ? (
                  <CompactActionButton
                    icon={ArrowUpRight}
                    label="Open Invoice"
                    onClick={() =>
                      router.push(
                        `/sales/invoices/${encodeURIComponent(
                          String(quote.converted_invoice_id)
                        )}`
                      )
                    }
                    variant="solid"
                    className="w-full justify-start"
                  />
                ) : null}

                {status !== "VOID" ? (
                  <CompactActionButton
                    icon={XCircle}
                    label="Void Quote"
                    onClick={() => void voidQuote()}
                    disabled={voiding}
                    loading={voiding}
                    className="w-full justify-start border-rose-200 text-rose-700 hover:bg-rose-50"
                  />
                ) : null}
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}