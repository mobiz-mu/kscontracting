"use client";

import * as React from "react";
import Image from "next/image";

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
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "";
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

export default function InvoiceKSDoc({
  data,
  variant = "invoice",
}: {
  data: KSInvoiceDocData;
  variant?: KSDocVariant;
}) {
  const currentVariant = data.doc?.variant ?? variant;

  const title =
    data.doc?.title ??
    (currentVariant === "quotation"
      ? "QUOTATION"
      : currentVariant === "credit_note"
      ? "CREDIT NOTE"
      : "VAT INVOICE");

  const items = data.items ?? [];
  const subtotal = n2(data.totals.subtotal);
  const vat = n2(data.totals.vat);
  const total = n2(data.totals.total);

  const issueDate = fmtDate(data.invoice.issueDate || "");

  const minRows =
    currentVariant === "credit_note"
      ? 4
      : currentVariant === "quotation"
      ? 5
      : 5;

  const rowsToRender = Math.max(items.length, minRows);
  const paddedRows = Array.from({ length: rowsToRender }, (_, i) => items[i] ?? null);

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .ks-doc-root {
          font-family: "Times New Roman", Times, serif;
          color: #000000;
          background: #ffffff;
        }

        .ks-doc-root .ks-desc-font {
          font-family: Poppins, "Segoe UI", Arial, sans-serif;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .ks-doc-root {
            width: 194mm !important;
            max-width: 194mm !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table,
          tr,
          td,
          th {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="ks-doc-root mx-auto w-[194mm] max-w-[194mm] bg-white text-black">
        <div className="grid grid-cols-[68mm_1fr] items-start gap-[5mm]">
          <div className="flex items-start justify-start">
            <div className="relative h-[46mm] w-[64mm]">
              <Image
                src={data.company.logoSrc}
                alt={`${data.company.name} logo`}
                fill
                sizes="242px"
                className="object-contain object-left-top"
                priority
              />
            </div>
          </div>

          <div className="pt-[1mm] text-center">
            <div className="text-[8.2mm] font-black uppercase leading-[0.95] tracking-[0.01em] text-black">
              {data.company.name}
            </div>

            <div className="mt-[2mm] space-y-[0.7mm] text-[3.6mm] leading-[1.2] text-black">
              {(data.company.addressLines?.length
                ? data.company.addressLines
                : ["MORCELLEMENT CARLOS, TAMARIN"]
              ).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            <div className="mt-[3mm] grid grid-cols-[1fr_auto] items-center">
              <div className="pl-[5mm] text-center text-[6.5mm] font-black uppercase leading-none tracking-[0.02em] text-black">
                {title}
              </div>

              <div className="pr-[1mm] text-right text-[4.5mm] font-black leading-none text-[#de7a32]">
                No. {data.invoice.number || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[3mm]">
          <table className="w-full border-collapse text-black">
            <thead>
              <tr className="bg-[#f36a24]">
                <th className="border border-black px-[2.4mm] py-[2.3mm] text-center text-[3.9mm] font-black">
                  Date
                </th>
                <th className="border border-black px-[2.4mm] py-[2.3mm] text-center text-[3.9mm] font-black">
                  Item Description
                </th>
                <th className="border border-black px-[2.4mm] py-[2.3mm] text-center text-[3.9mm] font-black">
                  Price
                </th>
                <th className="border border-black px-[2.4mm] py-[2.3mm] text-center text-[3.9mm] font-black">
                  Qty
                </th>
                <th className="border border-black px-[2.4mm] py-[2.3mm] text-center text-[3.9mm] font-black">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {paddedRows.map((it, idx) => {
                const qty = it ? n2(it.qty) : 0;
                const unitPrice = it ? n2(it.unitPrice) : 0;
                const lineTotal =
                  it && Number.isFinite(Number(it.lineTotal))
                    ? n2(it.lineTotal)
                    : it && Number.isFinite(Number(it.amount))
                    ? n2(it.amount)
                    : qty * unitPrice;

                return (
                  <tr key={it?.id ?? `empty-${idx}`}>
                    <td className="h-[8mm] border border-black px-[2mm] py-[1.7mm] align-top text-[3mm]">
                      {it ? issueDate : ""}
                    </td>
                    <td className="ks-desc-font h-[8mm] border border-black px-[2.3mm] py-[1.7mm] align-top text-[2.95mm] leading-[1.25]">
                      {it?.description || ""}
                    </td>
                    <td className="h-[8mm] border border-black px-[2mm] py-[1.7mm] text-right align-top text-[3mm]">
                      {it ? money(unitPrice) : ""}
                    </td>
                    <td className="h-[8mm] border border-black px-[2mm] py-[1.7mm] text-center align-top text-[3mm]">
                      {it ? qty : ""}
                    </td>
                    <td className="h-[8mm] border border-black px-[2mm] py-[1.7mm] text-right align-top text-[3mm] font-bold">
                      {it ? money(lineTotal) : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-[3mm] grid grid-cols-[1fr_76mm] gap-[6mm]">
          <div>
            <div className="text-[4.5mm] font-black text-[#de7a32]">Bank Details :</div>

            <div className="mt-[3mm] space-y-[1.8mm] text-[3.8mm] leading-[1.3] text-black">
              <div>
                <span className="font-black">Bank Name:</span> Mauritius Commercial Bank
              </div>
              <div>
                <span className="font-black">Account Name :</span> {data.company.name}
              </div>
              <div>
                <span className="font-black">Account Number:</span> 000446509687
              </div>
            </div>
          </div>

          <div className="space-y-[2mm]">
            <div className="grid grid-cols-[1fr_28mm] border border-black">
              <div className="px-[2.2mm] py-[2.1mm] text-[4.2mm] font-black text-black">
                SUB TOTAL :
              </div>
              <div className="px-[2.2mm] py-[2.1mm] text-right text-[3.8mm] text-black">
                {money(subtotal)}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_28mm] border border-black">
              <div className="px-[2.2mm] py-[2.1mm] text-[4.2mm] font-black text-black">
                VAT 15% :
              </div>
              <div className="px-[2.2mm] py-[2.1mm] text-right text-[3.8mm] text-black">
                {money(vat)}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_28mm] border border-black">
              <div className="px-[2.2mm] py-[2.1mm] text-[4.4mm] font-black text-black">
                TOTAL :
              </div>
              <div className="px-[2.2mm] py-[2.1mm] text-right text-[4.2mm] font-black text-black">
                {money(total)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[2mm] grid grid-cols-2 items-end">
          <div className="flex items-end justify-center">
            {data.company.stampSrc ? (
              <div className="relative h-[30mm] w-[30mm]">
                <Image
                  src={data.company.stampSrc}
                  alt="KS stamp"
                  fill
                  sizes="113px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-[30mm] w-[30mm]" />
            )}
          </div>

          <div className="flex flex-col items-center justify-end">
            {data.company.signatureSrc ? (
              <div className="relative h-[32mm] w-[80mm] bg-white">
                <Image
                  src={data.company.signatureSrc}
                  alt="Authorised signature"
                  fill
                  sizes="302px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-[32mm] w-[80mm] bg-white" />
            )}

            <div className="mt-[0.5mm] w-[82mm] border-t border-black" />
            <div className="mt-[1.4mm] text-center text-[4mm] font-bold text-black">
              Authorised Signature
            </div>
          </div>
        </div>

        <div className="mt-[2.5mm] text-center text-[6.8mm] font-normal uppercase tracking-[0.02em] text-black">
          THANK YOU FOR YOUR BUSINESS !
        </div>
      </div>
    </>
  );
}