"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, Wallet } from "lucide-react";

type LedgerRow = {
  type: "BILL" | "PAYMENT";
  date: string;
  ref_no: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

type Payload = {
  sub_contractor: {
    id: number;
    name: string;
    brn: string | null;
    vat_no: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  bills: any[];
  payments: any[];
  ledger: LedgerRow[];
};

function money(v: any) {
  const n = Number(v ?? 0);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SubContractorLedgerPage() {
  const params = useParams<{ id: string }>();
  const id = String((params as any)?.id ?? "").trim();

  const [payload, setPayload] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/reports/sub-contractor-ledger/${id}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load ledger");
      }

      setPayload(json.data ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (id) void load();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-slate-600">Loading ledger...</div>;
  }

  if (error || !payload) {
    return <div className="p-6 text-rose-600">{error || "Ledger not found"}</div>;
  }

  const totalBilled = payload.ledger.reduce((s, x) => s + Number(x.debit ?? 0), 0);
  const totalPaid = payload.ledger.reduce((s, x) => s + Number(x.credit ?? 0), 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/reports/sub-contractor-payables"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to payables report
        </Link>

        <h1 className="mt-2 text-2xl font-bold">{payload.sub_contractor.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sub Contractor Ledger
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileSpreadsheet className="h-4 w-4" />
            Total Billed
          </div>
          <div className="mt-2 text-2xl font-bold">{money(totalBilled)}</div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Wallet className="h-4 w-4" />
            Total Paid
          </div>
          <div className="mt-2 text-2xl font-bold">{money(totalPaid)}</div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm text-slate-500">Outstanding</div>
          <div className="mt-2 text-2xl font-bold text-[#071b38]">
            {money(outstanding)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Ledger</h2>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {payload.ledger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No ledger entries
                  </td>
                </tr>
              ) : (
                payload.ledger.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">{row.date || "—"}</td>
                    <td className="p-3">{row.type}</td>
                    <td className="p-3">{row.ref_no || "—"}</td>
                    <td className="p-3">{row.description}</td>
                    <td className="p-3 text-right">{money(row.debit)}</td>
                    <td className="p-3 text-right">{money(row.credit)}</td>
                    <td className="p-3 text-right font-semibold">
                      {money(row.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}