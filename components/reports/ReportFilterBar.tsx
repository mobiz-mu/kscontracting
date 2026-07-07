"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { GroupByKey, QuickFilterKey } from "@/lib/reports/period";

const QUICK_FILTERS: { key: QuickFilterKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_quarter", label: "This quarter" },
  { key: "last_quarter", label: "Last quarter" },
  { key: "this_year", label: "This year" },
  { key: "last_year", label: "Last year" },
  { key: "financial_year", label: "Financial year" },
  { key: "custom", label: "Custom" },
];

const GROUP_OPTIONS: { key: GroupByKey; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "month", label: "Monthly" },
  { key: "quarter", label: "Quarterly" },
  { key: "year", label: "Yearly" },
];

export type ReportFilterValue = {
  period: QuickFilterKey;
  from: string;
  to: string;
  group: GroupByKey;
};

export function ReportFilterBar({
  value,
  onChange,
  showGrouping = true,
  onExportCsv,
  onPrint,
}: {
  value: ReportFilterValue;
  onChange: (next: ReportFilterValue) => void;
  showGrouping?: boolean;
  onExportCsv?: () => void;
  onPrint?: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onChange({ ...value, period: f.key })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                value.period === f.key
                  ? "bg-[#071b38] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {value.period === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                From
                <input
                  type="date"
                  value={value.from}
                  onChange={(e) => onChange({ ...value, from: e.target.value })}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-[#ff7a18] focus:ring-4 focus:ring-[#ff7a18]/10"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                To
                <input
                  type="date"
                  value={value.to}
                  onChange={(e) => onChange({ ...value, to: e.target.value })}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-[#ff7a18] focus:ring-4 focus:ring-[#ff7a18]/10"
                />
              </label>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              {value.from} → {value.to}
            </div>
          )}

          {showGrouping ? (
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {GROUP_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => onChange({ ...value, group: g.key })}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                    value.group === g.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="ml-auto flex gap-2">
            {onExportCsv ? (
              <button
                type="button"
                onClick={onExportCsv}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </button>
            ) : null}
            {onPrint ? (
              <button
                type="button"
                onClick={onPrint}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Print
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Simple client-side CSV export for an array of flat objects. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
