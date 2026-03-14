"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, ArrowLeft, FileText, Calendar, MapPin, Percent } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type Item = {
  description: string;
  qty: number;
  price: number;
  total: number;
};

function Card3D({ children, className }: { children: React.ReactNode; className?: string }) {
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

export default function NewQuotationPage() {
  const router = useRouter();

  const [customerName, setCustomerName] = React.useState("");
  const [quoteDate, setQuoteDate] = React.useState(todayISO());
  const [siteAddress, setSiteAddress] = React.useState("");
  const [notes, setNotes] = React.useState("MCB 000446509687");

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
    setItems([...items, { description: "", qty: 1, price: 0, total: 0 }]);
  }

  function removeItem(index: number) {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length ? newItems : [{ description: "", qty: 1, price: 0, total: 0 }]);
  }

  const subtotal = round2(items.reduce((sum, i) => sum + n2(i.total), 0));
  const vat = round2(subtotal * 0.15);
  const total = round2(subtotal + vat);

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
          site_address: siteAddress,
          vat_rate: 0.15,
          notes,
          items: items.map((i) => ({
            description: i.description,
            qty: n2(i.qty),
            price: n2(i.price),
          })),
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
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/sales/quotations"
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft size={16} />
                Back to quotations
              </Link>

              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                New Quotation
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 font-semibold ring-1 ring-slate-200">
                  <FileText className="size-3.5 text-slate-500" />
                  KS QUOTATION
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 font-semibold ring-1 ring-slate-200">
                  <Percent className="size-3.5 text-slate-500" />
                  VAT 15%
                </span>
              </div>
            </div>

            <Button
              onClick={saveQuotation}
              disabled={loading}
              className="h-11 rounded-2xl bg-[#071b38] hover:bg-[#06142b]"
            >
              <Save className="mr-2 h-4 w-4" />
              Save quotation
            </Button>
          </div>
        </div>
      </div>

      {/* Customer info */}
      <Card3D className="p-5">
        <div>
          <div className="text-sm font-semibold text-slate-900">Quotation Details</div>
          <div className="mt-0.5 text-sm text-slate-600">
            KS quotation flow with fixed VAT 15%.
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <FileText className="size-4 text-slate-400" />
              Customer name
            </label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="h-11 rounded-2xl"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="size-4 text-slate-400" />
              Quote date
            </label>
            <Input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="size-4 text-slate-400" />
              Site address
            </label>
            <Input
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Albion"
              className="h-11 rounded-2xl"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Notes / Bank details
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
            placeholder="MCB 000446509687"
          />
        </div>
      </Card3D>

      {/* Items */}
      <Card3D className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Quotation Items</div>
            <div className="mt-0.5 text-sm text-slate-600">
              Bigger description field for KS work details.
            </div>
          </div>

          <Button variant="outline" onClick={addItem} className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {items.map((item, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_160px_auto] md:items-start">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
                    placeholder="Building or false ceiling as per quotation sent..."
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Qty</label>
                  <Input
                    className="h-11 rounded-2xl text-right"
                    type="number"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Unit Price</label>
                  <Input
                    className="h-11 rounded-2xl text-right"
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 md:pt-6">
                  <div className="rounded-2xl bg-white px-4 py-3 text-right ring-1 ring-slate-200">
                    <div className="text-[11px] font-semibold text-slate-500">Amount</div>
                    <div className="text-sm font-extrabold text-slate-900">{money(item.total)}</div>
                  </div>

                  <button
                    onClick={() => removeItem(i)}
                    className="grid h-11 place-items-center rounded-2xl bg-white ring-1 ring-slate-200 text-red-500 hover:bg-slate-50"
                    type="button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card3D>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-[360px] rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.08),0_18px_45px_rgba(15,23,42,0.10)]">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Sub Total</span>
            <span className="font-semibold text-slate-900">{money(subtotal)}</span>
          </div>

          <div className="mt-2 flex justify-between text-sm text-slate-600">
            <span>VAT 15%</span>
            <span className="font-semibold text-slate-900">{money(vat)}</span>
          </div>

          <div className="mt-3 h-px bg-slate-200" />

          <div className="mt-3 flex justify-between text-lg font-semibold">
            <span>TOTAL</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}