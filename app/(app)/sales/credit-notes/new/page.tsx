"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  FileText,
  Calendar,
  MapPin,
  Percent,
  Receipt,
  Sparkles,
  Loader2,
  Search,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Customer = {
  id: string | number;
  name?: string | null;
  customer_name?: string | null;
  vat_no?: string | null;
  brn?: string | null;
  address?: string | null;
};

type Item = {
  id: string;
  description: string;
  qty: string;
  price: string;
};

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-MU", {
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

function newItem(): Item {
  return {
    id: crypto.randomUUID(),
    description: "",
    qty: "1",
    price: "",
  };
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      msg = j?.error?.message ?? j?.error ?? j?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got ${ct || "unknown"}`);
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
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(700px_260px_at_16%_0%,rgba(7,27,56,0.10),transparent_60%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function NewCreditNotePage() {
  const router = useRouter();

  const [customerId, setCustomerId] = React.useState<string | number | null>(null);
  const [customerName, setCustomerName] = React.useState("");
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = React.useState(false);

  const [creditDate, setCreditDate] = React.useState(todayISO());
  const [siteAddress, setSiteAddress] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("MCB 000446509687");
  const [items, setItems] = React.useState<Item[]>([newItem()]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setCustomersLoading(true);
        const res = await safeGet<{ ok: boolean; data?: Customer[] }>("/api/customers");
        if (!alive) return;
        setCustomers(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!alive) return;
        setCustomers([]);
      } finally {
        if (alive) setCustomersLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filteredCustomers = React.useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);

    return customers
      .filter((c) => {
        const name = String(c.name ?? c.customer_name ?? "").toLowerCase();
        const vat = String(c.vat_no ?? "").toLowerCase();
        const brn = String(c.brn ?? "").toLowerCase();
        const address = String(c.address ?? "").toLowerCase();
        return (
          name.includes(q) ||
          vat.includes(q) ||
          brn.includes(q) ||
          address.includes(q)
        );
      })
      .slice(0, 10);
  }, [customers, customerQuery]);

  function selectCustomer(c: Customer) {
    const name = c.name ?? c.customer_name ?? "";
    setCustomerId(c.id ?? null);
    setCustomerName(name);
    setCustomerQuery(name);
    setCustomerOpen(false);
  }

  function updateItem(id: string, field: keyof Item, value: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [newItem()];
    });
  }

  const computedItems = React.useMemo(() => {
    return items.map((item) => {
      const qty = n2(item.qty || 0);
      const price = n2(item.price || 0);
      const total = round2(qty * price);

      return {
        ...item,
        qtyNumber: qty,
        priceNumber: price,
        total,
      };
    });
  }, [items]);

  const subtotal = round2(computedItems.reduce((sum, item) => sum + item.total, 0));
  const vat = round2(subtotal * 0.15);
  const total = round2(subtotal + vat);

  async function saveCreditNote() {
    try {
      setLoading(true);
      setError("");

      const cleanItems = computedItems
        .map((item) => ({
          description: String(item.description || "").trim(),
          qty: n2(item.qtyNumber),
          price: n2(item.priceNumber),
        }))
        .filter((item) => item.description && item.qty > 0);

      if (!customerId) {
        throw new Error("Please select a customer");
      }

      if (cleanItems.length === 0) {
        throw new Error("Please add at least one valid credit note item");
      }

      const res = await fetch("/api/credit-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: Number(customerId),
          credit_date: creditDate,
          site_address: siteAddress.trim() || null,
          reason: reason.trim() || null,
          notes: notes.trim() || null,
          vat_rate: 0.15,
          items: cleanItems,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error?.message ?? json?.error ?? "Failed to create credit note");
      }

      router.push(`/sales/credit-notes/${json.data.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create credit note");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/sales/credit-notes"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
              >
                <ArrowLeft className="size-4" />
                Back to credit notes
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200">
                  <Receipt className="size-3.5 text-slate-500" />
                  Credit Notes
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ff8a1e]/10 px-3 py-1.5 font-semibold text-[#c25708] ring-1 ring-[#ff8a1e]/20">
                  <Sparkles className="size-3.5" />
                  Premium Workflow
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200">
                  <Percent className="size-3.5 text-slate-500" />
                  VAT 15%
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                New Credit Note
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Create a premium KS Contracting credit note linked to a real customer record.
              </p>
            </div>

            <div className="flex gap-2">
              <Link href="/sales/credit-notes">
                <Button variant="outline" className="h-11 rounded-2xl">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>

              <Button
                onClick={saveCreditNote}
                disabled={loading}
                className="h-11 rounded-2xl bg-[#071b38] hover:bg-[#06142b]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Credit Note
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Card3D className="p-5">
        <div>
          <div className="text-sm font-semibold text-slate-900">Credit Note Details</div>
          <div className="mt-0.5 text-sm text-slate-600">
            Select customer, set date, site details, reason and bank note.
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Search className="size-4 text-slate-400" />
              Customer
            </label>

            <div className="relative">
              <Input
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setCustomerOpen(true);
                  setCustomerId(null);
                  setCustomerName("");
                }}
                onFocus={() => setCustomerOpen(true)}
                placeholder={customersLoading ? "Loading customers..." : "Search customer..."}
                className="h-11 rounded-2xl"
              />

              {customerOpen && (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                  {filteredCustomers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">No customers found</div>
                  ) : (
                    filteredCustomers.map((c) => {
                      const name = c.name ?? c.customer_name ?? "â€”";
                      return (
                        <button
                          key={String(c.id)}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectCustomer(c)}
                          className="w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                        >
                          <div className="font-semibold text-slate-900">{name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {c.address || "No address"}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 text-xs text-slate-500">
              {customerId ? `Selected customer ID: ${customerId}` : "Select an existing customer"}
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="size-4 text-slate-400" />
              Credit Note Date
            </label>
            <Input
              type="date"
              value={creditDate}
              onChange={(e) => setCreditDate(e.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="size-4 text-slate-400" />
              Site Address
            </label>
            <Input
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Enter site address"
              className="h-11 rounded-2xl"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#ff7a18]/25"
              placeholder="Reason for credit note..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Notes / Bank Details</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#ff7a18]/25"
              placeholder="MCB 000446509687"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Building2 className="size-4 text-slate-400" />
            Selected Customer
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {customerName || "No customer selected"}
          </div>
        </div>
      </Card3D>

      <Card3D className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Credit Note Items</div>
            <div className="mt-0.5 text-sm text-slate-600">
              Add returned items, service corrections or adjustment lines.
            </div>
          </div>

          <Button variant="outline" onClick={addItem} className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {computedItems.map((item, i) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Item {i + 1}</div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-red-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  type="button"
                  aria-label="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_160px]">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    Description
                  </label>
                  <textarea
                    className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#ff7a18]/25"
                    placeholder="Adjustment / returned amount / service correction..."
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Qty</label>
                  <Input
                    className="h-11 rounded-2xl text-right"
                    type="number"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    Unit Price
                  </label>
                  <Input
                    className="h-11 rounded-2xl text-right"
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, "price", e.target.value)}
                  />

                  <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-right ring-1 ring-slate-200">
                    <div className="text-[11px] font-semibold text-slate-500">Amount</div>
                    <div className="text-sm font-extrabold text-slate-900">{money(item.total)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card3D>

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

          <div className="mt-3 flex justify-between text-lg font-extrabold text-slate-950">
            <span>TOTAL</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
