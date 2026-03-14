"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type KSDocVariant = "invoice" | "credit_note" | "quotation";

export type KSInvoiceItem = {
  id?: string;
  description: string;
  qty?: number;
  unitPrice?: number;
  vatRate?: number;
  vatAmount?: number;
  lineTotal?: number;
  amount?: number;
};

export type KSInvoiceDocData = {
  company: {
    name: string;
    tagline?: string;
    logoSrc: string;
    stampSrc?: string;
    signatureSrc?: string;
    addressLines?: string[];
    metaRight?: string[];
  };

  doc?: {
    variant?: KSDocVariant;
    title?: string;
    numberLabel?: string;
    currency?: "MUR";
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
    subtotal?: number;
    vat?: number;
    total: number;
    paid: number;
    balance: number;
  };

  notes?: string;
  paymentTerms?: string;
  referenceLines?: string[];
};

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getFieldValue(lines: string[] | undefined, label: string) {
  const found = (lines ?? []).find((x) =>
    x.toLowerCase().startsWith(label.toLowerCase())
  );
  if (!found) return "";
  const idx = found.indexOf(":");
  return idx >= 0 ? found.slice(idx + 1).trim() : found.trim();
}

export default function InvoiceKSDoc({
  data,
  variant = "invoice",
}: {
  data: KSInvoiceDocData;
  variant?: KSDocVariant;
}) {
  const _variant = data.doc?.variant ?? variant;

  const title =
    data.doc?.title ??
    (_variant === "quotation"
      ? "QUOTATION"
      : _variant === "credit_note"
      ? "CREDIT NOTE"
      : "VAT INVOICE");

  const numberLabel = data.doc?.numberLabel ?? "No.";
  const items = data.items ?? [];

  const subtotal = n2(data.totals.subtotal);
  const vat = n2(data.totals.vat);
  const total = n2(data.totals.total);

  const clientVat = getFieldValue(data.billTo.lines, "Client VAT Reg. No.");
  const clientBrn = getFieldValue(data.billTo.lines, "Client BRN No.");
  const siteAddress = getFieldValue(data.billTo.lines, "Site Address");

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        html,
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #ffffff;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .ks-a4-wrap {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
          }

          .ks-page-shell {
            padding: 0 !important;
            margin: 0 !important;
          }

          .ks-invoice-card {
            border: 0.6mm solid #111 !important;
          }
        }
      `}</style>

      <div className="ks-a4-wrap mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white text-black">
        <div className="ks-page-shell px-[6mm] py-[6mm]">
          <div className="ks-invoice-card border-[1.6px] border-black bg-white">
            {/* Header */}
            <div className="px-8 pb-0 pt-7">
              <div className="grid grid-cols-[128px_1fr] items-center gap-6">
                <div className="flex items-center justify-center">
                  <div className="relative h-[96px] w-[116px]">
                    <Image
                      src={data.company.logoSrc}
                      alt={`${data.company.name} logo`}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>

                <div className="pr-10 text-center">
                  <div className="text-[22px] font-extrabold tracking-tight">
                    {data.company.name}
                  </div>

                  <div className="mt-2 space-y-0.5 text-[12.5px] leading-[1.45]">
                    {(data.company.addressLines ?? []).map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title band */}
              <div className="mt-6 border-b-[2px] border-t-[2px] border-black py-5">
                <div className="grid grid-cols-[1fr_auto] items-center">
                  <div className="pl-[120px] text-center text-[19px] font-extrabold tracking-[0.04em]">
                    {title}
                  </div>
                  <div className="text-[16px] font-extrabold">
                    {numberLabel} {data.invoice.number || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Client info */}
            <div className="px-8 pb-5 pt-6 text-[13.5px]">
              <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                <div>
                  <span className="font-extrabold">Name:</span>{" "}
                  {data.billTo.name || "—"}
                </div>
                <div>
                  <span className="font-extrabold">Date:</span>{" "}
                  {data.invoice.issueDate || "—"}
                </div>

                <div>
                  <span className="font-extrabold">Client&apos;s VAT Reg. No.:</span>{" "}
                  {clientVat || "—"}
                </div>
                <div>
                  <span className="font-extrabold">Client&apos;s BRN No.:</span>{" "}
                  {clientBrn || "—"}
                </div>

                <div className="col-span-2">
                  <span className="font-extrabold">Site Address:</span>{" "}
                  {siteAddress || "—"}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="px-8">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b-[2px] border-t-[2px] border-black">
                    <th className="w-[110px] border-r-[2px] border-black px-4 py-4 text-left font-extrabold">
                      Qty.
                    </th>
                    <th className="border-r-[2px] border-black px-4 py-4 text-left font-extrabold">
                      DESCRIPTION
                    </th>
                    <th className="w-[230px] px-4 py-4 text-right font-extrabold">
                      AMOUNT
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td className="h-[340px] border-r-[2px] border-black px-4 py-5 align-top">
                        —
                      </td>
                      <td className="h-[340px] border-r-[2px] border-black px-4 py-5 align-top">
                        No items
                      </td>
                      <td className="h-[340px] px-4 py-5 text-right align-top">
                        {money(0)}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {items.map((it, idx) => {
                        const qty = n2(it.qty);
                        const line =
                          Number.isFinite(Number(it.lineTotal))
                            ? n2(it.lineTotal)
                            : Number.isFinite(Number(it.amount))
                            ? n2(it.amount)
                            : qty * n2(it.unitPrice) + n2(it.vatAmount);

                        const isLast = idx === items.length - 1;

                        return (
                          <tr key={it.id ?? String(idx)}>
                            <td
                              className={cn(
                                "border-r-[2px] border-black px-4 py-5 align-top text-[14px]",
                                isLast && "h-[340px]"
                              )}
                            >
                              {qty || "—"}
                            </td>
                            <td
                              className={cn(
                                "border-r-[2px] border-black px-4 py-5 align-top whitespace-pre-wrap break-words text-[14px] leading-7",
                                isLast && "h-[340px]"
                              )}
                            >
                              {it.description || "—"}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-5 text-right text-[14px] font-extrabold align-top",
                                isLast && "h-[340px]"
                              )}
                            >
                              {money(line)}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom section */}
            <div className="px-8 pb-8 pt-6">
              <div className="grid grid-cols-[1fr_360px] gap-8">
                {/* left */}
                <div className="relative min-h-[190px]">
                  <div className="text-[13.5px] font-extrabold">
                    For {data.company.name}
                  </div>

                  {data.company.signatureSrc ? (
                    <div className="mt-8">
                      <div className="relative h-[76px] w-[190px]">
                        <Image
                          src={data.company.signatureSrc}
                          alt="Digital signature"
                          fill
                          className="object-contain object-left"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 w-[220px] border-t-[1.6px] border-black pt-2 text-[12px]">
                    Authorised Signature
                  </div>

                  {data.company.stampSrc ? (
                    <div className="absolute bottom-0 left-[180px]">
                      <div className="relative h-[110px] w-[110px] opacity-95">
                        <Image
                          src={data.company.stampSrc}
                          alt="KS stamp"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-10 text-[12px] leading-6">
                    <div className="font-extrabold">Bank Details:</div>
                    <div>{data.notes || "MCB 000446509687"}</div>
                  </div>
                </div>

                {/* right totals */}
                <div className="self-end border-[2px] border-black">
                  <div className="grid grid-cols-[1fr_1fr] text-[13.5px]">
                    <div className="border-b-[1.6px] border-black px-5 py-4 font-extrabold">
                      Sub Total
                    </div>
                    <div className="border-b-[1.6px] border-black px-5 py-4 text-right">
                      {money(subtotal)}
                    </div>

                    <div className="border-b-[1.6px] border-black px-5 py-4 font-extrabold">
                      VAT 15%
                    </div>
                    <div className="border-b-[1.6px] border-black px-5 py-4 text-right">
                      {money(vat)}
                    </div>

                    <div className="px-5 py-5 text-[18px] font-extrabold">TOTAL</div>
                    <div className="px-5 py-5 text-right text-[18px] font-extrabold">
                      {money(total)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(data.paymentTerms || data.referenceLines?.length) && (
            <div className="mt-3 text-[11px] text-slate-700">
              {data.paymentTerms ? (
                <div>
                  <span className="font-semibold">Terms:</span> {data.paymentTerms}
                </div>
              ) : null}
              {data.referenceLines?.length ? (
                <div className="mt-1">
                  <span className="font-semibold">Reference:</span>{" "}
                  {data.referenceLines.join(" • ")}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}