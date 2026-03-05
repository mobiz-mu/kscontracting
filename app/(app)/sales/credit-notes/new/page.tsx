"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Page() {
  return (
    <div className="space-y-4">

      <div className="flex items-center gap-2">

        <Link
          href="/sales/credit-notes"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

      </div>

      <h1 className="text-2xl font-bold">
        New Credit Note
      </h1>

      <p className="text-sm text-slate-500">
        Create a new credit note for a customer.
      </p>

      <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">
        Credit note creation form will appear here.
      </div>

    </div>
  );
}