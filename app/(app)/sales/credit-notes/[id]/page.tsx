"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  Send,
  Calendar,
  MapPin,
  Percent,
  CheckCircle2,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, getErrorMessage } from "@/lib/utils";

type ApiCreditNote = {
  id: string;
  credit_no: string;
  customer_id?: number | null;
  customer_name?: string | null;
  invoice_id?: string | null;
  credit_date?: string | null;
  site_address?: string | null;
  reason?: string | null;
  notes?: string | null;
  subtotal?: number | null;
  vat_amount?: number | null;
  total_amount?: number | null;
  applied_amount?: number | null;
  remaining_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  issued_at?: string | null;
};

type ApiItem = {
  id: number | string;
  credit_note_id?: string;
  description: string;
  qty?: number | null;
  unit_price_excl_vat?: number | null;
  vat_rate?: number | null;
  vat_amount?: number | null;
  line_total?: number | null;

  // fallback for old shape if ever returned
  price?: number | null;
  total?: number | null;
};

type CreditNoteApiResponse = {
  ok: boolean;
  data?: {
    credit_note?: ApiCreditNote;
    items?: ApiItem[];
  };
  error?: string;
};

function n2(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(v: unknown) {
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

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getParamId(p: unknown): string {
  const raw = (p as Record<string, unknown> | null)?.id;
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

type ApplicationRow = {
  id: number;
  credit_note_id: string;
  invoice_id: string;
  amount: number;
  applied_at: string;
  reversed_at: string | null;
  invoices?: { invoice_no: string | null } | { invoice_no: string | null }[] | null;
};

type InvoiceOption = {
  id: string;
  invoice_no: string;
  balance_amount: number;
  status: string;
};

export default function CreditNoteDetailsPage() {
  const params = useParams();

  const id = React.useMemo(() => getParamId(params), [params]);
  const hasId = !!id && id !== "undefined" && id !== "null";

  const [loading, setLoading] = React.useState(false);
  const [issuing, setIssuing] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [creditNote, setCreditNote] = React.useState<ApiCreditNote | null>(null);
  const [items, setItems] = React.useState<ApiItem[]>([]);

  const [applications, setApplications] = React.useState<ApplicationRow[]>([]);
  const [invoiceOptions, setInvoiceOptions] = React.useState<InvoiceOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState("");
  const [applyAmount, setApplyAmount] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const [applyErr, setApplyErr] = React.useState("");

  const loadApplications = React.useCallback(async () => {
    if (!hasId) return;
    try {
      const res = await fetch(`/api/credit-notes/${id}/apply`, { cache: "no-store" });
      const j = await safeJson<{ ok: boolean; data?: ApplicationRow[] }>(res);
      setApplications(j.data ?? []);
    } catch {
      // non-fatal for page load
    }
  }, [id, hasId]);

  const loadInvoiceOptions = React.useCallback(async (customerId: number | null | undefined) => {
    if (!customerId) {
      setInvoiceOptions([]);
      return;
    }
    try {
      const res = await fetch(`/api/invoices?customerId=${customerId}&pageSize=200`, {
        cache: "no-store",
      });
      type InvoiceOptionRow = {
        id: string;
        invoice_no?: string | null;
        status?: string | null;
        balance_amount?: number | null;
      };
      const j = await safeJson<{ ok: boolean; data?: InvoiceOptionRow[] }>(res);
      const opts = (j.data ?? [])
        .filter((inv) => {
          const status = String(inv.status ?? "").toUpperCase();
          return status !== "DRAFT" && status !== "VOID" && n2(inv.balance_amount) > 0;
        })
        .map((inv) => ({
          id: inv.id,
          invoice_no: inv.invoice_no ?? "",
          balance_amount: n2(inv.balance_amount),
          status: inv.status ?? "",
        }));
      setInvoiceOptions(opts);
    } catch {
      setInvoiceOptions([]);
    }
  }, []);


  const load = React.useCallback(async () => {
    if (!hasId) return;

    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`/api/credit-notes/${id}`, { cache: "no-store" });
      const j = await safeJson<CreditNoteApiResponse>(res);

      if (!j.ok) throw new Error(j?.error ?? "Credit note not found");

      setCreditNote(j.data?.credit_note ?? null);
      setItems(Array.isArray(j.data?.items) ? j.data!.items! : []);

      void loadApplications();
      void loadInvoiceOptions(j.data?.credit_note?.customer_id ?? null);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to load credit note"));
      setCreditNote(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id, hasId, loadApplications, loadInvoiceOptions]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const applyCredit = React.useCallback(async () => {
    if (!hasId || !selectedInvoiceId) return;

    const amountNum = n2(applyAmount);
    if (amountNum <= 0) {
      setApplyErr("Enter an amount greater than 0.");
      return;
    }

    setApplying(true);
    setApplyErr("");

    try {
      const res = await fetch(`/api/credit-notes/${id}/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoice_id: selectedInvoiceId, amount: amountNum }),
      });

      const j = await safeJson<{ ok: boolean; error?: string }>(res);
      if (!j.ok) throw new Error(j?.error || "Failed to apply credit note");

      setSelectedInvoiceId("");
      setApplyAmount("");
      await load();
    } catch (e: unknown) {
      setApplyErr(getErrorMessage(e, "Failed to apply credit note"));
    } finally {
      setApplying(false);
    }
  }, [id, hasId, selectedInvoiceId, applyAmount, load]);

  const reverseApplication = React.useCallback(
    async (applicationId: number) => {
      setApplyErr("");
      try {
        const res = await fetch(`/api/credit-notes/${id}/apply`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ application_id: applicationId }),
        });
        const j = await safeJson<{ ok: boolean; error?: string }>(res);
        if (!j.ok) throw new Error(j?.error || "Failed to reverse application");
        await load();
      } catch (e: unknown) {
        setApplyErr(getErrorMessage(e, "Failed to reverse application"));
      }
    },
    [id, load]
  );

  const issueCreditNote = React.useCallback(async () => {
    if (!hasId) return;

    setIssuing(true);
    setErr("");

    try {
      const res = await fetch(`/api/credit-notes/${id}/issue`, {
        method: "POST",
        cache: "no-store",
      });

      const j = await safeJson<{ ok: boolean; error?: string }>(res);

      if (!j.ok) throw new Error("Issue failed");

      await load();
      window.open(`/sales/credit-notes/${id}/print`, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to issue credit note"));
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
              <Link
                href="/sales/credit-notes"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft size={16} />
                Back to credit notes
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  <FileText className="size-3.5 text-slate-500" />
                  KS CREDIT NOTE
                </span>

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

                {creditNote?.site_address ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-4 text-slate-400" />
                      Site:{" "}
                      <span className="font-semibold text-slate-900">
                        {creditNote.site_address}
                      </span>
                    </span>
                  </>
                ) : null}
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

              <Button
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white/70 shadow-sm hover:bg-white"
                disabled={!creditNote || !hasId}
                onClick={() =>
                  hasId &&
                  window.open(
                    `/sales/credit-notes/${id}/print`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <Printer className="mr-2 size-4" />
                Print / PDF
              </Button>

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

      <Card3D className="p-5">
        <div className="text-sm font-semibold text-slate-900">Credit Note Items</div>

        <div className="mt-4 overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                <th>Description</th>
                <th className="w-[110px] text-right">Qty</th>
                <th className="w-[160px] text-right">Unit Price</th>
                <th className="w-[160px] text-right">VAT</th>
                <th className="w-[170px] text-right">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                    No credit note items found.
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const qty = n2(it.qty);
                  const unitPrice = n2(it.unit_price_excl_vat ?? it.price);
                  const vatAmount = n2(it.vat_amount);
                  const total = n2(it.line_total ?? it.total);

                  return (
                    <tr key={String(it.id)}>
                      <td className="px-5 py-4 font-semibold text-slate-900 whitespace-pre-wrap break-words">
                        {it.description}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-700">
                        {qty}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {money(unitPrice)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-700">
                        {money(vatAmount)}
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                        {money(total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 ml-auto w-full max-w-[360px] space-y-2">
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

        {String(creditNote?.status ?? "").toUpperCase() === "ISSUED" ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-4" />
            Issued
          </div>
        ) : null}
      </Card3D>

      {String(creditNote?.status ?? "").toUpperCase() === "ISSUED" ? (
        <Card3D className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Apply to Invoice
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Reduce a customer invoice&apos;s outstanding balance using this
                credit note. Remaining credit:{" "}
                <span className="font-semibold text-slate-900">
                  {money(creditNote?.remaining_amount)}
                </span>
              </div>
            </div>
          </div>

          {n2(creditNote?.remaining_amount) <= 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
              This credit note has been fully applied.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#ff7a18] focus:ring-4 focus:ring-[#ff7a18]/10"
              >
                <option value="">Select an invoice…</option>
                {invoiceOptions.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_no} — balance {money(inv.balance_amount)}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Amount"
                value={applyAmount}
                onChange={(e) => setApplyAmount(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#ff7a18] focus:ring-4 focus:ring-[#ff7a18]/10"
              />

              <Button
                onClick={applyCredit}
                disabled={applying || !selectedInvoiceId || !applyAmount}
                className="h-11 rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
              >
                {applying ? <RefreshCw className="mr-2 size-4 animate-spin" /> : null}
                Apply
              </Button>
            </div>
          )}

          {invoiceOptions.length === 0 ? (
            <div className="mt-2 text-xs text-slate-400">
              No open invoices with a balance found for this customer.
            </div>
          ) : null}

          {applyErr ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {applyErr}
            </div>
          ) : null}

          {applications.length > 0 ? (
            <div className="mt-5">
              <div className="text-xs font-semibold text-slate-500">
                Application history
              </div>
              <div className="mt-2 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                {applications.map((app) => {
                  const invoiceNo = Array.isArray(app.invoices)
                    ? app.invoices[0]?.invoice_no
                    : app.invoices?.invoice_no;

                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {invoiceNo ?? app.invoice_id}
                        </div>
                        <div className="text-xs text-slate-500">
                          {fmtDate(app.applied_at)}
                          {app.reversed_at ? " • reversed" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">
                          {money(app.amount)}
                        </span>
                        {!app.reversed_at ? (
                          <button
                            type="button"
                            onClick={() => reverseApplication(app.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                          >
                            Reverse
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Card3D>
      ) : null}
    </div>
  );
}