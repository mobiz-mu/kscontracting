"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, CreditCard, Building2, MapPin, FileText, Wallet, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

type PaymentData = {
  id: string;
  invoice_id: string;
  invoice_no?: string | null;
  invoice_date?: string | null;
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

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
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

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <Icon className="size-4 text-slate-400" />
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function PaymentDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState<PaymentData | null>(null);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const j = await safeGet<ApiResponse<PaymentData>>(`/api/payments/${encodeURIComponent(id)}`);
        if (!alive) return;
        setData(j.data ?? null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load payment");
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.05),0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_12%_-20%,rgba(7,27,56,0.10),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,138,30,0.10),transparent_60%),linear-gradient(180deg,#ffffff,#ffffff)]" />
        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="size-4" />
                Back to payments
              </Link>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Payment Details
              </h1>
            </div>

            <Link href="/payments/report">
              <Button variant="outline" className="rounded-2xl">
                <Printer className="mr-2 size-4" />
                Print Report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
          Loading payment...
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-[#071b38] p-5 text-white shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Amount</div>
              <div className="mt-2 text-3xl font-extrabold">{money(Number(data.amount ?? 0))}</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Method</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-950">{data.method || "—"}</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Payment Date</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-950">{fmtDate(data.payment_date)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <DetailRow icon={Building2} label="Customer Name" value={data.customer_name || "—"} />
            <DetailRow icon={FileText} label="Invoice Number" value={data.invoice_no || "—"} />
            <DetailRow icon={Calendar} label="Invoice Date" value={fmtDate(data.invoice_date)} />
            <DetailRow icon={MapPin} label="Site Address" value={data.site_address || "—"} />
            <DetailRow icon={CreditCard} label="Reference No." value={data.reference_no || "—"} />
            <DetailRow icon={Wallet} label="Payment Type" value={data.method || "—"} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Description of Payment</div>
            <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
              {data.description || "—"}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}