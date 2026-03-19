"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Calendar,
  Wallet,
  Building2,
  FileText,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
  kpi?: {
    totalPayments?: number;
    totalAmount?: number;
    byMethod?: Record<string, number>;
  };
  error?: any;
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

function MethodBadge({ method }: { method?: string | null }) {
  const value = String(method ?? "").toUpperCase();
  const cls =
    value === "CASH"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === "CHEQUE"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-blue-50 text-blue-700 ring-blue-200";

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1", cls)}>
      {value || "—"}
    </span>
  );
}

export default function PaymentsPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<PaymentRow[]>([]);
  const [kpi, setKpi] = React.useState<ApiListResponse<PaymentRow>["kpi"]>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const j = await safeGet<ApiListResponse<PaymentRow>>(
        `/api/payments?page=1&pageSize=200&q=${encodeURIComponent(q)}`
      );
      setRows(j.data ?? []);
      setKpi(j.kpi ?? {});
    } catch (e: any) {
      setError(e?.message || "Failed to load payments");
      setRows([]);
      setKpi({});
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.05),0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_12%_-20%,rgba(7,27,56,0.10),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,138,30,0.10),transparent_60%),linear-gradient(180deg,#ffffff,#ffffff)]" />
        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                <CreditCard className="size-3.5 text-slate-500" />
                Payment Effected
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Payments
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/payments/report">
                <Button variant="outline" className="rounded-2xl">
                  <FileText className="mr-2 size-4" />
                  Report
                </Button>
              </Link>
              <Link href="/payments/new">
                <Button className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]">
                  <Plus className="mr-2 size-4" />
                  New Payment
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search invoice, customer, site, description, reference..."
                className="h-11 rounded-2xl pl-10"
              />
            </div>

            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Payments</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-950">{kpi?.totalPayments ?? 0}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Amount</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-950">{money(Number(kpi?.totalAmount ?? 0))}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cash</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-950">{kpi?.byMethod?.CASH ?? 0}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bank / Cheque</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-950">
            {(kpi?.byMethod?.BANK_TRANSFER ?? 0) + (kpi?.byMethod?.CHEQUE ?? 0)}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-12 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 md:grid">
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Customer</div>
          <div className="col-span-2">Invoice</div>
          <div className="col-span-2">Site</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-1 text-right">Open</div>
        </div>

        <div className="divide-y divide-slate-200">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500">
              {loading ? "Loading payments..." : "No payments found."}
            </div>
          ) : (
            rows.map((r) => (
              <Link
                key={r.id}
                href={`/payments/${encodeURIComponent(r.id)}`}
                className="block transition hover:bg-slate-50"
              >
                <div className="hidden grid-cols-12 items-center px-4 py-4 text-sm md:grid">
                  <div className="col-span-2 font-semibold text-slate-900">{fmtDate(r.payment_date)}</div>
                  <div className="col-span-2 truncate text-slate-800">{r.customer_name || "—"}</div>
                  <div className="col-span-2 truncate text-slate-800">{r.invoice_no || "—"}</div>
                  <div className="col-span-2 truncate text-slate-600">{r.site_address || "—"}</div>
                  <div className="col-span-1"><MethodBadge method={r.method} /></div>
                  <div className="col-span-2 text-right font-extrabold text-slate-950">
                    {money(Number(r.amount ?? 0))}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ChevronRight className="size-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-3 p-4 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{r.customer_name || "—"}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{r.invoice_no || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-950">{money(Number(r.amount ?? 0))}</div>
                      <div className="mt-1 text-xs text-slate-500">{fmtDate(r.payment_date)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <MethodBadge method={r.method} />
                    <div className="truncate text-xs text-slate-500">{r.site_address || "—"}</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}