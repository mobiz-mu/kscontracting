// components/ksdoc/InvoiceKSDoc.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type KSDocVariant = "invoice" | "credit_note" | "quotation";

export type KSInvoiceItem = {
  id?: string;
  description: string;
  qty?: number;
  unitPrice?: number; // unit price excl VAT (recommended)
  vatRate?: number; // 0.15
  vatAmount?: number; // line VAT
  lineTotal?: number; // line total incl VAT
  amount?: number; // backwards compat: if provided, used as lineTotal
};

export type KSInvoiceDocData = {
  company: {
    name: string;
    tagline?: string;
    logoSrc: string; // "/ks-logo.png" (place in /public)
    addressLines?: string[];
    metaRight?: string[];
  };

  doc?: {
    variant?: KSDocVariant; // optional: if not passed via prop
    title?: string; // override
    numberLabel?: string; // override label e.g. "Invoice No"
  };

  invoice: {
    id: string;
    number: string;
    status?: string;
    issueDate?: string;
    dueDate?: string;
  };

  billTo: {
    name: string;
    lines?: string[];
  };

  items?: KSInvoiceItem[];

  totals: {
    // new (optional)
    subtotal?: number;
    vat?: number;

    // existing required
    total: number;
    paid: number;
    balance: number;
  };

  notes?: string;
  paymentTerms?: string;

  // Optional future fields (safe to ignore if not used)
  referenceLines?: string[]; // e.g. PO No, Contract No
};

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusTone(s?: string) {
  const key = String(s || "").toUpperCase();
  if (key === "PAID") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (key === "ISSUED") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  if (key === "PARTIALLY_PAID") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  if (key === "VOID") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (key === "DRAFT") return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
}

function docMeta(variant: KSDocVariant) {
  if (variant === "credit_note") {
    return { title: "Credit Note", numberLabel: "Credit Note No" };
  }
  if (variant === "quotation") {
    return { title: "Quotation", numberLabel: "Quotation No" };
  }
  return { title: "Invoice", numberLabel: "Invoice No" };
}

function pct(v?: number) {
  const x = n2(v);
  return `${Math.round(x * 100)}%`;
}

