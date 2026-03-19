"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  Send,
  Calendar,
  MapPin,
  Percent,
  CheckCircle2,
  User,
  FileText,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ApiCreditNote = {
  id: string;
  credit_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_vat?: string | null;
  customer_brn?: string | null;
  customer_address?: string | null;
  invoice_id?: string | null;
  credit_date?: string | null;
  reason?: string | null;
  notes?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  applied_amount?: number | null;
  remaining_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
};

type ApiItem = {
  id: number | string;
  credit_note_id: string;
  description: string;
  qty: number;
  unit_price_excl_vat?: number | null;
  vat_rate?: number | null;
  vat_amount?: number | null;
  line_total?: number | null;
  price?: number | null;
  total?: number | null;
};

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(v: any) {
  const n = n2(v);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [yyyy, mm, dd] = v.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}`;
}

function getParamId(p: any): string {
  const raw = p?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

function statusStyle(s?: string | null) {
  const key = String(s ?? "").toUpperCase();
  if (key === "ISSUED") return "bg-blue-50 text-blue-700 border-blue-200";
  if (key === "DRAFT") return "bg-slate-100 text-slate-700 border-slate-200";
  if (key === "VOID") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    try {
      const j = JSON.parse(raw);
      throw new Error(j?.error?.message ?? j?.error ?? j?.message ?? `HTTP ${res.status}`);
    } catch {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 180)}`);
    }
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON. Got ${ct || "unknown"}: ${raw.slice(0, 120)}`);
  }

  return JSON.parse(raw) as T;
}

function Card3D({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/80",
        "shadow-[0_1px_0_rgba(15,23,42,0.08),0_18px_45px_rgba(15,23,42,0.10)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(700px_260px_at_16%_0%,rgba(7,27,56,0.12),transparent_60%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function CreditNoteDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const id = React.useMemo(() => getParamId(params), [params]);
  const hasId = !!id && id !== "undefined" && id !== "null";

  const [loading, setLoading] = React.useState(false);
  const [issuing, setIssuing] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [creditNote, setCreditNote] = React.useState<ApiCreditNote | null>(null);
  const [items, setItems] = React.useState<ApiItem[]>([]);

  const load = React.useCallback(async () => {
    if (!hasId) return;

    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`/api/credit-notes/${id}`, { cache: "no-store" });
      const j = await safeJson<{
        ok: boolean;
        data?: { credit_note?: ApiCreditNote; items?: ApiItem[] };
        error?: any;
      }>(res);

      if (!j.ok) throw new Error(j?.error ?? "Credit note not found");

      setCreditNote(j.data?.credit_note ?? null);
      setItems(Array.isArray(j.data?.items) ? j.data!.items! : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load credit note");
      setCreditNote(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id, hasId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const issueCreditNote = React.useCallback(async () => {
    if (!hasId) return;

    setIssuing(true);
    setErr("");

    try {
      const res = await fetch(`/api/credit-notes/${id}/issue`, {
        method: "POST",
        cache: "no-store",
      });

      const j = await safeJson<{ ok: boolean; error?: any }>(res);
      if (!j.ok) throw new Error("Issue failed");

      await load();
      window.open(
        `/sales/credit-notes/${id}/print`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to issue credit note");
    } finally {
      setIssuing(false);
    }
  }, [id, hasId, load]);

  const canIssue = String(creditNote?.status ?? "").toUpperCase() === "DRAFT";

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />

        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                  onClick={() => router.push("/sales/credit-notes")}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Back to credit notes
                </Button>

                {creditNote ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                      statusStyle(creditNote.status)
                    )}
                  >
                    {String(creditNote.status ?? "—")}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {creditNote?.credit_no || (loading ? "Loading…" : "Credit Note")}
              </h1>

              <div className="mt-1 text-sm text-slate-600">
                Customer:{" "}
                <span className="font-semibold text-slate-900">
                  {creditNote?.customer_name || "—"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="size-4 text-slate-400" />
                  Date:{" "}
                  <span className="font-semibold text-slate-900">
                    {fmtDate(creditNote?.credit_date ?? null)}
                  </span>
                </span>

                <span className="text-slate-300">•</span>

                <span className="inline-flex items-center gap-2">
                  <Percent className="size-4 text-slate-400" />
                  VAT: <span className="font-semibold text-slate-900">15%</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                onClick={load}
                disabled={loading || !hasId}
              >
                <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                Refresh
              </Button>

              <Link href={hasId ? `/sales/credit-notes/${id}/print` : "#"}>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                  disabled={!creditNote || !hasId}
                >
                  <Printer className="mr-2 size-4" />
                  Print / PDF
                </Button>
              </Link>

              <Button
                onClick={issueCreditNote}
                disabled={!canIssue || issuing || !hasId}
                className="h-11 rounded-2xl bg-[#ff7a18] text-white hover:bg-[#ff6a00]"
              >
                {issuing ? (
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Issue & Print
              </Button>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card3D className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="size-4 text-slate-400" />
            Credit Note Items
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                  <th>Description</th>
                  <th className="w-[110px] text-right">Qty</th>
                  <th className="w-[160px] text-right">Unit Price</th>
                  <th className="w-[120px] text-right">VAT</th>
                  <th className="w-[170px] text-right">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      No credit note items found.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={String(it.id)}>
                      <td className="px-5 py-4 font-semibold text-slate-900 whitespace-pre-wrap break-words">
                        {it.description}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-700">
                        {it.qty}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {money(it.unit_price_excl_vat ?? it.price)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-700">
                        {money(it.vat_amount)}
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                        {money(it.line_total ?? it.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {creditNote?.reason ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Reason</div>
              <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {creditNote.reason}
              </div>
            </div>
          ) : null}

          {creditNote?.notes ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Notes</div>
              <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {creditNote.notes}
              </div>
            </div>
          ) : null}
        </Card3D>

        <div className="space-y-4">
          <Card3D className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <User className="size-4 text-slate-400" />
              Customer Details
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">Customer</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {creditNote?.customer_name || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">VAT No.</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {creditNote?.customer_vat || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">BRN No.</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {creditNote?.customer_brn || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="size-3.5" />
                  Address
                </div>
                <div className="mt-1 whitespace-pre-wrap font-semibold text-slate-900">
                  {creditNote?.customer_address || "—"}
                </div>
              </div>
            </div>
          </Card3D>

          <Card3D className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="size-4 text-slate-400" />
              Totals
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Sub Total</span>
                <span className="font-semibold text-slate-900">
                  {money(creditNote?.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>VAT 15%</span>
                <span className="font-semibold text-slate-900">
                  {money(creditNote?.vat_amount)}
                </span>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">TOTAL</span>
                <span className="font-extrabold text-slate-900">
                  {money(creditNote?.total_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Applied Amount</span>
                <span className="font-semibold text-slate-900">
                  {money(creditNote?.applied_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Remaining Amount</span>
                <span className="font-semibold text-slate-900">
                  {money(creditNote?.remaining_amount)}
                </span>
              </div>
            </div>

            {String(creditNote?.status ?? "").toUpperCase() === "ISSUED" ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-4" />
                Issued
              </div>
            ) : null}
          </Card3D>
        </div>
      </div>
    </div>
  );
}