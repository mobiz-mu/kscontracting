"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  MessageSquareText,
  ReceiptText,
  Save,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================
   Helpers
========================================= */

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(v: any) {
  const n = n2(v);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function safePost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let parsed: any = null;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!res.ok) {
    throw new Error(parsed?.error?.message ?? parsed?.error ?? parsed?.message ?? `HTTP ${res.status}`);
  }

  return parsed as T;
}

/* =========================================
   UI atoms
========================================= */

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

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white",
        "shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "slate",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: "slate" | "blue" | "orange" | "emerald";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 ring-slate-200 text-slate-700",
    blue: "bg-blue-50 ring-blue-200 text-blue-700",
    orange: "bg-orange-50 ring-orange-200 text-orange-700",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-700",
  };

  return (
    <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">
            {label}
          </div>
          <div className="mt-2 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            {value}
          </div>
          {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
        </div>

        <div className={cn("grid size-11 place-items-center rounded-2xl ring-1 sm:size-12", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-semibold text-slate-800">
      {children}
      {required ? <span className="ml-1 text-rose-600">*</span> : null}
    </label>
  );
}

/* =========================================
   Types
========================================= */

type PaymentResponse = {
  ok: boolean;
  message?: string;
  data?: {
    payment?: any;
    invoice?: {
      id: string;
      invoice_no: string;
      status: string;
      total_amount: number;
      paid_amount: number;
      balance_amount: number;
    };
  };
  error?: any;
};

/* =========================================
   Page
========================================= */

const METHOD_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "JUICE", label: "Juice" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
] as const;

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const invoiceId = (searchParams.get("invoiceId") ?? "").trim();
  const invoiceNo = (searchParams.get("invoiceNo") ?? "").trim();
  const amountHint = n2(searchParams.get("amount"));

  const [paymentDate, setPaymentDate] = React.useState(todayYMD());
  const [amount, setAmount] = React.useState(amountHint > 0 ? String(amountHint) : "");
  const [method, setMethod] = React.useState<string>("BANK_TRANSFER");
  const [referenceNo, setReferenceNo] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  const numericAmount = n2(amount);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!invoiceId) {
      setErrorMsg("Missing invoice id.");
      return;
    }

    if (numericAmount <= 0) {
      setErrorMsg("Please enter a valid payment amount.");
      return;
    }

    try {
      setSaving(true);

      const res = await safePost<PaymentResponse>(
        `/api/invoices/${encodeURIComponent(invoiceId)}/payments`,
        {
          payment_date: paymentDate,
          amount: numericAmount,
          method,
          reference_no: referenceNo.trim() || null,
          notes: notes.trim() || null,
        }
      );

      if (!res.ok) {
        throw new Error(res?.error?.message ?? res?.error ?? "Failed to add payment");
      }

      const updatedInvoice = res?.data?.invoice;
      setSuccessMsg(res?.message || "Payment added successfully.");

      if (updatedInvoice) {
        setAmount(updatedInvoice.balance_amount > 0 ? String(updatedInvoice.balance_amount) : "");
      }

      setTimeout(() => {
        if (updatedInvoice?.id) {
          router.push(`/sales/invoices/${encodeURIComponent(updatedInvoice.id)}`);
        } else {
          router.push("/sales/invoices");
        }
      }, 900);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to add payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Surface className="overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#071b38_0%,#0d2c59_48%,#163d73_100%)]" />
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(900px_320px_at_-10%_-20%,rgba(255,255,255,0.14),transparent_55%),radial-gradient(700px_300px_at_110%_0%,rgba(255,153,51,0.20),transparent_50%)]" />

        <div className="relative px-4 py-5 sm:px-6 sm:py-6 xl:px-7 xl:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip className="bg-white/12 text-white ring-white/15">
                  <Wallet className="size-3.5 text-white/85" />
                  Payment Entry
                </Chip>

                <Chip className="bg-[#ff8a1e]/18 text-[#ffd6ad] ring-[#ffb266]/20">
                  <BadgeCheck className="size-3.5" />
                  Collections
                </Chip>

                <Chip className="bg-white text-[#071b38] ring-white/80">
                  <Building2 className="size-3.5 text-[#071b38]" />
                  KS Contracting
                </Chip>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl xl:text-[2rem]">
                Add Payment
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-50/90 sm:text-[15px]">
                Premium collections form for recording invoice payments with clean financial controls,
                Mauritius currency formatting, and executive-grade clarity.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/sales/invoices">
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white backdrop-blur-sm hover:bg-white/16 hover:text-white"
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Register
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Surface>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoCard
          icon={ReceiptText}
          label="Invoice"
          value={invoiceNo || "—"}
          sub={invoiceId ? "Ready for payment posting" : "Missing invoice reference"}
          tone="blue"
        />

        <InfoCard
          icon={CircleDollarSign}
          label="Suggested Amount"
          value={money(amountHint)}
          sub="Current outstanding from invoice register"
          tone="orange"
        />

        <InfoCard
          icon={Wallet}
          label="Entered Amount"
          value={money(numericAmount)}
          sub="This payment will be recorded in MUR"
          tone={numericAmount > 0 ? "emerald" : "slate"}
        />
      </div>

      {/* Form */}
      <Surface>
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="text-base font-bold tracking-tight text-slate-950">
            Payment Details
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Enter the collection details below and save the payment to update the invoice balance.
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            {/* Left */}
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel required>Invoice Number</FieldLabel>
                  <Input
                    value={invoiceNo}
                    readOnly
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-semibold text-slate-900"
                    placeholder="Invoice number"
                  />
                </div>

                <div>
                  <FieldLabel required>Payment Date</FieldLabel>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-12 rounded-2xl pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Amount Received</FieldLabel>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      Rs
                    </div>
                    <Input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-12 rounded-2xl pl-12 font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Payment Method</FieldLabel>
                  <div className="relative">
                    <Landmark className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className={cn(
                        "h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition",
                        "focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      )}
                    >
                      {METHOD_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <FieldLabel>Reference Number</FieldLabel>
                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="Bank ref / cheque no / transaction ref"
                      className="h-12 rounded-2xl pl-10"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <div className="relative">
                    <MessageSquareText className="pointer-events-none absolute left-3.5 top-4 size-4 text-slate-400" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes about this payment..."
                      className={cn(
                        "min-h-[130px] w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 pt-3 text-sm text-slate-900 shadow-sm outline-none transition",
                        "focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right summary */}
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-[#071b38] text-white">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Collection Summary</div>
                    <div className="text-xs text-slate-500">Final review before saving</div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Invoice</span>
                    <span className="font-bold text-slate-900">{invoiceNo || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Payment Date</span>
                    <span className="font-semibold text-slate-900">{paymentDate || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Method</span>
                    <span className="font-semibold text-slate-900">
                      {METHOD_OPTIONS.find((m) => m.value === method)?.label || method}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-700">Amount to Record</span>
                      <span className="text-xl font-extrabold tracking-tight text-[#071b38]">
                        {money(numericAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {successMsg ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                </div>
              ) : null}

              {errorMsg ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMsg}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                <Button
                  type="submit"
                  onClick={onSubmit}
                  disabled={saving || !invoiceId}
                  className="h-12 rounded-2xl bg-[#071b38] text-white shadow-[0_16px_40px_rgba(7,27,56,0.18)] hover:bg-[#0a2750]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving Payment...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" />
                      Save Payment
                    </>
                  )}
                </Button>

                <Link href="/sales/invoices" className="w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full rounded-2xl"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </form>
      </Surface>
    </div>
  );
}