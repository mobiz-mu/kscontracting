"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getParamId(params: unknown): string {
  const p = params as any;
  const raw = p?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

function isValidId(id: string) {
  if (!id) return false;
  if (id === "undefined" || id === "null") return false;
  return true;
}

export default function Page() {
  const params = useParams();
  const id = getParamId(params);
  const hasId = isValidId(id);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  // Inject A4 print CSS
  React.useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-ks-print", "1");
    style.innerHTML = `
      @page { size: A4; margin: 12mm; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .ks-print-hide { display: none !important; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  async function load() {
    if (!hasId) {
      setErr("Missing credit note id");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      // Placeholder until you add /api/credit-notes/[id]
      await new Promise((r) => setTimeout(r, 200));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load credit note");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="px-3 py-3 sm:px-6 sm:py-6">
      {/* Controls (not printed) */}
      <div className="ks-print-hide">
        <div className="relative overflow-hidden rounded-[24px] ring-1 ring-slate-200/70 bg-white/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(2,6,23,0.10)]">
          <div className="relative px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Link href={hasId ? `/sales/credit-notes/${encodeURIComponent(id)}` : "/sales/credit-notes"}>
                  <Button variant="outline" className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white">
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  onClick={load}
                  className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
                  disabled={loading}
                >
                  <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => window.print()}
                  className="rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_14px_40px_rgba(7,27,56,0.18)]"
                  disabled={!hasId}
                  title={!hasId ? "Missing credit note id" : "Print / Save PDF"}
                >
                  <Printer className="mr-2 size-4" />
                  Print / Save PDF
                </Button>
              </div>
            </div>

            {err ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {err}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Printable content */}
      <div className="mt-3 rounded-3xl bg-white ring-1 ring-slate-200 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">CREDIT NOTE</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              KS CONTRACTING LTD
            </h1>
            <div className="mt-1 text-sm text-slate-600">Mauritius</div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">Credit Note ID</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {hasId ? id : "—"}
            </div>
            <div className="mt-2 text-xs text-slate-500">Currency: MUR (Rs)</div>
          </div>
        </div>

        <div className="mt-6 h-px bg-slate-200" />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">Bill To</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">—</div>
            <div className="mt-1 text-sm text-slate-600">Customer details will appear here.</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold text-slate-600">Details</div>
            <div className="mt-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-900">—</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-900">—</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                <th>Description</th>
                <th className="w-[90px] text-right">Qty</th>
                <th className="w-[140px] text-right">Unit</th>
                <th className="w-[140px] text-right">VAT</th>
                <th className="w-[160px] text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-4 text-slate-700" colSpan={5}>
                  Placeholder print template. Connect API `/api/credit-notes/[id]` to render real rows.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="text-sm text-slate-600">
            <div className="text-xs font-semibold text-slate-500">Notes</div>
            <div className="mt-2">
              This is a minimal placeholder so your build passes. Next step: wire the credit note API and map items/totals.
            </div>
          </div>

          <div className="ml-auto w-full max-w-[420px] rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">Rs 0.00</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
              <span>VAT</span>
              <span className="font-semibold text-slate-900">Rs 0.00</span>
            </div>
            <div className="mt-3 h-px bg-slate-200" />
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="font-extrabold text-slate-900">Rs 0.00</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          Generated by KS Accounting • Print layout: A4
        </div>
      </div>
    </div>
  );
}