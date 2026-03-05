"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type Item = {
  description: string;
  qty: number;
  price: number;
  total: number;
};

export default function NewQuotationPage() {
  const router = useRouter();

  const [customerName, setCustomerName] = React.useState("");
  const [quoteDate, setQuoteDate] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");

  const [items, setItems] = React.useState<Item[]>([
    { description: "", qty: 1, price: 0, total: 0 },
  ]);

  const [loading, setLoading] = React.useState(false);

  function updateItem(index: number, field: keyof Item, value: any) {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    const qty = n2(newItems[index].qty);
    const price = n2(newItems[index].price);

    newItems[index].total = round2(qty * price);

    setItems(newItems);
  }

  function addItem() {
    setItems([
      ...items,
      { description: "", qty: 1, price: 0, total: 0 },
    ]);
  }

  function removeItem(index: number) {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  }

  const subtotal = items.reduce((sum, i) => sum + n2(i.total), 0);

  async function saveQuotation() {
    try {
      setLoading(true);

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: customerName,
          quote_date: quoteDate,
          valid_until: validUntil,
          items,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create quotation");
      }

      router.push(`/sales/quotations/${json.data.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/sales/quotations"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} />
            Back to quotations
          </Link>

          <h1 className="mt-2 text-2xl font-bold">New Quotation</h1>
        </div>

        <Button
          onClick={saveQuotation}
          disabled={loading}
          className="bg-[#071b38] hover:bg-[#06142b]"
        >
          <Save className="mr-2 h-4 w-4" />
          Save quotation
        </Button>
      </div>

      {/* Customer Info */}
      <div className="rounded-2xl border p-6 space-y-4 bg-white">

        <div className="grid md:grid-cols-3 gap-4">

          <div>
            <label className="text-sm text-slate-600">
              Customer name
            </label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Quote date
            </label>
            <Input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">
              Valid until
            </label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border bg-white">

        <div className="p-4 border-b font-semibold">
          Quotation Items
        </div>

        <div className="p-4 space-y-4">

          {items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 items-center"
            >
              <Input
                className="col-span-5"
                placeholder="Description"
                value={item.description}
                onChange={(e) =>
                  updateItem(i, "description", e.target.value)
                }
              />

              <Input
                className="col-span-2"
                type="number"
                placeholder="Qty"
                value={item.qty}
                onChange={(e) =>
                  updateItem(i, "qty", e.target.value)
                }
              />

              <Input
                className="col-span-2"
                type="number"
                placeholder="Price"
                value={item.price}
                onChange={(e) =>
                  updateItem(i, "price", e.target.value)
                }
              />

              <Input
                className="col-span-2"
                value={item.total}
                readOnly
              />

              <button
                onClick={() => removeItem(i)}
                className="col-span-1 text-red-500"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addItem}
            className="mt-3"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>

        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-[280px] rounded-2xl border p-4 bg-white">

          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>Rs {subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-semibold text-lg mt-3">
            <span>Total</span>
            <span>Rs {subtotal.toFixed(2)}</span>
          </div>

        </div>
      </div>

    </div>
  );
}