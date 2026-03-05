"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Supplier = {
  id: number;
  name: string;
  brn?: string | null;
  vat_no?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function Page() {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function loadSuppliers() {
    try {
      setLoading(true);

      const url = search
        ? `/api/suppliers?q=${encodeURIComponent(search)}`
        : `/api/suppliers`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (json?.ok) {
        setSuppliers(json.data || []);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-slate-500">
            Manage vendors and suppliers
          </p>
        </div>

        <Link href="/contacts/suppliers/new">
          <Button className="bg-[#071b38] hover:bg-[#06142b]">
            <Plus className="mr-2 h-4 w-4" />
            New Supplier
          </Button>
        </Link>

      </div>

      {/* Search */}

      <div className="flex gap-3">

        <div className="relative w-full max-w-[400px]">

          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />

        </div>

        <Button
          variant="outline"
          onClick={loadSuppliers}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>

      </div>

      {/* Table */}

      <div className="rounded-xl border bg-white">

        <table className="w-full text-sm">

          <thead className="border-b bg-slate-50">

            <tr>

              <th className="p-3 text-left font-semibold">Supplier</th>
              <th className="p-3 text-left font-semibold">BRN</th>
              <th className="p-3 text-left font-semibold">VAT</th>
              <th className="p-3 text-left font-semibold">Email</th>
              <th className="p-3 text-left font-semibold">Phone</th>

            </tr>

          </thead>

          <tbody>

            {suppliers.map((s) => (

              <tr
                key={s.id}
                className="border-b hover:bg-slate-50"
              >

                <td className="p-3 font-medium">

                  <Link
                    href={`/contacts/suppliers/${s.id}`}
                    className="text-[#071b38] hover:underline"
                  >
                    {s.name}
                  </Link>

                </td>

                <td className="p-3">{s.brn || "-"}</td>
                <td className="p-3">{s.vat_no || "-"}</td>
                <td className="p-3">{s.email || "-"}</td>
                <td className="p-3">{s.phone || "-"}</td>

              </tr>

            ))}

            {!suppliers.length && !loading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No suppliers found
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}