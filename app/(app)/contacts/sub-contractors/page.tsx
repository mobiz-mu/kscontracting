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
  HardHat,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SubContractor = {
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
  data: SubContractor[];
  meta?: {
    total: number;
  };
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return d.toISOString().slice(0, 10);
}

export default function SubContractorsPage() {
  const [rows, setRows] = React.useState<SubContractor[]>([]);
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
      if (search.trim()) params.set("q", search.trim());
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/sub-contractors?${params.toString()}`, {
        cache: "no-store",
      });

      const json: APIResponse = await res.json();

      if (!res.ok) {
        throw new Error((json as any)?.error ?? "Failed to load sub contractors");
      }

      setRows(json.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load sub contractors");
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
          <HardHat className="h-7 w-7 text-slate-600" />
          <h1 className="text-2xl font-bold">Sub Contractors</h1>
        </div>

        <Link href="/contacts/sub-contractors/new">
          <Button className="bg-[#071b38] hover:bg-[#06142b]">
            <Plus className="mr-2 h-4 w-4" />
            New Sub Contractor
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative w-full max-w-[420px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search sub contractor..."
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
              <th className="p-3 text-left">Sub Contractor</th>
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
                  Loading sub contractors...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No sub contractors found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{row.name}</td>
                  <td className="p-3">{row.email ?? "—"}</td>
                  <td className="p-3">{row.phone ?? "—"}</td>
                  <td className="p-3">{row.vat_no ?? "—"}</td>
                  <td className="p-3">{row.brn ?? "—"}</td>
                  <td className="p-3">{fmtDate(row.created_at)}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/contacts/sub-contractors/${row.id}`}
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
          Next
        </Button>
      </div>
    </div>
  );
}