"use client";

import * as React from "react";
import Link from "next/link";
import { WalletCards, ArrowUpRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ReportFilterBar,
  downloadCsv,
  type ReportFilterValue,
} from "@/components/reports/ReportFilterBar";
import { resolveDateRange } from "@/lib/reports/period";
import { getErrorMessage } from "@/lib/utils";

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

function money(v: unknown) {
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

  const initialRange = resolveDateRange("this_month");
  const [filters, setFilters] = React.useState<ReportFilterValue>({
    period: "this_month",
    from: initialRange.from,
    to: initialRange.to,
    group: "month",
  });

  const load = React.useCallback(async (f: ReportFilterValue) => {
    try {
      setLoading(true);
      setError("");

      const range =
        f.period === "custom" ? { from: f.from, to: f.to } : resolveDateRange(f.period);

      const params = new URLSearchParams({
        period: f.period,
        from: range.from,
        to: range.to,
      });

      const res = await fetch(`/api/reports/sub-contractor-payables?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load payables report");
      }

      setRows(json.data ?? []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load payables report"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.period, filters.from, filters.to]);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <WalletCards className="h-7 w-7 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-900">Sub Contractor Payables</h1>
        </div>

        <Button variant="outline" onClick={() => void load(filters)} className="rounded-2xl">
          <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Refresh
        </Button>
      </div>

      <ReportFilterBar
        value={filters}
        onChange={setFilters}
        showGrouping={false}
        onExportCsv={() => downloadCsv("sub-contractor-payables.csv", rows)}
        onPrint={() => window.print()}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">Total Billed</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">
            {money(totals.total_billed)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">Total Paid</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">
            {money(totals.total_paid)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">Total Outstanding</div>
          <div className="mt-1 text-2xl font-extrabold text-[#071b38]">
            {money(totals.total_outstanding)}
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white sm:block">
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
                  No data found for this period.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{row.name}</td>
                  <td className="p-3 text-slate-600">{row.brn ?? "—"}</td>
                  <td className="p-3 text-slate-600">{row.vat_no ?? "—"}</td>
                  <td className="p-3 text-right text-slate-700">{row.bills_count}</td>
                  <td className="p-3 text-right text-slate-700">{money(row.total_billed)}</td>
                  <td className="p-3 text-right text-slate-700">{money(row.total_paid)}</td>
                  <td className="p-3 text-right font-semibold text-slate-900">
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

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Loading report...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No data found for this period.
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{row.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {row.bills_count} bill{row.bills_count === 1 ? "" : "s"}
                  </div>
                </div>
                <Link
                  href={`/sub-contractors/${row.id}/ledger`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  Open <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-500">Billed</div>
                  <div className="font-semibold text-slate-900">{money(row.total_billed)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Paid</div>
                  <div className="font-semibold text-slate-900">{money(row.total_paid)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Outstanding</div>
                  <div className="font-semibold text-[#071b38]">
                    {money(row.total_outstanding)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
