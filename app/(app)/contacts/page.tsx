"use client";

import * as React from "react";
import { Plus, Search, Users, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

export default function ContactsPage() {
  const [q, setQ] = React.useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-500">Directory</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contacts</h1>
          <div className="mt-1 text-sm text-slate-600">
            Manage customers and suppliers (BRN/VAT, address, contact person).
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl">
            <Plus className="mr-2 size-4" />
            New Supplier
          </Button>
          <Button className="rounded-xl bg-[#071b38] text-white hover:bg-[#06142b]">
            <Plus className="mr-2 size-4" />
            New Customer
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, BRN, VAT, phone..."
              className="h-10 rounded-xl pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Pill>MUR</Pill>
            <Pill>Single Company</Pill>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <Users className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Customers</div>
                <div className="text-sm text-slate-600">Invoice recipients, SOA.</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              No customers loaded yet.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800">
                <Truck className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Suppliers</div>
                <div className="text-sm text-slate-600">Purchases & payable records.</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              No suppliers loaded yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}