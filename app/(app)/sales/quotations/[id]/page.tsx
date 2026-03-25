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
} from "lucide-react";

import { Button } from "@/components/ui/button";

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
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (s === "VOID") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
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
  const canAccept = status === "DRAFT";
  const canConvert = status === "ACCEPTED" && !quote.converted_invoice_id;
  const alreadyConverted = !!quote.converted_invoice_id;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.12),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.12),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/sales/quotations"
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft size={16} />
                Back to quotations
              </Link>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Quotation Details
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                  <FileText className="size-3.5 text-slate-500" />
                  {quote.quote_no || quote.quotation_no || "—"}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ring-1 ${statusClasses(status)}`}
                >
                  <CheckCircle2 className="size-3.5" />
                  {status}
                </span>

                {alreadyConverted ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 ring-1 ring-blue-200">
                    <ArrowUpRight className="size-3.5" />
                    Converted
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/sales/quotations/${encodeURIComponent(quote.id)}/print`}>
                <Button variant="outline" className="rounded-2xl">
                  <Printer className="mr-2 size-4" />
                  Print Quotation
                </Button>
              </Link>

              {canAccept ? (
                <Button
                  className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => void acceptQuote()}
                  disabled={accepting}
                >
                  {accepting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 size-4" />
                  )}
                  Accept Quote
                </Button>
              ) : null}

              {canConvert ? (
                <Link href={`/sales/quotations/${encodeURIComponent(quote.id)}/convert`}>
                  <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]">
                    <FileText className="mr-2 size-4" />
                    Convert to Invoice
                  </Button>
                </Link>
              ) : null}

              {alreadyConverted ? (
                <Link href={`/sales/invoices/${encodeURIComponent(String(quote.converted_invoice_id))}`}>
                  <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]">
                    <ArrowUpRight className="mr-2 size-4" />
                    Open Invoice
                  </Button>
                </Link>
              ) : null}

              {status !== "VOID" ? (
                <Button
                  variant="outline"
                  className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => void voidQuote()}
                  disabled={voiding}
                >
                  {voiding ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 size-4" />
                  )}
                  Void Quote
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {status === "DRAFT" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This document is still a quotation. It will remain a quote until you accept it. Only accepted quotations can be converted to invoice.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.05),0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold text-slate-500">Customer</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">
              {quote.customer_name || "—"}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">VAT No.</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {quote.customer_vat || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">BRN No.</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {quote.customer_brn || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:col-span-2">
                <div className="text-xs text-slate-500">Address</div>
                <div className="mt-1 whitespace-pre-wrap font-semibold text-slate-900">
                  {quote.customer_address || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:col-span-2">
                <div className="text-xs text-slate-500">Site Address</div>
                <div className="mt-1 whitespace-pre-wrap font-semibold text-slate-900">
                  {quote.site_address || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.05),0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-extrabold text-slate-900">
                Quotation Items
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {(quote.items ?? []).length} item(s)
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:grid">
                <div className="col-span-7">Description</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="divide-y divide-slate-200 bg-white">
                {(quote.items ?? []).map((item) => (
                  <div key={String(item.id)} className="px-4 py-4">
                    <div className="grid gap-3 md:grid-cols-12 md:items-start">
                      <div className="md:col-span-7">
                        <div className="whitespace-pre-wrap text-sm font-medium text-slate-900">
                          {item.description}
                        </div>
                      </div>

                      <div className="text-sm text-slate-700 md:col-span-1 md:text-right">
                        <span className="text-slate-500 md:hidden">Qty: </span>
                        {n2(item.qty)}
                      </div>

                      <div className="text-sm text-slate-700 md:col-span-2 md:text-right">
                        <span className="text-slate-500 md:hidden">Price: </span>
                        {money(item.unit_price_excl_vat)}
                      </div>

                      <div className="text-sm font-extrabold text-slate-900 md:col-span-2 md:text-right">
                        <span className="text-slate-500 md:hidden">Total: </span>
                        {money(item.line_total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {quote.notes ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">Notes</div>
                <div className="mt-1 whitespace-pre-wrap font-semibold text-slate-900">
                  {quote.notes}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.05),0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-base font-extrabold text-slate-900">
              Quotation Summary
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Calendar className="size-4 text-slate-400" />
                  Quotation Date
                </div>
                <div className="font-semibold text-slate-900">
                  {fmtDate(quote.quote_date)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Calendar className="size-4 text-slate-400" />
                  Valid Until
                </div>
                <div className="font-semibold text-slate-900">
                  {fmtDate(quote.valid_until)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">Status</div>
                <div className="mt-1 font-semibold text-slate-900">{status}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.05),0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Building2 className="size-4 text-slate-400" />
              Totals
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900">
                  {money(quote.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">VAT</span>
                <span className="font-semibold text-slate-900">
                  {money(quote.vat_amount)}
                </span>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="flex items-center justify-between text-lg font-extrabold">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">
                  {money(quote.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}