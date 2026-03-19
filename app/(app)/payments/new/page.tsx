"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save, Search, Wallet, Calendar, FileText, MapPin, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InvoiceRow = {
  id: string;
  invoice_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  invoice_date?: string | null;
  site_address?: string | null;
  status?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_amount?: number | null;
};

type ApiListResponse<T> = {
  ok: boolean;
  data?: T[];
  error?: any;
};

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  if (!ct.includes("application/json")) throw new Error(`Expected JSON. Got ${ct}`);

  return JSON.parse(text) as T;
}

export default function NewPaymentPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const [invoiceQuery, setInvoiceQuery] = React.useState("");
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);
  const [invoiceList, setInvoiceList] = React.useState<InvoiceRow[]>([]);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceRow | null>(null);

  const [paymentDate, setPaymentDate] = React.useState(todayISO());
  const [method, setMethod] = React.useState("BANK_TRANSFER");
  const [referenceNo, setReferenceNo] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");

  const boxRef = React.useRef<HTMLDivElement | null>(null);

  const filteredInvoices = React.useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    if (!q) return invoiceList.slice(0, 10);

    return invoiceList
      .filter((r) => {
        const inv = String(r.invoice_no ?? "").toLowerCase();
        const cus = String(r.customer_name ?? "").toLowerCase();
        const site = String(r.site_address ?? "").toLowerCase();
        return inv.includes(q) || cus.includes(q) || site.includes(q);
      })
      .slice(0, 12);
  }, [invoiceList, invoiceQuery]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const j = await safeGet<ApiListResponse<InvoiceRow>>("/api/invoices?page=1&pageSize=500");
        const rows = (j.data ?? []).filter((r) => n2(r.balance_amount) > 0);
        if (!alive) return;
        setInvoiceList(rows);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load invoices");
        setInvoiceList([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!boxRef.current) return;
      if (boxRef.current.contains(t)) return;
      setInvoiceOpen(false);
    }

    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  function selectInvoice(row: InvoiceRow) {
    setSelectedInvoice(row);
    setInvoiceQuery(`${row.invoice_no} — ${row.customer_name ?? "—"}`);
    setInvoiceOpen(false);
    const bal = n2(row.balance_amount);
    setAmount(bal > 0 ? String(bal) : "");
  }

  async function savePayment() {
    try {
      setSaving(true);
      setError("");

      if (!selectedInvoice?.id) {
        throw new Error("Select an invoice first");
      }

      if (!paymentDate) {
        throw new Error("Payment date is required");
      }

      if (!(n2(amount) > 0)) {
        throw new Error("Amount must be greater than 0");
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          payment_date: paymentDate,
          method,
          reference_no: referenceNo || null,
          amount: n2(amount),
          notes: description || null,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      const j = ct.includes("application/json") ? JSON.parse(text) : null;

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error?.message ?? j?.error ?? `Save failed (HTTP ${res.status})`);
      }

      router.push(`/payments/${encodeURIComponent(j.data.id)}`);
    } catch (e: any) {
      setError(e?.message || "Failed to save payment");
    } finally {
      setSaving(false);
    }
  }

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
                New Payment
              </h1>
            </div>

            <Button
              onClick={savePayment}
              disabled={saving}
              className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
            >
              <Save className="mr-2 size-4" />
              Save Payment
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Payment Details</div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div ref={boxRef} className="lg:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Search className="size-4 text-slate-400" />
              Select Invoice
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={invoiceQuery}
                onChange={(e) => {
                  setInvoiceQuery(e.target.value);
                  setInvoiceOpen(true);
                }}
                onFocus={() => setInvoiceOpen(true)}
                placeholder={loading ? "Loading invoices..." : "Search invoice no, customer, site address..."}
                className="h-12 rounded-2xl pl-10"
              />
            </div>

            {invoiceOpen && (
              <div className="mt-2 max-h-[320px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
                {filteredInvoices.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-slate-500">No open invoices found.</div>
                ) : (
                  filteredInvoices.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectInvoice(r)}
                      className="w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{r.invoice_no}</div>
                          <div className="truncate text-sm text-slate-600">{r.customer_name || "—"}</div>
                          <div className="truncate text-xs text-slate-500">{r.site_address || "—"}</div>
                        </div>
                        <div className="text-right text-xs text-slate-600">
                          <div>Balance</div>
                          <div className="font-bold text-slate-900">{money(n2(r.balance_amount))}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Building2 className="size-4 text-slate-400" />
              Customer
            </label>
            <Input value={selectedInvoice?.customer_name ?? ""} disabled className="h-12 rounded-2xl" />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <MapPin className="size-4 text-slate-400" />
              Site Address
            </label>
            <Input value={selectedInvoice?.site_address ?? ""} disabled className="h-12 rounded-2xl" />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Calendar className="size-4 text-slate-400" />
              Payment Date
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Wallet className="size-4 text-slate-400" />
              Payment Type
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#ff8a1e]/20"
            >
              <option value="BANK_TRANSFER">BANK TRANSFER</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="CASH">CASH</option>
            </select>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <FileText className="size-4 text-slate-400" />
              Reference No.
            </label>
            <Input
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Cheque no / bank ref"
              className="h-12 rounded-2xl"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Wallet className="size-4 text-slate-400" />
              Amount
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-12 rounded-2xl text-right font-semibold"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Description of Payment
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff8a1e]/20"
              placeholder="Description of payment made..."
            />
          </div>
        </div>

        {selectedInvoice ? (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invoice</div>
              <div className="mt-1 text-base font-extrabold text-slate-950">{selectedInvoice.invoice_no}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Balance Due</div>
              <div className="mt-1 text-base font-extrabold text-slate-950">
                {money(n2(selectedInvoice.balance_amount))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#071b38] p-4 text-white ring-1 ring-white/10">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Payment Amount</div>
              <div className="mt-1 text-base font-extrabold text-white">{money(n2(amount))}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}