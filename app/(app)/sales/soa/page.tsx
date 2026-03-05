"use client";

import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SalesSOAPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-500">Reports</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Statement of Account (SOA)</h1>
          <div className="mt-1 text-sm text-slate-600">
            Running balance per customer — export-ready and audit-safe.
          </div>
        </div>
        <Button variant="outline" className="rounded-xl">
          <Download className="mr-2 size-4" />
          Export
        </Button>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
            <FileText className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">SOA View</div>
            <div className="text-sm text-slate-600">Next: connect to SQL view + filters.</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-600">
          SOA data will appear here.
        </div>
      </div>
    </div>
  );
}