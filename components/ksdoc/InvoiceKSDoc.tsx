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
  const rowsToRender = Math.max(items.length, 8);
  const paddedRows = Array.from({ length: rowsToRender }, (_, i) => items[i] ?? null);

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
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
            min-height: 281mm !important;
            max-width: 194mm !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="ks-doc-root mx-auto w-[194mm] max-w-[194mm] min-h-[281mm] bg-white text-black">
        {/* Header */}
        <div className="grid grid-cols-[68mm_1fr] items-start gap-[6mm]">
          <div className="flex items-start justify-start">
            <div className="relative h-[50mm] w-[66mm]">
              <Image
                src={data.company.logoSrc}
                alt={`${data.company.name} logo`}
                fill
                className="object-contain object-left-top"
                priority
              />
            </div>
          </div>

          <div className="pt-[1.5mm] text-center">
            <div className="text-[8.6mm] font-black uppercase leading-[0.95] tracking-[0.01em] text-black">
              {data.company.name}
            </div>

            <div className="mt-[2.6mm] space-y-[0.8mm] text-[3.8mm] leading-[1.25] text-black">
              {(data.company.addressLines ?? []).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            <div className="mt-[4mm] grid grid-cols-[1fr_auto] items-center">
              <div className="pl-[6mm] text-center text-[6.9mm] font-black uppercase leading-none tracking-[0.02em] text-black">
                {title}
              </div>

              <div className="pr-[1mm] text-right text-[4.8mm] font-black leading-none text-[#de7a32]">
                No. {data.invoice.number || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="mt-[8mm]">
          <table className="w-full border-collapse text-black">
            <thead>
              <tr className="bg-[#f36a24]">
                <th className="border border-black px-[2.6mm] py-[2.8mm] text-center text-[4.1mm] font-black">
                  Date
                </th>
                <th className="border border-black px-[2.6mm] py-[2.8mm] text-center text-[4.1mm] font-black">
                  Item Description
                </th>
                <th className="border border-black px-[2.6mm] py-[2.8mm] text-center text-[4.1mm] font-black">
                  Price
                </th>
                <th className="border border-black px-[2.6mm] py-[2.8mm] text-center text-[4.1mm] font-black">
                  Qty
                </th>
                <th className="border border-black px-[2.6mm] py-[2.8mm] text-center text-[4.1mm] font-black">
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
                    <td className="h-[11.2mm] border border-black px-[2.2mm] py-[2.1mm] align-top text-[3.1mm]">
                      {it ? issueDate : ""}
                    </td>
                    <td className="ks-desc-font h-[11.2mm] border border-black px-[2.6mm] py-[2.1mm] align-top text-[3.05mm] leading-[1.35]">
                      {it?.description || ""}
                    </td>
                    <td className="h-[11.2mm] border border-black px-[2.2mm] py-[2.1mm] text-right align-top text-[3.1mm]">
                      {it ? money(unitPrice) : ""}
                    </td>
                    <td className="h-[11.2mm] border border-black px-[2.2mm] py-[2.1mm] text-center align-top text-[3.1mm]">
                      {it ? qty : ""}
                    </td>
                    <td className="h-[11.2mm] border border-black px-[2.2mm] py-[2.1mm] text-right align-top text-[3.1mm] font-bold">
                      {it ? money(lineTotal) : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom area */}
        <div className="mt-[8mm] grid grid-cols-[1fr_78mm] gap-[8mm]">
          {/* Left bank details */}
          <div>
            <div className="text-[4.9mm] font-black text-[#de7a32]">
              Bank Details :
            </div>

            <div className="mt-[4.2mm] space-y-[2.2mm] text-[4mm] leading-[1.4] text-black">
              <div>
                <span className="font-black">Bank Name:</span>{" "}
                Mauritius Commercial Bank
              </div>
              <div>
                <span className="font-black">Account Name :</span>{" "}
                {data.company.name}
              </div>
              <div>
                <span className="font-black">Account Number:</span>{" "}
                000446509687
              </div>
            </div>
          </div>

          {/* Right totals */}
          <div className="space-y-[2.6mm]">
            <div className="grid grid-cols-[1fr_30mm] border border-black">
              <div className="px-[2.4mm] py-[2.6mm] text-[4.6mm] font-black text-black">
                SUB TOTAL :
              </div>
              <div className="px-[2.4mm] py-[2.6mm] text-right text-[4mm] text-black">
                {money(subtotal)}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_30mm] border border-black">
              <div className="px-[2.4mm] py-[2.6mm] text-[4.6mm] font-black text-black">
                VAT 15% :
              </div>
              <div className="px-[2.4mm] py-[2.6mm] text-right text-[4mm] text-black">
                {money(vat)}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_30mm] border border-black">
              <div className="px-[2.4mm] py-[2.6mm] text-[4.9mm] font-black text-black">
                TOTAL :
              </div>
              <div className="px-[2.4mm] py-[2.6mm] text-right text-[4.6mm] font-black text-black">
                {money(total)}
              </div>
            </div>
          </div>
        </div>

        {/* Stamp + signature */}
        <div className="mt-[5mm] grid grid-cols-2 items-end">
          <div className="flex items-end justify-center">
            {data.company.stampSrc ? (
              <div className="relative h-[34mm] w-[34mm]">
                <Image
                  src={data.company.stampSrc}
                  alt="KS stamp"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-[34mm] w-[34mm]" />
            )}
          </div>

          <div className="flex flex-col items-center justify-end">
            {data.company.signatureSrc ? (
              <div className="relative h-[38mm] w-[84mm] bg-white">
                <Image
                  src={data.company.signatureSrc}
                  alt="Authorised signature"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-[38mm] w-[84mm] bg-white" />
            )}

            <div className="mt-[0.5mm] w-[86mm] border-t border-black" />
            <div className="mt-[1.8mm] text-center text-[4.4mm] font-bold text-black">
              Authorised Signature
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-[8mm] text-center text-[7.6mm] font-normal uppercase tracking-[0.02em] text-black">
          THANK YOU FOR YOUR BUSINESS !
        </div>
      </div>
    </>
  );
}