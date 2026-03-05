"use client";

import { FileText, Receipt, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function Card({
  title,
  desc,
  icon,
  cta,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  cta: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-600">{desc}</div>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl">
          <Download className="mr-2 size-4" />
          {cta}
        </Button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-slate-500">Insights</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <div className="mt-1 text-sm text-slate-600">
          VAT-ready reports, sales performance, and customer statements (SOA).
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Statement of Account (SOA)"
          desc="Running balance per customer. Export-ready view."
          icon={<FileText className="size-5" />}
          cta="Export"
        />
        <Card
          title="VAT Report"
          desc="Summary + detailed lines. Audit-safe totals."
          icon={<Receipt className="size-5" />}
          cta="Export"
        />
        <Card
          title="Sales Report"
          desc="Invoices, collections, and aging overview."
          icon={<BarChart3 className="size-5" />}
          cta="Export"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-600">
        Next: connect these to your SQL views (SOA + VAT summary + VAT lines).
      </div>
    </div>
  );
}