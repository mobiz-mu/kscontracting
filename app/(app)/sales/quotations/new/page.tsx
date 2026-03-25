"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  FileText,
  Calendar,
  MapPin,
  Percent,
  Search,
  Hash,
  PencilLine,
  ListChecks,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CustomerMode = "LIST" | "MANUAL";

type Customer = {
  id: string | number;
  name?: string | null;
  customer_name?: string | null;
  email?: string | null;
  vat_no?: string | null;
  brn?: string | null;
  address?: string | null;
};

type Item = {
  id: string;
  description: string;
  qty: string;
  price: string;
  total: number;
};

function n2(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const x = Number(s);
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

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function parseQuoteNo(v: string) {
  const m = String(v || "").match(/(\d{1,})$/);
  return m ? Number(m[1]) : NaN;
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON. Got ${ct}.`);
  }

  return JSON.parse(text) as T;
}

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

  const [quotationNo, setQuotationNo] = React.useState("");
  const [quoteDate, setQuoteDate] = React.useState(todayISO());
  const [siteAddress, setSiteAddress] = React.useState("");
  const [notes, setNotes] = React.useState("MCB 000446509687");

  const [customerMode, setCustomerMode] = React.useState<CustomerMode>("LIST");
  const [customerId, setCustomerId] = React.useState<string | number | null>(null);
  const [customerName, setCustomerName] = React.useState("");
  const [customerVat, setCustomerVat] = React.useState("");
  const [customerBrn, setCustomerBrn] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState("");

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [custLoading, setCustLoading] = React.useState(false);
  const [custOpen, setCustOpen] = React.useState(false);
  const [custQuery, setCustQuery] = React.useState("");
  const [custActiveIdx, setCustActiveIdx] = React.useState(0);
  const custBoxRef = React.useRef<HTMLDivElement | null>(null);
  const custInputRef = React.useRef<HTMLInputElement | null>(null);

  const [items, setItems] = React.useState<Item[]>([
    { id: crypto.randomUUID(), description: "", qty: "", price: "", total: 0 },
  ]);

  const [loading, setLoading] = React.useState(false);

  const filteredCustomers = React.useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    const list = customers || [];
    if (!q) return list.slice(0, 8);

    return list
      .filter((c) => {
        const name = (c.name ?? c.customer_name ?? "").toLowerCase();
        const vatNo = (c.vat_no ?? "").toLowerCase();
        const brn = (c.brn ?? "").toLowerCase();
        const address = (c.address ?? "").toLowerCase();
        return name.includes(q) || vatNo.includes(q) || brn.includes(q) || address.includes(q);
      })
      .slice(0, 10);
  }, [customers, custQuery]);

  function updateItem(index: number, field: keyof Item, value: any) {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    const qty = n2(newItems[index].qty);
    const price = n2(newItems[index].price);
    newItems[index].total = round2(qty * price);

    setItems(newItems);
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", qty: "", price: "", total: 0 },
    ]);
  }

  function removeItem(index: number) {
    const newItems = items.filter((_, i) => i !== index);
    setItems(
      newItems.length
        ? newItems
        : [{ id: crypto.randomUUID(), description: "", qty: "", price: "", total: 0 }]
    );
  }

  function selectCustomer(c: Customer) {
    const name = c.name ?? c.customer_name ?? "";
    setCustomerMode("LIST");
    setCustomerId(c.id ?? null);
    setCustomerName(name);
    setCustomerVat(c.vat_no ?? "");
    setCustomerBrn(c.brn ?? "");
    setCustomerAddress(c.address ?? "");
    setCustQuery(name);
    setCustOpen(false);
  }

  function enableManualCustomer() {
    setCustomerMode("MANUAL");
    setCustomerId(null);
    setCustOpen(false);
  }

  function validateBeforeSave() {
    if (!quotationNo.trim()) return "Quotation number is required.";
    if (!quoteDate.trim()) return "Quotation date is required.";

    if (customerMode === "LIST") {
      if (!customerId || !Number.isFinite(Number(customerId))) {
        return "Select a customer from the list or switch to manual customer.";
      }
    } else {
      if (!customerName.trim()) {
        return "Customer name is required.";
      }
    }

    const cleanItems = items
      .map((i) => ({
        description: String(i.description ?? "").trim(),
        qty: n2(i.qty),
        price: n2(i.price),
      }))
      .filter((i) => i.description.length > 0);

    if (cleanItems.length === 0) {
      return "Add at least one quotation item with description.";
    }

    return "";
  }

  const subtotal = round2(items.reduce((sum, i) => sum + n2(i.total), 0));
  const vat = round2(subtotal * 0.15);
  const total = round2(subtotal + vat);

  async function saveQuotation() {
    try {
      const v = validateBeforeSave();
      if (v) {
        alert(v);
        return;
      }

      setLoading(true);

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
         quote_no: quotationNo,
         quotation_no: quotationNo,
         customer_id: customerMode === "LIST" && customerId ? Number(customerId) : null,
         customer_name: customerName || null,
         customer_vat: customerVat || null,
         customer_brn: customerBrn || null,
         customer_address: customerAddress || null,
         quote_date: quoteDate,
         site_address: siteAddress || null,
         vat_rate: 0.15,
         notes,
         items: items
           .map((i) => ({
            description: String(i.description ?? "").trim(),
             qty: n2(i.qty),
             price: n2(i.price),
        }))
         .filter((i) => i.description),
       }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create quotation");
      }

      router.push(`/sales/quotations/${json.data.quotation.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  function onCustomerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!custOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustActiveIdx((i) => Math.min(i + 1, Math.max(0, filteredCustomers.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filteredCustomers[custActiveIdx];
      if (pick) selectCustomer(pick);
    }
  }

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const j = await safeGet<{ ok: boolean; data?: any[] }>("/api/quotations?page=1&pageSize=200");
        const data = (j?.data ?? []) as Array<{ quotation_no?: string; quote_no?: string }>;

        const nums = data
          .map((x) => parseQuoteNo(x.quotation_no || x.quote_no || ""))
          .filter((n) => Number.isFinite(n)) as number[];

        const max = nums.length ? Math.max(...nums) : NaN;

        let nextNum = 1;
        if (Number.isFinite(max)) {
          nextNum = max + 1;
        } else {
          let last = 0;
          try {
            last = Number(localStorage.getItem("ks.quotation.lastNo") || "0") || 0;
          } catch {}
          nextNum = last + 1;
        }

        try {
          localStorage.setItem("ks.quotation.lastNo", String(nextNum));
        } catch {}

        if (!alive) return;
        setQuotationNo(`QUO-${pad4(nextNum)}`);
      } catch {
        if (!alive) return;
        setQuotationNo(`QUO-${pad4(1)}`);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setCustLoading(true);
      try {
        const j = await safeGet<{ ok: boolean; data?: any[] }>("/api/customers");
        const list = (j?.data ?? []) as Customer[];
        if (!alive) return;
        setCustomers(list);
      } catch {
        if (!alive) return;
        setCustomers([]);
      } finally {
        if (alive) setCustLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!custBoxRef.current) return;
      if (custBoxRef.current.contains(t)) return;
      setCustOpen(false);
    }

    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  return (
    <div className="space-y-4">
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
                  <Hash className="size-3.5 text-slate-500" />
                  {quotationNo || "—"}
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

      <Card3D className="p-5">
        <div>
          <div className="text-sm font-semibold text-slate-900">Quotation Details</div>
          <div className="mt-0.5 text-sm text-slate-600">
            KS quotation flow with fixed VAT 15%, customer selection, and manual entry option.
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Hash className="size-4 text-slate-400" />
              Quotation number
            </label>
            <Input
              value={quotationNo}
              onChange={(e) => setQuotationNo(e.target.value)}
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
              placeholder="Enter site address"
              className="h-11 rounded-2xl"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCustomerMode("LIST")}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold ring-1 transition",
              customerMode === "LIST"
                ? "bg-[#ff8a1e] text-white ring-[#ff8a1e]"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            )}
          >
            <ListChecks className="size-4" />
            Select from List
          </button>

          <button
            type="button"
            onClick={enableManualCustomer}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold ring-1 transition",
              customerMode === "MANUAL"
                ? "bg-[#071b38] text-white ring-[#071b38]"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            )}
          >
            <PencilLine className="size-4" />
            Manual Customer
          </button>
        </div>

        <div className="mt-4" ref={custBoxRef}>
          <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Search className="size-4 text-slate-400" />
            Search customer
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              ref={custInputRef}
              value={custQuery}
              onChange={(e) => {
                setCustQuery(e.target.value);
                setCustOpen(true);
                setCustActiveIdx(0);
              }}
              onFocus={() => setCustOpen(true)}
              onKeyDown={onCustomerKeyDown}
              disabled={customerMode === "MANUAL"}
              placeholder={custLoading ? "Loading customers..." : "Search name, VAT, BRN, address..."}
              className="h-11 rounded-2xl pl-10"
            />
          </div>

          {customerMode === "LIST" && custOpen && (
            <div className="mt-2 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
              <div className="max-h-[300px] overflow-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-slate-600">No customers found.</div>
                ) : (
                  filteredCustomers.map((c, idx) => {
                    const name = c.name ?? c.customer_name ?? "—";
                    const active = idx === custActiveIdx;

                    return (
                      <button
                        key={String(c.id ?? idx)}
                        type="button"
                        onMouseEnter={() => setCustActiveIdx(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCustomer(c)}
                        className={cn(
                          "w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0",
                          active ? "bg-[#ff8a1e]/6" : "hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
                            <div className="mt-0.5 truncate text-xs text-slate-600">
                              {c.address ? c.address : "—"}
                            </div>
                          </div>
                          <div className="shrink-0 text-right text-xs text-slate-500">
                            {c.vat_no ? <div>VAT: {c.vat_no}</div> : null}
                            {c.brn ? <div>BRN: {c.brn}</div> : null}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <FileText className="size-4 text-slate-400" />
              Customer name
            </label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={customerMode === "MANUAL" ? "Enter customer name" : "Selected customer name"}
              className="h-11 rounded-2xl"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Percent className="size-4 text-slate-400" />
              Customer VAT No.
            </label>
            <Input
              value={customerVat}
              onChange={(e) => setCustomerVat(e.target.value)}
              placeholder="Enter VAT number"
              className="h-11 rounded-2xl"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Hash className="size-4 text-slate-400" />
              Customer BRN No.
            </label>
            <Input
              value={customerBrn}
              onChange={(e) => setCustomerBrn(e.target.value)}
              placeholder="Enter BRN number"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Customer address
            </label>
            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]/25"
              placeholder="Customer address"
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

      <Card3D className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Quotation Items</div>
            <div className="mt-0.5 text-sm text-slate-600">
              Bigger description field for KS work details, with empty numeric fields until you type.
            </div>
          </div>

          <Button variant="outline" onClick={addItem} className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {items.map((item, i) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
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
                    inputMode="decimal"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Unit Price</label>
                  <Input
                    className="h-11 rounded-2xl text-right"
                    type="number"
                    inputMode="decimal"
                    placeholder="Price"
                    value={item.price}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
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