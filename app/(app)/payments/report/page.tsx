"use client";

import * as React from "react";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaymentRow = {
  id: string;
  invoice_id: string;
  invoice_no?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  payment_date?: string | null;
  method?: string | null;
  reference_no?: string | null;
  amount?: number | null;
  description?: string | null;
  notes?: string | null;
  site_address?: string | null;
  created_at?: string | null;
};

type ApiListResponse<T> = {
  ok: boolean;
  data?: T[];
  kpi?: {
    totalPayments?: number;
    totalAmount?: number;
    byMethod?: Record<string, number>;
  };
};

function money(n: number) {
  return `Rs ${Number(n || 0).toLocaleString("en-MU", {
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

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  if (!ct.includes("application/json")) throw new Error(`Expected JSON. Got ${ct}`);

  return JSON.parse(text) as T;
}

export default function PaymentsReportPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [rows, setRows] = React.useState<PaymentRow[]>([]);
  const [kpi, setKpi] = React.useState<ApiListResponse<PaymentRow>["kpi"]>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const j = await safeGet<ApiListResponse<PaymentRow>>("/api/payments?page=1&pageSize=500");
      setRows(j.data ?? []);
      setKpi(j.kpi ?? {});
    } catch (e: any) {
      setError(e?.message || "Failed to load report");
      setRows([]);
      setKpi({});
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          #payments-print-root,
          #payments-print-root * {
            visibility: visible !important;
          }

          #payments-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .print-hide {
            display: none !important;
          }

          .print-card {
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .print-table-wrap {
            overflow: visible !important;
          }

          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }

          .print-table th,
          .print-table td {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="space-y-4">
        <div className="print-hide flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Link href="/payments">
              <Button variant="outline" className="rounded-2xl">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            </Link>

            <Button variant="outline" className="rounded-2xl" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            Print / Save PDF
          </Button>
        </div>

        {error ? (
          <div className="print-hide rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div id="payments-print-root">
          <div className="print-card rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.05),0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 pb-4">
              <div className="text-2xl font-extrabold tracking-tight text-slate-950">PAYMENTS REPORT</div>
              <div className="mt-1 text-sm text-slate-600">KS Contracting Ltd</div>
              <div className="text-sm text-slate-600">MORCELLEMENT CARLOS, TAMARIN</div>
              <div className="text-sm text-slate-600">Tel: 59416756 • Email: ks.contracting@hotmail.com</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Payments</div>
                <div className="mt-2 text-xl font-extrabold text-slate-950">{kpi?.totalPayments ?? 0}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Amount</div>
                <div className="mt-2 text-xl font-extrabold text-slate-950">
                  {money(Number(kpi?.totalAmount ?? 0))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cash</div>
                <div className="mt-2 text-xl font-extrabold text-slate-950">{kpi?.byMethod?.CASH ?? 0}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bank / Cheque</div>
                <div className="mt-2 text-xl font-extrabold text-slate-950">
                  {(kpi?.byMethod?.BANK_TRANSFER ?? 0) + (kpi?.byMethod?.CHEQUE ?? 0)}
                </div>
              </div>
            </div>

            <div className="print-table-wrap mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="print-table w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Invoice</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Site</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                        No payments found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-3 text-slate-900">{fmtDate(r.payment_date)}</td>
                        <td className="px-3 py-3 text-slate-900">{r.customer_name || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{r.invoice_no || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{r.description || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{r.site_address || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{r.method || "—"}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-950">
                          {money(Number(r.amount ?? 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}