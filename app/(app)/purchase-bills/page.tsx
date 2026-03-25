"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  ArrowUpRight,
  FileSpreadsheet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PurchaseBillRow = {
  id: number;
  bill_no: string;
  bill_date: string | null;
  due_date: string | null;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  sub_contractors?: {
    name?: string | null;
  } | null;
};

function money(v: any) {
  const n = Number(v ?? 0);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return v;
}

export default function PurchaseBillsPage() {
  const [rows, setRows] = React.useState<PurchaseBillRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/purchase-bills?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load purchase bills");
      }

      setRows(json.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load purchase bills");
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
          <FileSpreadsheet className="h-7 w-7 text-slate-600" />
          <h1 className="text-2xl font-bold">Purchase Bills</h1>
        </div>

        <Link href="/purchase-bills/new">
          <Button className="bg-[#071b38] hover:bg-[#06142b]">
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Bill
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative w-full max-w-[420px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search bill number or description..."
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
              <th className="p-3 text-left">Bill No.</th>
              <th className="p-3 text-left">Sub Contractor</th>
              <th className="p-3 text-left">Bill Date</th>
              <th className="p-3 text-left">Due Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Balance</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-500">
                  Loading purchase bills...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-500">
                  No purchase bills found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{row.bill_no}</td>
                  <td className="p-3">{row.sub_contractors?.name ?? "—"}</td>
                  <td className="p-3">{fmtDate(row.bill_date)}</td>
                  <td className="p-3">{fmtDate(row.due_date)}</td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3 text-right">{money(row.total_amount)}</td>
                  <td className="p-3 text-right">{money(row.paid_amount)}</td>
                  <td className="p-3 text-right font-semibold">
                    {money(row.balance_amount)}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/purchase-bills/${row.id}`}
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