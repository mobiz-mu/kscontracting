"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, ArrowUpRight, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PaymentRow = {
  id: number;
  payment_no: string;
  payment_date: string;
  payment_method: string | null;
  reference_no: string | null;
  amount: number;
  sub_contractors?: { name?: string | null } | null;
  purchase_bills?: { bill_no?: string | null } | null;
};

function money(v: any) {
  const n = Number(v ?? 0);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SubContractorPaymentsPage() {
  const [rows, setRows] = React.useState<PaymentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/sub-contractor-payments?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load payments");
      }

      setRows(json.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-7 w-7 text-slate-600" />
          <h1 className="text-2xl font-bold">Sub Contractor Payments</h1>
        </div>

        <Link href="/sub-contractor-payments/new">
          <Button className="bg-[#071b38] hover:bg-[#06142b]">
            <Plus className="mr-2 h-4 w-4" />
            New Payment
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative w-full max-w-[420px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search payment no or reference..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
          />
        </div>

        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? <div className="text-sm text-red-500">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Payment No.</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Sub Contractor</th>
              <th className="p-3 text-left">Purchase Bill</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-left">Reference</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Loading payments...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  No payments found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{row.payment_no}</td>
                  <td className="p-3">{row.payment_date || "—"}</td>
                  <td className="p-3">{row.sub_contractors?.name ?? "—"}</td>
                  <td className="p-3">{row.purchase_bills?.bill_no ?? "—"}</td>
                  <td className="p-3">{row.payment_method ?? "—"}</td>
                  <td className="p-3">{row.reference_no ?? "—"}</td>
                  <td className="p-3 text-right font-semibold">{money(row.amount)}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/sub-contractors/ledger?sub_contractor_payment_id=${row.id}`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      Open
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}