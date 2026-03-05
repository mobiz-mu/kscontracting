"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Supplier = {
  id: number | string;
  name: string;
  brn?: string | null;
  vat_no?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string | null;
};

type ApiResp = { ok: boolean; data?: Supplier; error?: any };

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();
  if (!res.ok) {
    try {
      const j = JSON.parse(raw);
      throw new Error(j?.error?.message ?? j?.error ?? j?.message ?? `HTTP ${res.status}`);
    } catch {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`);
    }
  }
  if (!ct.includes("application/json")) throw new Error(`Expected JSON but got ${ct || "unknown"}`);
  return JSON.parse(raw) as T;
}

function getParamId(p: any): string {
  const raw = p?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

export default function SupplierDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = getParamId(params);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [supplier, setSupplier] = React.useState<Supplier | null>(null);

  const load = React.useCallback(async () => {
    if (!id) {
      setErr("Missing supplier id");
      setSupplier(null);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const j = await safeGet<ApiResp>(`/api/suppliers/${encodeURIComponent(id)}`);
      if (!j.ok) throw new Error(j?.error ?? "Supplier not found");
      setSupplier(j.data ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load supplier");
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="h-10 rounded-2xl border-slate-200 bg-white/70 hover:bg-white"
          onClick={() => router.push("/contacts/suppliers")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>

        <Button
          variant="outline"
          className="h-10 rounded-2xl border-slate-200 bg-white/70 hover:bg-white"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_14px_30px_rgba(15,23,42,0.06)]">
        <div className="text-xs font-semibold text-slate-500">SUPPLIER</div>
        <div className="mt-1 text-2xl font-extrabold text-slate-900">{supplier?.name ?? (loading ? "Loading…" : "—")}</div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-500">BRN</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{supplier?.brn ?? "—"}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-500">VAT NO</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{supplier?.vat_no ?? "—"}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-500">EMAIL</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{supplier?.email ?? "—"}</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-500">PHONE</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{supplier?.phone ?? "—"}</div>
          </div>

          <div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-500">ADDRESS</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{supplier?.address ?? "—"}</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          ID: <span className="font-semibold text-slate-800">{supplier?.id ?? "—"}</span>
        </div>

        <div className="mt-4">
          <Link href="/contacts/suppliers" className="text-sm font-semibold text-[#071b38] hover:underline">
            Back to suppliers list
          </Link>
        </div>
      </div>
    </div>
  );
}