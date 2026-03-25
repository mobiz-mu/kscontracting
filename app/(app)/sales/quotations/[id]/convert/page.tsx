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
  Clock3,
  Building2,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusTone(status?: string | null) {
  const s = String(status ?? "").toUpperCase();
  if (s === "ACCEPTED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "VOID") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export default function ConvertQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [converting, setConverting] = React.useState(false);
  const [error, setError] = React.useState("");

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

      if (q?.converted_invoice_id) {
        router.replace(`/sales/invoices/${encodeURIComponent(q.converted_invoice_id)}`);
        return;
      }
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

  async function doConvert() {
    try {
      if (!quote?.id) return;

      if (String(quote.status ?? "").toUpperCase() !== "ACCEPTED") {
        setError("Only accepted quotations can be converted to invoice.");
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
          invoice_type: "VAT_INVOICE",
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
        throw new Error("Invoice created but invoice id missing in response");
      }

      router.push(`/sales/invoices/${encodeURIComponent(invoiceId)}`);
    } catch (e: any) {
      setError(e?.message || "Failed to convert quotation");
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
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.12),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.12),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href={`/sales/quotations/${quote.id}`}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft size={16} />
                Back to quotation
              </Link>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Convert Quote to Invoice
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                  <FileText className="size-3.5 text-slate-500" />
                  {quote.quote_no || quote.quotation_no || "—"}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ring-1 ${statusTone(status)}`}
                >
                  <CheckCircle2 className="size-3.5" />
                  {status}
                </span>

                {quote.converted_invoice_id ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 ring-1 ring-blue-200">
                    <ShieldCheck className="size-3.5" />
                    Already Converted
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {quote.converted_invoice_id ? (
                <Link href={`/sales/invoices/${encodeURIComponent(quote.converted_invoice_id)}`}>
                  <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]">
                    <ArrowUpRight className="mr-2 size-4" />
                    Open Invoice
                  </Button>
                </Link>
              ) : (
                <Button
                  className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
                  onClick={() => void doConvert()}
                  disabled={!canConvert || busy}
                >
                  {converting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 size-4" />
                  )}
                  Convert to Invoice
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {status !== "ACCEPTED" && !quote.converted_invoice_id ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This quotation is still a quote. Accept the quotation first, then the system will allow conversion to invoice.
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
                <div className="mt-1 font-semibold text-slate-900">{quote.customer_vat || "—"}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">BRN No.</div>
                <div className="mt-1 font-semibold text-slate-900">{quote.customer_brn || "—"}</div>
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
              <div className="text-base font-extrabold text-slate-900">Quotation Items</div>
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
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.05),0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-base font-extrabold text-slate-900">Invoice Setup</div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Calendar className="size-4 text-slate-400" />
                  Invoice Date
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
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Clock3 className="size-4 text-slate-400" />
                  Due Date
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
                <div className="text-xs text-slate-500">Quotation Date</div>
                <div className="mt-1 font-semibold text-slate-900">{fmtDate(quote.quote_date)}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">Valid Until</div>
                <div className="mt-1 font-semibold text-slate-900">{fmtDate(quote.valid_until)}</div>
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
                <span className="font-semibold text-slate-900">{money(quote.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">VAT</span>
                <span className="font-semibold text-slate-900">{money(quote.vat_amount)}</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between text-lg font-extrabold">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">{money(quote.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}