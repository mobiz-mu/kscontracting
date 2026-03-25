"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SubContractor = {
  id: number;
  name: string;
};

type PurchaseBill = {
  id: number;
  bill_no: string;
  balance_amount: number;
  sub_contractor_id: number;
};

function money(v: any) {
  const n = Number(v ?? 0);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function NewSubContractorPaymentPage() {
  const router = useRouter();

  const [subContractors, setSubContractors] = React.useState<SubContractor[]>([]);
  const [bills, setBills] = React.useState<PurchaseBill[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);

  const [paymentNo, setPaymentNo] = React.useState("");
  const [subContractorId, setSubContractorId] = React.useState("");
  const [purchaseBillId, setPurchaseBillId] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [referenceNo, setReferenceNo] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);

        const [subsRes, billsRes] = await Promise.all([
          fetch("/api/sub-contractors", { cache: "no-store" }),
          fetch("/api/purchase-bills", { cache: "no-store" }),
        ]);

        const subsJson = await subsRes.json();
        const billsJson = await billsRes.json();

        if (subsRes.ok && subsJson?.ok) {
          setSubContractors(subsJson.data ?? []);
        }

        if (billsRes.ok && billsJson?.ok) {
          setBills(
            (billsJson.data ?? []).filter(
              (x: any) => Number(x.balance_amount ?? 0) > 0 && x.status !== "VOID"
            )
          );
        }
      } finally {
        setLoadingData(false);
      }
    }

    void loadData();
  }, []);

  const filteredBills = React.useMemo(() => {
    if (!subContractorId) return bills;
    return bills.filter(
      (b) => String(b.sub_contractor_id) === String(subContractorId)
    );
  }, [bills, subContractorId]);

  const selectedBill = React.useMemo(() => {
    return filteredBills.find((b) => String(b.id) === String(purchaseBillId)) ?? null;
  }, [filteredBills, purchaseBillId]);

  async function save() {
    try {
      if (!paymentNo.trim()) {
        alert("Payment number required");
        return;
      }

      if (!subContractorId) {
        alert("Select a sub contractor");
        return;
      }

      if (!paymentDate) {
        alert("Payment date required");
        return;
      }

      const numericAmount = Number(amount || 0);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        alert("Enter a valid payment amount");
        return;
      }

      if (selectedBill && numericAmount > Number(selectedBill.balance_amount ?? 0)) {
        alert("Payment amount cannot exceed the selected bill balance");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/sub-contractor-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_no: paymentNo.trim(),
          sub_contractor_id: Number(subContractorId),
          purchase_bill_id: purchaseBillId ? Number(purchaseBillId) : null,
          payment_date: paymentDate,
          payment_method: paymentMethod.trim() || null,
          reference_no: referenceNo.trim() || null,
          amount: numericAmount,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to create payment");
      }

      router.push("/sub-contractor-payments");
    } catch (e: any) {
      alert(e?.message || "Failed to create payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[760px] space-y-6">
      <div>
        <Link
          href="/sub-contractor-payments"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to sub contractor payments
        </Link>

        <h1 className="mt-2 text-2xl font-bold">New Sub Contractor Payment</h1>
      </div>

      <div className="space-y-5 rounded-xl border bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">Payment No *</label>
            <Input value={paymentNo} onChange={(e) => setPaymentNo(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-slate-600">Payment Date *</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Sub Contractor *</label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={subContractorId}
              onChange={(e) => {
                setSubContractorId(e.target.value);
                setPurchaseBillId("");
              }}
              disabled={loadingData}
            >
              <option value="">Select sub contractor</option>
              {subContractors.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Purchase Bill</label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={purchaseBillId}
              onChange={(e) => setPurchaseBillId(e.target.value)}
            >
              <option value="">Unallocated / General payment</option>
              {filteredBills.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.bill_no} — {money(row.balance_amount)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Payment Method</label>
            <Input
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Bank transfer / Cash / Cheque"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Reference No</label>
            <Input
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Bank ref / cheque no"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Amount *</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            {selectedBill ? (
              <p className="mt-1 text-xs text-slate-500">
                Selected bill balance: {money(selectedBill.balance_amount)}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#071b38] hover:bg-[#06142b]"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Payment
          </Button>
        </div>
      </div>
    </div>
  );
}