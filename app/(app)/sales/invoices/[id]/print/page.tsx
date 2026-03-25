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
import InvoiceKSDoc, { type KSInvoiceDocData } from "@/components/ksdoc/InvoiceKSDoc";

type ApiInvoice = {
  id: string;
  invoice_no: string;
  status?: string | null;
  invoice_type?: "VAT_INVOICE" | "PRO_FORMA" | "STANDARD" | "VAT" | "PROFORMA" | string | null;
  invoice_date?: string | null;
  notes?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  created_at?: string | null;
  issued_at?: string | null;
  site_address?: string | null;
  customers?: {
    id?: string | number | null;
    name?: string | null;
    brn?: string | null;
    vat_no?: string | null;
    address?: string | null;
  } | null;
};

type ApiItem = {
  id: number | string;
  invoice_id: string;
  description: string;
  qty: number;
  unit_price_excl_vat?: number;
  price?: number;
  vat_rate?: number;
  vat_amount?: number;
  line_total?: number;
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

function invoiceTypeLabel(v?: string | null) {
  const x = String(v ?? "").toUpperCase();
  if (x === "PRO_FORMA" || x === "PROFORMA") return "PRO FORMA INVOICE";
  if (x === "VAT_INVOICE" || x === "VAT") return "VAT INVOICE";
  return "STANDARD INVOICE";
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

export default function InvoicePrintPage() {
  const params = useParams();
  const id = getParamId(params);
  const hasId = isValidId(id);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [invoice, setInvoice] = React.useState<ApiInvoice | null>(null);
  const [items, setItems] = React.useState<ApiItem[]>([]);
  const [autoPrint, setAutoPrint] = React.useState(false);

  const printedOnceRef = React.useRef(false);

  const load = React.useCallback(async () => {
    if (!hasId) {
      setErr("Missing invoice id");
      setInvoice(null);
      setItems([]);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const j = await safeGet<{
        ok: boolean;
        data: { invoice?: ApiInvoice; items?: ApiItem[] };
        error?: any;
      }>(`/api/invoices/${encodeURIComponent(id)}`);

      if (!j.ok) throw new Error(j?.error ?? "Invoice not found");

      const inv = j.data?.invoice ?? null;
      const its = j.data?.items ?? [];

      setInvoice(inv);
      setItems(Array.isArray(its) ? its : []);
      if (!inv) setErr("Invoice not found.");
    } catch (e: any) {
      setErr(e?.message || "Failed to load invoice");
      setInvoice(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id, hasId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-ks-print", "invoice-print");
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
          break-inside: avoid !important;
          page-break-inside: avoid !important;
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
    if (!invoice) return;
    if (printedOnceRef.current) return;

    printedOnceRef.current = true;
    const t = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(t);
  }, [autoPrint, invoice]);

  const doc: KSInvoiceDocData | null = React.useMemo(() => {
    if (!invoice) return null;

    const total = n2(invoice.total_amount);
    const subtotal = n2(invoice.subtotal);
    const vat = n2(invoice.vat_amount);
    const balance = n2(invoice.balance_amount);

    const paidRaw = invoice.paid_amount;
    const paid =
      typeof paidRaw === "number" && Number.isFinite(paidRaw)
        ? n2(paidRaw)
        : Math.max(0, total - balance);

    const cust = invoice.customers ?? null;
    const invoiceType = invoiceTypeLabel(invoice.invoice_type);

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
        variant: "invoice",
        title: invoiceType,
        numberLabel: "No.",
        currency: "MUR",
      },
      invoice: {
        id: invoice.id,
        number: invoice.invoice_no,
        status: String(invoice.status ?? ""),
        issueDate: invoice.invoice_date ?? "",
        dueDate: "",
      },
      billTo: {
        name: cust?.name ?? "—",
        lines: [
          cust?.vat_no ? `Client VAT Reg. No.: ${cust.vat_no}` : "Client VAT Reg. No.:",
          cust?.brn ? `Client BRN No.: ${cust.brn}` : "Client BRN No.:",
          invoice.site_address ? `Site Address: ${invoice.site_address}` : "Site Address:",
        ],
      },
      items: (items ?? []).map((it) => {
        const qty = n2(it.qty);
        const unit =
          Number.isFinite(Number(it.unit_price_excl_vat))
            ? n2(it.unit_price_excl_vat)
            : n2(it.price);

        const rawRate = n2(it.vat_rate);
        const vatRate = rawRate > 1 ? rawRate / 100 : rawRate || 0.15;

        const vAmt =
          Number.isFinite(Number(it.vat_amount)) ? n2(it.vat_amount) : qty * unit * vatRate;

        const lineTotal =
          Number.isFinite(Number(it.line_total))
            ? n2(it.line_total)
            : qty * unit + vAmt;

        return {
          id: String(it.id),
          description: String(it.description ?? ""),
          qty,
          unitPrice: unit,
          vatRate,
          vatAmount: vAmt,
          lineTotal,
        };
      }),
      totals: {
        subtotal,
        vat,
        total,
        paid,
        balance,
      },
      notes: invoice.notes?.trim() || "MCB 000446509687",
      paymentTerms: "",
    };
  }, [invoice, items]);

  const invoiceTypeText = invoice ? invoiceTypeLabel(invoice.invoice_type) : "Invoice";
  const canPrint = !!doc;

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

              {invoice ? (
                <Chip className="bg-slate-50 text-slate-700 ring-slate-200">
                  <FileText className="size-3.5 text-slate-500" />
                  {invoice.invoice_no}
                </Chip>
              ) : null}
            </div>

            <div className="mt-3">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                Premium Invoice Print View
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {invoice
                  ? `${invoiceTypeText} ready for printing or PDF export.`
                  : loading
                  ? "Loading invoice document..."
                  : hasId
                  ? "Invoice preview unavailable."
                  : "Missing invoice id."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={hasId ? `/sales/invoices/${encodeURIComponent(id)}` : "/sales/invoices"}>
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
              disabled={!doc}
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

      {err ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 print:hidden">
          {err}
        </div>
      ) : null}

      <div id="ks-preview-shell" className="mt-3 print:mt-0">
        <div id="ks-preview-frame">
          <div className="ks-screen-scale">
            <div id="ks-paper">
              <div id="ks-print-root">
                {doc ? (
                  <InvoiceKSDoc data={doc} variant="invoice" />
                ) : (
                  <div className="print:hidden rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
                    {loading ? "Loading invoice…" : hasId ? "No document available." : "Missing invoice id."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400 print:hidden">
        {invoice ? (
          <>
            Loaded: <span className="font-semibold">{invoice.invoice_no}</span> • Items:{" "}
            <span className="font-semibold">{items.length}</span>
          </>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}