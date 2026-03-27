"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  Sparkles,
  FileText,
  BadgeCheck,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import InvoiceKSDoc, {
  type KSInvoiceDocData,
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

function getParamId(params: unknown): string {
  const p = params as any;
  const raw = p?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

function isValidId(id: string) {
  if (!id) return false;
  if (id === "undefined" || id === "null") return false;
  return true;
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  if (!ct.includes("application/json")) throw new Error(`Expected JSON. Got ${ct}.`);
  return JSON.parse(text) as T;
}

function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        "bg-white/90 text-slate-700 ring-1 ring-white/70 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

function GlassBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="print:hidden">
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(2,6,23,0.10)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_260px_at_20%_0%,rgba(7,27,56,0.12),transparent_60%),radial-gradient(700px_260px_at_110%_0%,rgba(255,122,24,0.14),transparent_60%)]" />
        <div className="relative px-4 py-3 sm:px-5 sm:py-4">{children}</div>
      </div>
    </div>
  );
}

export default function PrintQuotationPage() {
  const params = useParams();
  const id = getParamId(params);
  const hasId = isValidId(id);

  const [quote, setQuote] = React.useState<QuoteApi | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [autoPrint, setAutoPrint] = React.useState(false);

  const printedOnceRef = React.useRef(false);

  const load = React.useCallback(async () => {
    if (!hasId) {
      setError("Missing quotation id");
      setQuote(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const j = await safeGet<{
        ok: boolean;
        data: QuoteApi;
        error?: any;
      }>(`/api/quotations/${encodeURIComponent(id)}`);

      if (!j.ok) throw new Error(j?.error ?? "Quotation not found");
      setQuote(j.data ?? null);
      if (!j.data) setError("Quotation not found.");
    } catch (e: any) {
      setError(e?.message || "Failed to load quotation");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [id, hasId]);

  React.useEffect(() => {
    void load();
  }, [load]);

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

      #ks-print-page {
        min-height: 100vh;
      }

      #ks-preview-shell {
        width: 100%;
        overflow: auto;
        padding-bottom: 12px;
      }

      #ks-preview-frame {
        width: fit-content;
        margin: 0 auto;
      }

      #ks-paper {
        width: 210mm;
        background: #ffffff;
        box-shadow: 0 16px 48px rgba(2, 6, 23, 0.12);
      }

      #ks-print-root {
        width: 194mm;
        margin: 0 auto;
        background: #ffffff;
      }

      .ks-screen-scale {
        transform-origin: top center;
      }

      @media screen and (max-width: 1400px) {
        .ks-screen-scale { transform: scale(0.92); }
      }
      @media screen and (max-width: 1200px) {
        .ks-screen-scale { transform: scale(0.84); }
      }
      @media screen and (max-width: 1024px) {
        .ks-screen-scale { transform: scale(0.72); }
      }
      @media screen and (max-width: 768px) {
        .ks-screen-scale { transform: scale(0.58); }
      }
      @media screen and (max-width: 560px) {
        .ks-screen-scale { transform: scale(0.48); }
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
          box-shadow: none !important;
        }

        #ks-paper,
        #ks-preview-shell,
        #ks-preview-frame {
          width: auto !important;
          min-height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          box-shadow: none !important;
          background: #ffffff !important;
        }

        .ks-screen-scale {
          transform: none !important;
        }

        .print\\:hidden {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  React.useEffect(() => {
    if (!autoPrint) return;
    if (!quote) return;
    if (printedOnceRef.current) return;

    printedOnceRef.current = true;
    const t = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(t);
  }, [autoPrint, quote]);

  const docData = React.useMemo<KSInvoiceDocData | null>(() => {
    if (!quote) return null;

    return {
      company: {
        name: "KS CONTRACTING LTD",
        logoSrc: "/kslogo.png",
        stampSrc: "/ks-stamp.png",
        signatureSrc: "/ks-signature.png",
        addressLines: [
          "MORCELLEMENT CARLOS, TAMARIN",
          "Tel: 5941 6756 • Email: ks.contracting@hotmail.com",
          "BRN: C18160190 • VAT: 27658608",
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
        dueDate: "",
      },

   billTo: {
  name:
    quote.customer_name ||
    (quote as any).client_name ||
    "",
  address:
    quote.customer_address ||
    (quote as any).client_address ||
    quote.site_address ||
    "",
  brn:
    quote.customer_brn ||
    (quote as any).client_brn ||
    "",
  vat:
    quote.customer_vat ||
    (quote as any).customer_vat_no ||
    (quote as any).client_vat ||
    "",
  siteAddress: quote.site_address || "",
  lines: [
    quote.customer_name
      ? `Name: ${quote.customer_name}`
      : (quote as any).client_name
      ? `Name: ${(quote as any).client_name}`
      : "",
    quote.customer_address
      ? `Address: ${quote.customer_address}`
      : (quote as any).client_address
      ? `Address: ${(quote as any).client_address}`
      : "",
    quote.customer_brn
      ? `BRN No.: ${quote.customer_brn}`
      : (quote as any).client_brn
      ? `BRN No.: ${(quote as any).client_brn}`
      : "",
    quote.customer_vat
      ? `VAT No.: ${quote.customer_vat}`
      : (quote as any).customer_vat_no
      ? `VAT No.: ${(quote as any).customer_vat_no}`
      : (quote as any).client_vat
      ? `VAT No.: ${(quote as any).client_vat}`
      : "",
    quote.site_address ? `Site Address: ${quote.site_address}` : "",
  ].filter(Boolean),
},

      items: (quote.items ?? []).map((item) => ({
        id: String(item.id),
        description: String(item.description ?? ""),
        qty: n2(item.qty),
        unitPrice: n2(item.unit_price_excl_vat ?? item.price),
        vatRate: n2(item.vat_rate || 0.15),
        vatAmount: n2(item.vat_amount),
        lineTotal: n2(item.line_total ?? item.total),
      })),

      totals: {
        subtotal: n2(quote.subtotal),
        vat: n2(quote.vat_amount),
        total: n2(quote.total_amount),
        paid: 0,
        balance: n2(quote.total_amount),
      },

      notes: quote.notes?.trim() || "MCB 000446509687",
      paymentTerms: "",
    };
  }, [quote]);

  const canPrint = !!docData;

  return (
    <div
      id="ks-print-page"
      className="min-h-screen bg-slate-100 px-3 py-3 print:bg-white print:p-0 sm:px-6 sm:py-6"
    >
      <GlassBar>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip className="bg-white text-[#071b38] ring-white/80">
                <Building2 className="size-3.5 text-[#071b38]" />
                KS Contracting
              </Chip>

              <Chip className="bg-[#ff8a1e]/10 text-[#c25708] ring-[#ff8a1e]/20">
                <BadgeCheck className="size-3.5" />
                Print Center
              </Chip>

              {quote ? (
                <Chip className="bg-slate-50 text-slate-700 ring-slate-200">
                  <FileText className="size-3.5 text-slate-500" />
                  {quote.quote_no || quote.quotation_no || "—"}
                </Chip>
              ) : null}
            </div>

            <div className="mt-3">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                Premium Quotation Print View
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {quote
                  ? "Quotation ready for printing or PDF export."
                  : loading
                  ? "Loading quotation document..."
                  : hasId
                  ? "Quotation preview unavailable."
                  : "Missing quotation id."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={hasId ? `/sales/quotations/${encodeURIComponent(id)}` : "/sales/quotations"}>
              <Button
                variant="outline"
                className="rounded-2xl border-slate-200 bg-white/70 hover:bg-white"
              >
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={() => void load()}
              className="rounded-2xl border-slate-200 bg-white/70 hover:bg-white"
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
              Refresh
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl border-slate-200 bg-white/70 hover:bg-white"
              onClick={() => {
                setAutoPrint((v) => {
                  const next = !v;
                  if (next) printedOnceRef.current = false;
                  return next;
                });
              }}
              disabled={!docData}
            >
              <Sparkles className="mr-2 size-4 text-[#ff8a1e]" />
              Auto Print:
              <span
                className={cn(
                  "ml-1 font-semibold",
                  autoPrint ? "text-emerald-700" : "text-slate-600"
                )}
              >
                {autoPrint ? "ON" : "OFF"}
              </span>
            </Button>

            <Button
              onClick={() => window.print()}
              className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_14px_40px_rgba(7,27,56,0.18)]"
              disabled={!canPrint}
            >
              <Printer className="mr-2 size-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </GlassBar>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 print:hidden">
          {error}
        </div>
      ) : null}

      <div id="ks-preview-shell" className="mt-3 print:mt-0">
        <div id="ks-preview-frame">
          <div className="ks-screen-scale">
            <div id="ks-paper">
              <div id="ks-print-root">
                {docData ? (
                  <InvoiceKSDoc data={docData} variant="quotation" />
                ) : (
                  <div className="print:hidden rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
                    {loading
                      ? "Loading quotation…"
                      : hasId
                      ? "No document available."
                      : "Missing quotation id."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400 print:hidden">
        {quote ? (
          <>
            Loaded: <span className="font-semibold">{quote.quote_no || quote.quotation_no || "—"}</span> • Items:{" "}
            <span className="font-semibold">{quote.items?.length ?? 0}</span>
          </>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}