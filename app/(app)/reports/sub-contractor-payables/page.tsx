"use client";

import * as React from "react";
import Link from "next/link";
import { WalletCards, ArrowUpRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Row = {
  id: number;
  name: string;
  brn: string | null;
  vat_no: string | null;
  bills_count: number;
  total_billed: number;
  total_paid: number;
  total_outstanding: number;
};

function money(v: any) {
  const n = Number(v ?? 0);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SubContractorPayablesReportPage() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/reports/sub-contractor-payables", {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load payables report");
      }

      setRows(json.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load payables report");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  const totals = React.useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total_billed += Number(row.total_billed ?? 0);
        acc.total_paid += Number(row.total_paid ?? 0);
        acc.total_outstanding += Number(row.total_outstanding ?? 0);
        return acc;
      },
      { total_billed: 0, total_paid: 0, total_outstanding: 0 }
    );
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WalletCards className="h-7 w-7 text-slate-600" />
          <h1 className="text-2xl font-bold">Sub Contractor Payables</h1>
        </div>

        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? <div className="text-sm text-red-500">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm text-slate-500">Total Billed</div>
          <div className="mt-2 text-2xl font-bold">{money(totals.total_billed)}</div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm text-slate-500">Total Paid</div>
          <div className="mt-2 text-2xl font-bold">{money(totals.total_paid)}</div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm text-slate-500">Total Outstanding</div>
          <div className="mt-2 text-2xl font-bold text-[#071b38]">
            {money(totals.total_outstanding)}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Sub Contractor</th>
              <th className="p-3 text-left">BRN</th>
              <th className="p-3 text-left">VAT</th>
              <th className="p-3 text-right">Bills</th>
              <th className="p-3 text-right">Total Billed</th>
              <th className="p-3 text-right">Total Paid</th>
              <th className="p-3 text-right">Outstanding</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Loading report...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  No data found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{row.name}</td>
                  <td className="p-3">{row.brn ?? "—"}</td>
                  <td className="p-3">{row.vat_no ?? "—"}</td>
                  <td className="p-3 text-right">{row.bills_count}</td>
                  <td className="p-3 text-right">{money(row.total_billed)}</td>
                  <td className="p-3 text-right">{money(row.total_paid)}</td>
                  <td className="p-3 text-right font-semibold">
                    {money(row.total_outstanding)}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/sub-contractors/${row.id}/ledger`}
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