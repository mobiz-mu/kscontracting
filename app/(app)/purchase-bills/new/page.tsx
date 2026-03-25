"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SubContractor = {
  id: number;
  name: string;
};

type LineItem = {
  description: string;
  qty: string;
  unit_price: string;
  vat_rate: string;
};

function money(v: number) {
  return `Rs ${v.toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function NewPurchaseBillPage() {
  const router = useRouter();

  const [subContractors, setSubContractors] = React.useState<SubContractor[]>([]);
  const [loadingSubs, setLoadingSubs] = React.useState(true);

  const [billNo, setBillNo] = React.useState("");
  const [subContractorId, setSubContractorId] = React.useState("");
  const [billDate, setBillDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = React.useState("");
  const [status, setStatus] = React.useState("DRAFT");
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const [items, setItems] = React.useState<LineItem[]>([
    { description: "", qty: "1", unit_price: "0", vat_rate: "15" },
  ]);

  React.useEffect(() => {
    async function loadSubs() {
      try {
        setLoadingSubs(true);
        const res = await fetch("/api/sub-contractors", { cache: "no-store" });
        const json = await res.json();
        if (res.ok && json?.ok) {
          setSubContractors(json.data ?? []);
        }
      } finally {
        setLoadingSubs(false);
      }
    }

    void loadSubs();
  }, []);

  function updateItem(index: number, key: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", qty: "1", unit_price: "0", vat_rate: "15" },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const totals = React.useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + n2(item.qty) * n2(item.unit_price),
      0
    );
    const vat = items.reduce(
      (sum, item) =>
        sum + n2(item.qty) * n2(item.unit_price) * (n2(item.vat_rate) / 100),
      0
    );
    const total = subtotal + vat;

    return { subtotal, vat, total };
  }, [items]);

  async function save() {
    try {
      if (!billNo.trim()) {
        alert("Bill number required");
        return;
      }

      if (!subContractorId) {
        alert("Select a sub contractor");
        return;
      }

      const validItems = items.filter((x) => x.description.trim() !== "");
      if (validItems.length === 0) {
        alert("At least one item is required");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/purchase-bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bill_no: billNo.trim(),
          sub_contractor_id: Number(subContractorId),
          bill_date: billDate,
          due_date: dueDate || null,
          status,
          description: description.trim() || null,
          notes: notes.trim() || null,
          items: validItems.map((item) => ({
            description: item.description.trim(),
            qty: n2(item.qty),
            unit_price: n2(item.unit_price),
            vat_rate: n2(item.vat_rate),
          })),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to create purchase bill");
      }

      router.push(`/purchase-bills/${json.data.id}`);
    } catch (e: any) {
      alert(e?.message || "Failed to create purchase bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/purchase-bills"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to purchase bills
        </Link>

        <h1 className="mt-2 text-2xl font-bold">New Purchase Bill</h1>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">Bill No *</label>
            <Input value={billNo} onChange={(e) => setBillNo(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-slate-600">Sub Contractor *</label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={subContractorId}
              onChange={(e) => setSubContractorId(e.target.value)}
              disabled={loadingSubs}
            >
              <option value="">Select sub contractor</option>
              {subContractors.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Bill Date *</label>
            <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-slate-600">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-slate-600">Status</label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ISSUED">ISSUED</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="PAID">PAID</option>
              <option value="VOID">VOID</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="General bill description"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bill Items</h2>
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Qty</th>
                  <th className="p-3 text-left">Unit Price</th>
                  <th className="p-3 text-left">VAT %</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        placeholder="Work description"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(index, "qty", e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(index, "unit_price", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        value={item.vat_rate}
                        onChange={(e) =>
                          updateItem(index, "vat_rate", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />
        </div>

        <div className="ml-auto max-w-[320px] space-y-2 rounded-xl border bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>VAT</span>
            <span>{money(totals.vat)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#071b38] hover:bg-[#06142b]"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Purchase Bill
          </Button>
        </div>
      </div>
    </div>
  );
}