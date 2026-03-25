"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, RefreshCw, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import InvoiceKSDoc, {
  type KSInvoiceDocData,
  type KSInvoiceItem,
} from "@/components/ksdoc/InvoiceKSDoc";

type QuoteItemApi = {
  id: number | string;
  description: string;
  qty: number;
  unit_price_excl_vat?: number;
  vat_rate?: number;
  vat_amount?: number;
  line_total?: number;
  price?: number;
  total?: number;
};

type QuoteApi = {
  id: string;
  quote_no: string | null;
  quotation_no?: string | null;
  customer_name: string | null;
  customer_vat?: string | null;
  customer_brn?: string | null;
  customer_address?: string | null;
  site_address?: string | null;
  quote_date: string | null;
  valid_until: string | null;
  subtotal: number;
  vat_amount?: number;
  total_amount: number;
  notes?: string | null;
  items: QuoteItemApi[];
};

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
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

export default function PrintQuotationPage() {
  const params = useParams();
  const id = params?.id as string;

  const [quote, setQuote] = React.useState<QuoteApi | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/quotations/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load quotation");
      }

      setQuote(json.data ?? null);
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

  React.useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-ks-print", "quotation-print");
    style.innerHTML = `
      @page {
        size: A4 portrait;
        margin: 8mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #eef2f7;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
        }

        body * {
          visibility: hidden !important;
        }

        #ks-print-root,
        #ks-print-root * {
          visibility: visible !important;
        }

        #ks-print-root {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 194mm !important;
          max-width: 194mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        .print\\:hidden {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const docData = React.useMemo<KSInvoiceDocData | null>(() => {
    if (!quote) return null;

    const items: KSInvoiceItem[] = (quote.items ?? []).map((item) => ({
      id: String(item.id),
      description: String(item.description ?? ""),
      qty: n2(item.qty),
      unitPrice: n2(item.unit_price_excl_vat ?? item.price),
      vatRate: n2(item.vat_rate || 0.15),
      vatAmount: n2(item.vat_amount),
      lineTotal: n2(item.line_total ?? item.total),
    }));

    return {
      company: {
        name: "KS CONTRACTING LTD",
        logoSrc: "/kslogo.png",
        stampSrc: "/ks-stamp.png",
        signatureSrc: "/ks-signature.png",
        addressLines: [
          "MORCELLEMENT CARLOS, TAMARIN",
          "Tel: 5941 6756 • Email: ks.contracting@hotmail.com",
          "BRN: 18160190 • VAT: 27658608",
        ],
      },

      doc: {
        variant: "quotation",
        title: "QUOTATION",
        numberLabel: "No.",
        currency: "MUR",
      },

      invoice: {
        id: quote.id,
        number: quote.quote_no || quote.quotation_no || "—",
        status: "DRAFT",
        issueDate: quote.quote_date || "",
        dueDate: quote.valid_until || "",
      },

      billTo: {
        name: quote.customer_name || "—",
        lines: [
          quote.customer_vat
            ? `Client VAT Reg. No.: ${quote.customer_vat}`
            : "Client VAT Reg. No.:",
          quote.customer_brn
            ? `Client BRN No.: ${quote.customer_brn}`
            : "Client BRN No.:",
          quote.site_address
            ? `Site Address: ${quote.site_address}`
            : "Site Address:",
        ],
      },

      items,

      totals: {
        subtotal: n2(quote.subtotal),
        vat: n2(quote.vat_amount),
        total: n2(quote.total_amount),
        paid: 0,
        balance: n2(quote.total_amount),
      },

      notes: quote.notes?.trim() || "MCB 000446509687",
      paymentTerms: quote.valid_until
        ? `Quotation valid until ${fmtDate(quote.valid_until)}`
        : "",
    };
  }, [quote]);

  React.useEffect(() => {
    if (!docData || loading) return;

    const t = window.setTimeout(() => {
      window.print();
    }, 450);

    return () => window.clearTimeout(t);
  }, [docData, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-8 text-sm text-slate-600 print:bg-white print:p-0">
        Loading quotation...
      </div>
    );
  }

  if (error || !docData) {
    return (
      <div className="min-h-screen bg-slate-100 p-8 text-sm text-rose-600 print:bg-white print:p-0">
        {error || "Quotation not found"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 print:bg-white print:p-0 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <FileText className="size-4" />
          Quotation Print View
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/sales/quotations/${encodeURIComponent(id)}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          </Link>

          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>

          <Button onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      <div id="ks-print-root" className="mx-auto w-[194mm] bg-white">
        <InvoiceKSDoc data={docData} variant="quotation" />
      </div>
    </div>
  );
}