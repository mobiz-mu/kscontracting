"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  vat_no: string | null;
  brn: string | null;
  created_at: string | null;
};

type APIResponse = {
  ok: boolean;
  data: Customer[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return d.toISOString().slice(0, 10);
}

export default function CustomersPage() {
  const [rows, setRows] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const pageSize = 25;

  async function load() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search) params.set("q", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/customers?${params}`, {
        cache: "no-store",
      });

      const json: APIResponse = await res.json();

      if (!res.ok) {
        throw new Error("Failed to load customers");
      }

      setRows(json.data ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-slate-600" />
          <h1 className="text-2xl font-bold">Customers</h1>
        </div>

        <Link href="/contacts/customers/new">
          <Button className="bg-[#071b38] hover:bg-[#06142b]">
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative w-full max-w-[420px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

          <Input
            placeholder="Search customer..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                void load();
              }
            }}
          />
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? <div className="text-sm text-red-500">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">VAT</th>
              <th className="p-3 text-left">BRN</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Loading customers...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No customers found
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{c.name}</td>

                  <td className="p-3">{c.email ?? "—"}</td>

                  <td className="p-3">{c.phone ?? "—"}</td>

                  <td className="p-3">{c.vat_no ?? "—"}</td>

                  <td className="p-3">{c.brn ?? "—"}</td>

                  <td className="p-3">{fmtDate(c.created_at)}</td>

                  <td className="p-3 text-right">
                    <Link
                      href={`/contacts/customers/${c.id}`}
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

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Prev
        </Button>

        <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}