"use client";

import * as React from "react";
import Image from "next/image";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
    address?: string;
    brn?: string;
    vat?: string;
    siteAddress?: string;
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

function n2(v: unknown) {
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

function cleanText(v?: string | null) {
  return String(v ?? "").trim();
}

function extractField(lines: string[] | undefined, labels: string[]) {
  const hay = lines ?? [];
  for (const line of hay) {
    const raw = String(line ?? "").trim();
    const lower = raw.toLowerCase();
    for (const label of labels) {
      const l = label.toLowerCase();
      if (lower.startsWith(l)) {
        return raw.slice(label.length).replace(/^[:\s-]+/, "").trim();
      }
    }
  }
  return "";
}

function uniqueCleanLines(values: Array<string | null | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const line = cleanText(value);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }

  return out;
}

function normalizeItem(it: KSInvoiceItem) {
  const qty = n2(it.qty);
  const unitPrice = n2(it.unitPrice);
  const lineTotal =
    Number.isFinite(Number(it.lineTotal))
      ? n2(it.lineTotal)
      : Number.isFinite(Number(it.amount))
      ? n2(it.amount)
      : qty * unitPrice;

  return {
    ...it,
    qty,
    unitPrice,
    lineTotal,
  };
}

function getDocTitle(variant: KSDocVariant, custom?: string) {
  if (custom) return custom;
  if (variant === "quotation") return "QUOTATION";
  if (variant === "credit_note") return "CREDIT NOTE";
  return "VAT INVOICE";
}

function HeaderBlock({
  title,
  company,
  number,
}: {
  title: string;
  company: KSInvoiceDocData["company"];
  number: string;
}) {
  const uniqueMeta = uniqueCleanLines(company.metaRight ?? []);
  const topAddress =
    cleanText(company.addressLines?.[0]) || "Morcellement Carlos , Tamarin";

  const line1 =
    uniqueMeta[0] || "Tel: 5941 6756 • Email: ks.contracting@hotmail.com";
  const line2 = uniqueMeta[1] || "BRN: C18160190 • VAT: 27658608";

  return (
    <div className="pt-[4.5mm]">
      <div className="mx-auto max-w-[168mm] text-center">
        <div className="text-[10.1mm] font-bold uppercase leading-[0.95] tracking-[0.03em]">
          {company.name}
        </div>

        <div className="mt-[1.1mm] text-[4.6mm] font-medium leading-[1.08]">
          {topAddress}
        </div>

        <div className="mt-[1.7mm] text-[4.25mm] font-medium leading-[1.08]">
          {line1}
        </div>

        <div className="mt-[1.1mm] text-[4.25mm] font-medium leading-[1.08]">
          {line2}
        </div>
      </div>

      <div className="mt-[2.8mm] grid grid-cols-[1fr_auto] items-center">
        <div className="pl-[16mm] text-center text-[7.2mm] font-bold uppercase leading-none tracking-[0.05em]">
          {title}
        </div>

        <div className="pr-[1.5mm] text-right text-[4.6mm] font-bold leading-none text-[#f36a24]">
          No. {number || "INV-0001"}
        </div>
      </div>
    </div>
  );
}

