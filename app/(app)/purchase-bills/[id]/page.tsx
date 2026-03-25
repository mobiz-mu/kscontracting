"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Calendar,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type BillItem = {
  id: number;
  description: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
};

type PurchaseBill = {
  id: number;
  bill_no: string;
  bill_date: string | null;
  due_date: string | null;
  status: string;
  description: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  notes: string | null;
  sub_contractors?: {
    id: number;
    name: string;
    brn?: string | null;
    vat_no?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  items: BillItem[];
};

function money(v: any) {
  const n = Number(v ?? 0);
  return `Rs ${n.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PurchaseBillDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String((params as any)?.id ?? "").trim();

  const [row, setRow] = React.useState<PurchaseBill | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/purchase-bills/${id}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load purchase bill");
      }

      setRow(json.data ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load purchase bill");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRow() {
    const ok = window.confirm("Are you sure you want to delete this purchase bill?");
    if (!ok) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/purchase-bills/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to delete purchase bill");
      }

      router.push("/purchase-bills");
    } catch (e: any) {
      alert(e?.message || "Failed to delete purchase bill");
    } finally {
      setDeleting(false);
    }
  }

  React.useEffect(() => {
    if (id) void load();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-slate-600">Loading purchase bill...</div>;
  }

  if (error || !row) {
    return <div className="p-6 text-rose-600">{error || "Purchase bill not found"}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/purchase-bills"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} />
            Back to purchase bills
          </Link>

          <h1 className="mt-2 text-2xl font-bold">{row.bill_no}</h1>
          <p className="mt-1 text-sm text-slate-500">Purchase Bill ID: {row.id}</p>
        </div>

        <div className="flex gap-2">
          <Link href={`/purchase-bills/${row.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>

          <Button variant="destructive" onClick={deleteRow} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Bill Items</h2>

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">VAT</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {row.items?.length ? (
                  row.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-right">{item.qty}</td>
                      <td className="p-3 text-right">{money(item.unit_price)}</td>
                      <td className="p-3 text-right">{money(item.vat_amount)}</td>
                      <td className="p-3 text-right font-semibold">
                        {money(item.line_total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {row.notes ? (
            <div className="mt-4 rounded-xl border bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-700">Notes</div>
              <div className="mt-1 text-sm text-slate-600">{row.notes}</div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">Bill Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <div className="text-slate-500">Bill No.</div>
                  <div className="font-medium">{row.bill_no}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <div className="text-slate-500">Sub Contractor</div>
                  <div className="font-medium">{row.sub_contractors?.name || "—"}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <div className="text-slate-500">Bill Date</div>
                  <div className="font-medium">{row.bill_date || "—"}</div>
                </div>
              </div>

              <div>
                <div className="text-slate-500">Due Date</div>
                <div className="font-medium">{row.due_date || "—"}</div>
              </div>

              <div>
                <div className="text-slate-500">Status</div>
                <div className="font-medium">{row.status}</div>
              </div>

              <div>
                <div className="text-slate-500">Description</div>
                <div className="font-medium">{row.description || "—"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">Amounts</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{money(row.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">VAT</span>
                <span className="font-medium">{money(row.vat_amount)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-medium">{money(row.total_amount)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Paid</span>
                <span className="font-medium">{money(row.paid_amount)}</span>
              </div>

              <div className="flex items-center justify-between border-t pt-3 text-base">
                <span className="font-semibold">Balance</span>
                <span className="font-bold text-[#071b38]">
                  {money(row.balance_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}