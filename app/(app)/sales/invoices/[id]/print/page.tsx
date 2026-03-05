// app/(app)/sales/invoices/[id]/print/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import InvoiceKSDoc, { type KSInvoiceDocData } from "@/components/ksdoc/InvoiceKSDoc";

type ApiInvoice = {
  id: string;
  invoice_no: string;
  status?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
  created_at?: string | null;
  issued_at?: string | null;
  customers?: {
    id?: string | number | null;
    name?: string | null;
    brn?: string | null;
    vat_no?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
};

type ApiItem = {
  id: number | string;
  invoice_id: string;
  description: string;
  qty: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
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

function GlassBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="print:hidden">
      <div className="relative overflow-hidden rounded-[24px] ring-1 ring-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(2,6,23,0.10)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_260px_at_20%_0%,rgba(7,27,56,0.12),transparent_60%),radial-gradient(700px_260px_at_110%_0%,rgba(255,122,24,0.14),transparent_60%)]" />
        <div className="relative px-4 py-3 sm:px-5 sm:py-4">{children}</div>
      </div>
    </div>
  );
}

export default function InvoicePrintPage() {
  // ✅ Hooks MUST be inside the component
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
      const j = await safeGet<{ ok: boolean; data: { invoice?: ApiInvoice; items?: ApiItem[] }; error?: any }>(
        `/api/invoices/${encodeURIComponent(id)}`
      );

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
    load();
  }, [load]);

  // Print styling (A4)
  React.useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-ks-print", "1");
    style.innerHTML = `
      @page { size: A4; margin: 12mm; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Auto-print once
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

    return {
      company: {
        name: "KS CONTRACTING LTD",
        tagline: "Enterprise Accounting Suite • Mauritius",
        logoSrc: "/ks-logo.png",
        addressLines: ["Mauritius"],
        metaRight: ["Currency: MUR (Rs)"],
      },
      doc: { variant: "invoice" },
      invoice: {
        id: invoice.id,
        number: invoice.invoice_no,
        status: String(invoice.status ?? ""),
        issueDate: invoice.invoice_date ?? "",
        dueDate: invoice.due_date ?? "",
      },
      billTo: {
        name: cust?.name ?? "—",
        lines: [
          cust?.address ? String(cust.address) : "",
          cust?.email ? `Email: ${cust.email}` : "",
          cust?.phone ? `Tel: ${cust.phone}` : "",
          [cust?.vat_no ? `VAT: ${cust.vat_no}` : "", cust?.brn ? `BRN: ${cust.brn}` : ""].filter(Boolean).join(" • "),
        ].filter(Boolean),
      },
      items: (items ?? []).map((it) => {
        const qty = n2(it.qty);
        const unit = n2(it.unit_price_excl_vat);
        const vRate = Number.isFinite(Number(it.vat_rate)) ? n2(it.vat_rate) : undefined;
        const vAmt = Number.isFinite(Number(it.vat_amount)) ? n2(it.vat_amount) : undefined;
        const lineTotal = Number.isFinite(Number(it.line_total)) ? n2(it.line_total) : qty * unit + (vAmt ?? 0);

        return {
          id: String(it.id),
          description: String(it.description ?? ""),
          qty,
          unitPrice: unit,
          vatRate: vRate,
          vatAmount: vAmt,
          lineTotal,
        };
      }),
      totals: { subtotal, vat, total, paid, balance },
      notes:
        invoice.notes?.trim() ||
        "Thank you for your business. Please include the invoice number in your payment reference.",
      paymentTerms: "Payment due by due date. Late payments may impact service scheduling.",
    };
  }, [invoice, items]);

  return (
    <div className="px-3 py-3 sm:px-6 sm:py-6">
      <GlassBar>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Link href={hasId ? `/sales/invoices/${encodeURIComponent(id)}` : "/sales/invoices"}>
              <Button variant="outline" className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={load}
              className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
              onClick={() => {
                setAutoPrint((v) => {
                  const next = !v;
                  if (next) printedOnceRef.current = false;
                  return next;
                });
              }}
              title="Auto print after load"
              disabled={!doc}
            >
              <Sparkles className="mr-2 size-4 text-[#ff7a18]" />
              Auto Print:{" "}
              <span className={cn("ml-1 font-semibold", autoPrint ? "text-emerald-700" : "text-slate-600")}>
                {autoPrint ? "ON" : "OFF"}
              </span>
            </Button>

            <Button
              onClick={() => window.print()}
              className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_14px_40px_rgba(7,27,56,0.18)]"
              disabled={!doc}
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

      <div className="mt-3">
        {doc ? (
          <InvoiceKSDoc data={doc} variant="invoice" />
        ) : (
          <div className="print:hidden rounded-3xl bg-white ring-1 ring-slate-200 p-6 text-sm text-slate-600 shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
            {loading ? "Loading invoice…" : hasId ? "No document." : "Missing invoice id."}
          </div>
        )}
      </div>

      <div className="mt-3 print:hidden text-xs text-slate-400">
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