function CustomerBlock({
  customerName,
  customerAddress,
  customerBrn,
  customerVat,
}: {
  customerName: string;
  customerAddress: string;
  customerBrn: string;
  customerVat: string;
}) {
  return (
    <div>
      <div className="border border-black bg-[#f7934c] px-[3mm] py-[2.75mm] text-center text-[4.9mm] font-bold">
        Customer Details
      </div>

      <table className="mt-[2.4mm] w-full border-collapse">
        <tbody>
          <tr>
            <td className="w-[29mm] border border-black px-[1.8mm] py-[1.75mm] text-center text-[4mm] font-medium">
              Name
            </td>
            <td className="border border-black px-[2.2mm] py-[1.75mm] text-[3.75mm]">
              {customerName || " "}
            </td>
          </tr>
          <tr>
            <td className="w-[29mm] border border-black px-[1.8mm] py-[1.75mm] text-center text-[4mm] font-medium">
              Address
            </td>
            <td className="border border-black px-[2.2mm] py-[1.75mm] text-[3.75mm]">
              {customerAddress || " "}
            </td>
          </tr>
          <tr>
            <td className="w-[29mm] border border-black px-[1.8mm] py-[1.75mm] text-center text-[4mm] font-medium">
              BRN No.
            </td>
            <td className="border border-black px-[2.2mm] py-[1.75mm] text-[3.75mm]">
              {customerBrn || " "}
            </td>
          </tr>
          <tr>
            <td className="w-[29mm] border border-black px-[1.8mm] py-[1.75mm] text-center text-[4mm] font-medium">
              VAT No.
            </td>
            <td className="border border-black px-[2.2mm] py-[1.75mm] text-[3.75mm]">
              {customerVat || " "}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LogoBlock({
  logoSrc,
}: {
  logoSrc: string;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex flex-1 items-center justify-center">
        <div className="relative h-[48mm] w-[76mm]">
          <Image
            src={logoSrc || "/kslogo.png"}
            alt="KS Contracting logo"
            fill
            sizes="287px"
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}

function ItemsTable({
  items,
  issueDate,
}: {
  items: Array<ReturnType<typeof normalizeItem>>;
  issueDate: string;
}) {
  return (
    <div className="mt-[4.8mm]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#f7934c]">
            <th className="w-[26mm] border border-black px-[1.6mm] py-[2.55mm] text-center text-[4.7mm] font-bold">
              Date
            </th>
            <th className="w-[92mm] border border-black px-[1.6mm] py-[2.55mm] text-center text-[4.7mm] font-bold">
              Item Description
            </th>
            <th className="w-[29mm] border border-black px-[1.6mm] py-[2.55mm] text-center text-[4.7mm] font-bold">
              Price
            </th>
            <th className="w-[18mm] border border-black px-[1.6mm] py-[2.55mm] text-center text-[4.7mm] font-bold">
              Qty
            </th>
            <th className="w-[29mm] border border-black px-[1.6mm] py-[2.55mm] text-center text-[4.7mm] font-bold">
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {items.length > 0 ? (
            items.map((it, idx) => (
              <tr key={it.id ?? `row-${idx}`}>
                <td className="border border-black px-[1.8mm] py-[2.3mm] align-top text-[3.45mm] leading-[1.18]">
                  {issueDate}
                </td>
                <td className="border border-black px-[2.1mm] py-[2.3mm] align-top text-[3.5mm] leading-[1.2]">
                  {it.description || " "}
                </td>
                <td className="border border-black px-[1.8mm] py-[2.3mm] text-right align-top text-[3.45mm] leading-[1.18]">
                  {money(it.unitPrice)}
                </td>
                <td className="border border-black px-[1.8mm] py-[2.3mm] text-center align-top text-[3.45mm] leading-[1.18]">
                  {it.qty}
                </td>
                <td className="border border-black px-[1.8mm] py-[2.3mm] text-right align-top text-[3.45mm] font-bold leading-[1.18]">
                  {money(it.lineTotal)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="h-[14mm] border border-black px-[1.8mm] py-[2.3mm]" />
              <td className="h-[14mm] border border-black px-[1.8mm] py-[2.3mm]" />
              <td className="h-[14mm] border border-black px-[1.8mm] py-[2.3mm]" />
              <td className="h-[14mm] border border-black px-[1.8mm] py-[2.3mm]" />
              <td className="h-[14mm] border border-black px-[1.8mm] py-[2.3mm]" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FooterBlock({
  company,
  subtotal,
  vat,
  total,
  variant,
}: {
  company: KSInvoiceDocData["company"];
  subtotal: number;
  vat: number;
  total: number;
  variant: KSDocVariant;
}) {

  const stampSrc = cleanText(company.stampSrc) || "/ks-stamp.png";
  const signatureSrc = cleanText(company.signatureSrc) || "/ks-signature.png";
  const showBankDetails = variant === "invoice";

  return (
    <>
      <div
  className={`mt-[3.7mm] grid items-start gap-[8mm] ${
    showBankDetails ? "grid-cols-[1fr_76mm]" : "grid-cols-[1fr_76mm]"
  }`}
>
  <div>
    {showBankDetails ? (
      <>
        <div className="text-[5mm] font-bold text-[#f36a24]">Bank Details :</div>

        <div className="mt-[2.4mm] space-y-[2.6mm] text-[4.2mm] font-medium leading-[1.18]">
          <div>
            <span className="font-bold">Bank Name:</span> Mauritius Commercial Bank
          </div>
          <div>
            <span className="font-bold">Account Name :</span> {company.name}
          </div>
          <div>
            <span className="font-bold">Account Number:</span> 000446509687
          </div>
        </div>
      </>
    ) : null}
  </div>

  <div className="space-y-[2.35mm]">
    <div className="grid grid-cols-[1fr_29mm] border border-black">
      <div className="px-[2.1mm] py-[2.45mm] text-[4.95mm] font-bold">
        SUB TOTAL :
      </div>
      <div className="px-[2.1mm] py-[2.45mm] text-right text-[3.8mm] font-semibold">
        {money(subtotal)}
      </div>
    </div>

    <div className="grid grid-cols-[1fr_29mm] border border-black">
      <div className="px-[2.1mm] py-[2.45mm] text-[4.95mm] font-bold">
        VAT 15% :
      </div>
      <div className="px-[2.1mm] py-[2.45mm] text-right text-[3.8mm] font-semibold">
        {money(vat)}
      </div>
    </div>

    <div className="grid grid-cols-[1fr_29mm] border border-black">
      <div className="px-[2.1mm] py-[2.45mm] text-[5.05mm] font-bold">
        TOTAL :
      </div>
      <div className="px-[2.1mm] py-[2.45mm] text-right text-[3.95mm] font-bold">
        {money(total)}
      </div>
    </div>
  </div>
</div>

      <div className="mt-[5.2mm] grid grid-cols-[1fr_84mm] items-end gap-[5mm]">
        <div className="flex items-end justify-center pl-[28mm]">
          <div className="relative h-[32mm] w-[32mm]">
            <Image
              src={stampSrc}
              alt="KS stamp"
              fill
              sizes="121px"
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-end">
          <div className="relative h-[29mm] w-[82mm]">
            <Image
              src={signatureSrc}
              alt="Authorised signature"
              fill
              sizes="310px"
              className="object-contain"
            />
          </div>

          <div className="mt-[0.7mm] w-[82mm] border-t border-black" />
          <div className="mt-[1.7mm] text-center text-[4.25mm] font-semibold">
            Authorised Signature
          </div>
        </div>
      </div>

      <div className="mt-[8.3mm] text-center text-[7.3mm] font-medium uppercase tracking-[0.035em]">
        THANK YOU FOR YOUR BUSINESS !
      </div>
    </>
  );
}

export default function InvoiceKSDoc({
  data,
  variant = "invoice",
}: {
  data: KSInvoiceDocData;
  variant?: KSDocVariant;
}) {
  const currentVariant = data.doc?.variant ?? variant;
  const title = getDocTitle(currentVariant, data.doc?.title);

  const subtotal = n2(data.totals.subtotal);
  const vat = n2(data.totals.vat);
  const total = n2(data.totals.total);

  const issueDate = fmtDate(data.invoice.issueDate || "");

  const customerName = cleanText(data.billTo.name) || " ";
  const customerAddress =
    cleanText(data.billTo.address) ||
    extractField(data.billTo.lines, ["Address", "Customer Address", "Client Address"]) ||
    " ";
  const customerBrn =
    cleanText(data.billTo.brn) ||
    extractField(data.billTo.lines, ["Client BRN No.", "BRN No.", "BRN"]) ||
    " ";
  const customerVat =
    cleanText(data.billTo.vat) ||
    extractField(data.billTo.lines, ["Client VAT Reg. No.", "VAT Reg. No.", "VAT No.", "VAT"]) ||
    " ";

  const items = (data.items ?? []).map(normalizeItem);

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 7mm;
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
          font-family: ${quicksand.style.fontFamily}, Arial, Helvetica, sans-serif;
          color: #000000;
          background: #ffffff;
        }

        .ks-doc-page {
          width: 196mm;
          min-height: 283mm;
          margin: 0 auto;
          background: #ffffff;
          box-sizing: border-box;
          overflow: hidden;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .ks-doc-root {
            width: 196mm !important;
            max-width: 196mm !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }

          .ks-doc-page {
            width: 196mm !important;
            min-height: 283mm !important;
            margin: 0 auto !important;
            overflow: hidden !important;
          }

          table,
          tr,
          td,
          th {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div
        className={`ks-doc-root ${quicksand.className} mx-auto w-[196mm] max-w-[196mm] bg-white text-black`}
      >
        <div className="ks-doc-page">
          <div className="px-[1.5mm] pt-[0.8mm]">
            <HeaderBlock
              title={title}
              company={data.company}
              number={data.invoice.number || "INV-0001"}
            />

            <div className="mt-[4.7mm] grid grid-cols-[99mm_64mm] items-start justify-between gap-[10mm]">
              <CustomerBlock
                customerName={customerName}
                customerAddress={customerAddress}
                customerBrn={customerBrn}
                customerVat={customerVat}
              />

              <LogoBlock logoSrc={data.company.logoSrc || "/kslogo.png"} />
            </div>

            <ItemsTable items={items} issueDate={issueDate} />

            <FooterBlock
                company={data.company}
                subtotal={subtotal}
                vat={vat}
                total={total}
                variant={currentVariant}
            />
          </div>
        </div>
      </div>
    </>
  );
}