export default function InvoiceKSDoc({
  data,
  variant = "invoice",
}: {
  data: KSInvoiceDocData;
  variant?: KSDocVariant;
}) {
  const v = (data.doc?.variant ?? variant) as KSDocVariant;
  const meta = docMeta(v);

  const title = data.doc?.title ?? meta.title;
  const numberLabel = data.doc?.numberLabel ?? meta.numberLabel;

  const items = data.items ?? [];
  const hasItems = items.length > 0;

  // Totals
  const subtotal = n2(data.totals.subtotal);
  const vat = n2(data.totals.vat);
  const total = n2(data.totals.total);
  const paid = n2(data.totals.paid);
  const balance = n2(data.totals.balance);

  // Column detection (enterprise)
  const showVatCols = React.useMemo(() => {
    return items.some((it) => Number.isFinite(Number(it.vatRate)) || Number.isFinite(Number(it.vatAmount)));
  }, [items]);

  const showUnitPrice = true;
  const showQty = true;

  return (
    <>
      {/* Print + A4 setup */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        html,
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      {/* A4 canvas */}
      <div
        className={cn(
          "mx-auto w-full max-w-[900px]",
          "rounded-[28px] bg-white ring-1 ring-slate-200/80",
          "shadow-[0_1px_0_rgba(15,23,42,0.08),0_26px_70px_rgba(15,23,42,0.12)]",
          "print:shadow-none print:ring-0 print:rounded-none"
        )}
      >
        {/* Premium top band */}
        <div className="relative overflow-hidden rounded-t-[28px] border-b border-slate-200 print:rounded-none">
          <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_15%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
          <div className="relative px-8 py-7">
            <div className="flex items-start justify-between gap-6">
              {/* Company */}
              <div className="flex items-start gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-slate-200 bg-white">
                  <Image
                    src={data.company.logoSrc}
                    alt={`${data.company.name} logo`}
                    fill
                    className="object-contain p-2"
                    priority
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-xl font-extrabold tracking-tight text-slate-900">
                    {data.company.name}
                  </div>
                  {data.company.tagline ? (
                    <div className="mt-0.5 text-sm font-semibold text-slate-600">{data.company.tagline}</div>
                  ) : null}

                  <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                    {(data.company.addressLines ?? []).map((x, i) => (
                      <div key={i}>{x}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Document meta */}
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-semibold text-slate-500">{title.toUpperCase()}</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
                  {data.invoice.number}
                </div>

                <div className="mt-2 inline-flex items-center justify-end gap-2">
                  {data.invoice.status ? (
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        statusTone(data.invoice.status)
                      )}
                    >
                      {String(data.invoice.status).replaceAll("_", " ")}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">{numberLabel}:</span>{" "}
                    <span className="text-slate-900">{data.invoice.number || "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Issue:</span>{" "}
                    <span className="text-slate-900">{data.invoice.issueDate || "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Due:</span>{" "}
                    <span className="text-slate-900">{data.invoice.dueDate || "—"}</span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                  {(data.company.metaRight ?? []).map((x, i) => (
                    <div key={i}>{x}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          {/* Bill to + totals strip */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
            <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">BILL TO</div>
              <div className="mt-2 text-lg font-extrabold text-slate-900">{data.billTo.name}</div>
              <div className="mt-2 text-sm text-slate-700 space-y-1">
                {(data.billTo.lines ?? []).length ? (
                  (data.billTo.lines ?? []).map((x, i) => <div key={i}>{x}</div>)
                ) : (
                  <div className="text-slate-500">—</div>
                )}
              </div>

              {(data.referenceLines ?? []).length ? (
                <div className="mt-4 rounded-2xl bg-white/70 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">REFERENCE</div>
                  <div className="mt-1 text-xs text-slate-700 space-y-0.5">
                    {data.referenceLines!.map((x, i) => (
                      <div key={i}>{x}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_14px_30px_rgba(15,23,42,0.06)] print:shadow-none">
              <div className="flex items-start justify-between">
                <div className="text-xs font-semibold text-slate-500">AMOUNT SUMMARY</div>
                <span className="rounded-full bg-[#ff7a18]/12 px-3 py-1 text-xs font-semibold text-[#c25708] ring-1 ring-[#ff7a18]/22">
                  MUR
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {Number.isFinite(subtotal) && subtotal > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold text-slate-900">{money(subtotal)}</span>
                  </div>
                ) : null}

                {Number.isFinite(vat) && vat > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">VAT</span>
                    <span className="font-semibold text-slate-900">{money(vat)}</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total</span>
                  <span className="font-extrabold text-slate-900">{money(total)}</span>
                </div>

                {/* For quotation / credit note, you may not want paid/balance.
                   We keep it but it will show Rs 0.00 if not relevant */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Paid</span>
                  <span className="font-semibold text-slate-900">{money(paid)}</span>
                </div>

                <div className="h-px bg-slate-200" />

                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">Balance Due</span>
                  <span className="text-lg font-extrabold text-slate-900">{money(balance)}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#071b38]/5 p-3 ring-1 ring-[#071b38]/10">
                <div className="text-xs font-semibold text-slate-700">Reference</div>
                <div className="mt-1 text-xs text-slate-600">
                  Please use <span className="font-semibold text-slate-900">{data.invoice.number}</span> as payment reference.
                </div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="mt-6 overflow-hidden rounded-3xl ring-1 ring-slate-200">
            <div className="h-2 bg-[#071b38]" />

            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th>Description</th>
                  {showQty ? <th className="w-[90px] text-right">Qty</th> : null}
                  {showUnitPrice ? <th className="w-[140px] text-right">Unit Price</th> : null}
                  {showVatCols ? <th className="w-[110px] text-right">VAT</th> : null}
                  <th className="w-[160px] text-right">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!hasItems ? (
                  <tr>
                    <td
                      colSpan={2 + (showQty ? 1 : 0) + (showUnitPrice ? 1 : 0) + (showVatCols ? 1 : 0)}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No line items.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const qty = Number.isFinite(Number(it.qty)) ? n2(it.qty) : null;
                    const unit = Number.isFinite(Number(it.unitPrice)) ? n2(it.unitPrice) : null;
                    const vAmt =
                      Number.isFinite(Number(it.vatAmount)) ? n2(it.vatAmount) : null;

                    const line =
                      Number.isFinite(Number(it.lineTotal))
                        ? n2(it.lineTotal)
                        : Number.isFinite(Number(it.amount))
                        ? n2(it.amount)
                        : qty != null && unit != null
                        ? qty * unit
                        : 0;

                    return (
                      <tr key={it.id ?? String(idx)} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{it.description}</div>
                        </td>

                        {showQty ? (
                          <td className="px-4 py-3 text-right text-slate-700">{qty ?? "—"}</td>
                        ) : null}

                        {showUnitPrice ? (
                          <td className="px-4 py-3 text-right text-slate-700">
                            {unit != null ? money(unit) : "—"}
                          </td>
                        ) : null}

                        {showVatCols ? (
                          <td className="px-4 py-3 text-right text-slate-700">
                            {vAmt != null ? (
                              <>
                                <div className="font-semibold text-slate-800">{money(vAmt)}</div>
                                {Number.isFinite(Number(it.vatRate)) ? (
                                  <div className="text-[11px] text-slate-500">{pct(it.vatRate)}</div>
                                ) : null}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                        ) : null}

                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {money(line)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Notes + terms */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">NOTES</div>
              <div className="mt-2 text-sm text-slate-700 leading-relaxed">
                {data.notes || "—"}
              </div>
            </div>

            <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">PAYMENT TERMS</div>
              <div className="mt-2 text-sm text-slate-700 leading-relaxed">
                {data.paymentTerms || "—"}
              </div>
            </div>
          </div>

          {/* Signature / authorization block (enterprise) */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">AUTHORIZED SIGNATURE</div>
              <div className="mt-7 h-px bg-slate-200" />
              <div className="mt-2 text-xs text-slate-600">Name & Signature</div>
            </div>

            <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">CUSTOMER ACKNOWLEDGEMENT</div>
              <div className="mt-7 h-px bg-slate-200" />
              <div className="mt-2 text-xs text-slate-600">Name, Signature & Date</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <div className="text-xs text-slate-500">Generated by KS Accounting Suite</div>
            <div className="text-xs font-semibold text-slate-600">{data.company.name}</div>
          </div>
        </div>
      </div>
    </>
  );
}