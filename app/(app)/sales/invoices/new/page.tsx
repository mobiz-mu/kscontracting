"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Send,
  Search,
  Command,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Percent,
  Calendar,
  Hash,
  Building2,
  BadgeCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* =========================================
   Types
========================================= */

type Row = { id: string; description: string; qty: number; price: number };

type Customer = {
  id: string | number;
  name?: string | null;
  customer_name?: string | null;
  email?: string | null;
  vat_no?: string | null;
  brn?: string | null;
  address?: string | null;
};

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function money(n: number) {
  return `Rs ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function plusDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function parseInvNo(inv: string) {
  const m = String(inv || "").match(/(\d{1,})$/);
  return m ? Number(m[1]) : NaN;
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  if (!ct.includes("application/json")) throw new Error(`Expected JSON. Got ${ct}.`);
  return JSON.parse(text) as T;
}

/* =========================================
   UI atoms
========================================= */

function Chip({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: "slate" | "orange" | "blue" | "emerald";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
    orange: "bg-[#ff7a18]/10 text-[#c25708] ring-1 ring-[#ff7a18]/20",
    blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

function Card3D({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-3xl bg-white",
        "ring-1 ring-slate-200/80",
        "shadow-[0_1px_0_rgba(15,23,42,0.08),0_18px_45px_rgba(15,23,42,0.10)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:opacity-90",
        "before:bg-[radial-gradient(60%_60%_at_22%_10%,rgba(7,27,56,0.10),transparent_60%)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(180deg,rgba(255,255,255,0.85),transparent_55%)] opacity-55" />
      <div className="relative">{children}</div>
    </div>
  );
}

function SpotlightShell({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-[2px] rounded-[22px] bg-[linear-gradient(90deg,rgba(255,122,24,0.55),rgba(255,122,24,0.10),rgba(255,122,24,0.55))]" />
      <div
        className={cn(
          "pointer-events-none absolute -inset-6 rounded-[28px] opacity-0 transition-opacity duration-300",
          active && "opacity-100",
          "bg-[radial-gradient(400px_140px_at_40%_10%,rgba(255,122,24,0.14),transparent_70%)]"
        )}
      />
      <div className="relative rounded-[20px] bg-white/80 backdrop-blur-xl ring-1 ring-slate-200/70 shadow-[0_12px_34px_rgba(2,6,23,0.08)]">
        {children}
      </div>
    </div>
  );
}

function IconLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
      <Icon className="size-4 text-slate-400" />
      <span>{label}</span>
    </div>
  );
}

/* =========================================
   Page
========================================= */

export default function NewInvoicePage() {
  const [saving, setSaving] = React.useState(false);
  const [issuing, setIssuing] = React.useState(false);
  const busy = saving || issuing;

  const [err, setErr] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);

  const [invoiceId, setInvoiceId] = React.useState<string | null>(null);

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [custLoading, setCustLoading] = React.useState(false);

  const [custOpen, setCustOpen] = React.useState(false);
  const [custQuery, setCustQuery] = React.useState("");
  const [custActiveIdx, setCustActiveIdx] = React.useState(0);
  const custBoxRef = React.useRef<HTMLDivElement | null>(null);
  const custInputRef = React.useRef<HTMLInputElement | null>(null);
  const [spotlight, setSpotlight] = React.useState(false);

  const [invoiceNo, setInvoiceNo] = React.useState("");
  const [invoiceDate, setInvoiceDate] = React.useState(todayISO());
  const [dueDate, setDueDate] = React.useState(plusDaysISO(30));

  const [customerId, setCustomerId] = React.useState<string | number | null>(null);
  const [customerName, setCustomerName] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerVat, setCustomerVat] = React.useState("");
  const [customerBrn, setCustomerBrn] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState("");

  const [vatRate, setVatRate] = React.useState(0.15);

  const [rows, setRows] = React.useState<Row[]>([{ id: crypto.randomUUID(), description: "", qty: 1, price: 0 }]);

  const descRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const qtyRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const priceRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const subtotal = React.useMemo(() => rows.reduce((s, r) => s + n2(r.qty) * n2(r.price), 0), [rows]);
  const vat = React.useMemo(() => subtotal * vatRate, [subtotal, vatRate]);
  const total = React.useMemo(() => subtotal + vat, [subtotal, vat]);

  const filteredCustomers = React.useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    const list = customers || [];
    if (!q) return list.slice(0, 8);
    return list
      .filter((c) => {
        const name = (c.name ?? c.customer_name ?? "").toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        const vatNo = (c.vat_no ?? "").toLowerCase();
        const brn = (c.brn ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || vatNo.includes(q) || brn.includes(q);
      })
      .slice(0, 10);
  }, [customers, custQuery]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow(focus: "desc" | "qty" | "price" = "desc") {
    const id = crypto.randomUUID();
    setRows((p) => [...p, { id, description: "", qty: 1, price: 0 }]);
    requestAnimationFrame(() => {
      if (focus === "desc") descRefs.current[id]?.focus();
      if (focus === "qty") qtyRefs.current[id]?.focus();
      if (focus === "price") priceRefs.current[id]?.focus();
    });
  }

  function removeRow(id: string) {
    setRows((p) => {
      const next = p.filter((r) => r.id !== id);
      return next.length ? next : [{ id: crypto.randomUUID(), description: "", qty: 1, price: 0 }];
    });
  }

  function selectCustomer(c: Customer) {
    const name = c.name ?? c.customer_name ?? "";
    setCustomerId(c.id ?? null);
    setCustomerName(name);
    setCustomerEmail(c.email ?? "");
    setCustomerVat(c.vat_no ?? "");
    setCustomerBrn(c.brn ?? "");
    setCustomerAddress(c.address ?? "");
    setCustQuery(name);
    setCustOpen(false);
    setSpotlight(false);
    const first = rows[0]?.id;
    if (first) requestAnimationFrame(() => descRefs.current[first]?.focus());
  }

  function setVatPreset(p: 0 | 15) {
    setVatRate(p === 0 ? 0 : 0.15);
  }

  function validateBeforeSave() {
    if (!String(invoiceNo || "").trim()) return "Invoice number is required.";
    if (!String(invoiceDate || "").trim()) return "Invoice date is required.";
    if (!String(dueDate || "").trim()) return "Due date is required.";

    if (!customerId || !Number.isFinite(Number(customerId))) return "Select a customer (required).";

    const lines = rows.map((r) => ({ ...r, description: String(r.description ?? "").trim() })).filter((r) => r.description.length > 0);
    if (lines.length === 0) return "Add at least one invoice item with a description.";

    return "";
  }

  function buildPayload(status: "DRAFT" | "ISSUED") {
    return {
      id: invoiceId ?? undefined,
      status,
      customer_id: Number(customerId),
      invoice_date: invoiceDate,
      due_date: dueDate,
      vat_rate: vatRate,
      subtotal,
      vat_amount: vat,
      total_amount: total,
      paid_amount: 0,
      balance_amount: total,
      notes: null,
      rows: rows.map((r) => ({ description: r.description, qty: r.qty, price: r.price })),
    };
  }

  async function saveToServer(status: "DRAFT" | "ISSUED") {
  const payload = buildPayload(status);

  const res = await fetch("/api/invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  const j = ct.includes("application/json") ? JSON.parse(text) : null;

  if (!res.ok || !j?.ok) {
    throw new Error(j?.error?.message ?? j?.error ?? `Save failed (HTTP ${res.status})`);
  }

  // Your API returns: { ok:true, data:{ invoice:{ id, invoice_no... }, items:[...] } }
  const inv = j.data?.invoice;
  const id = String(inv?.id ?? "").trim();

  if (!id) throw new Error("Save succeeded but invoice id is missing in response.");

  setInvoiceId(id);
  if (inv?.invoice_no) setInvoiceNo(String(inv.invoice_no));

  return id;
}

  async function onSaveDraft() {
    const v = validateBeforeSave();
    if (v) return setErr(v);

    setSaving(true);
    setErr("");
    try {
      await saveToServer("DRAFT");
      setToast("Draft saved.");
      window.setTimeout(() => setToast(null), 2200);
    } catch (e: any) {
      setErr(e?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

 async function onIssue() {
  const v = validateBeforeSave();
  if (v) {
    setErr(v);
    return;
  }

  setIssuing(true);
  setErr("");

  try {
    const id = await saveToServer("DRAFT");

    const issueRes = await fetch(`/api/invoices/${encodeURIComponent(id)}/issue`, { method: "POST" });
    const issueJson = await issueRes.json().catch(() => null);

    if (!issueRes.ok || !issueJson?.ok) {
      throw new Error(issueJson?.error?.message ?? issueJson?.error ?? `Issue failed (HTTP ${issueRes.status})`);
    }

    window.open(`/sales/invoices/${encodeURIComponent(id)}/print`, "_blank", "noopener,noreferrer");
    window.location.href = `/sales/invoices/${encodeURIComponent(id)}`;
  } catch (e: any) {
    setErr(e?.message || "Failed to issue invoice");
  } finally {
    setIssuing(false);
  }
} 

  // Auto invoice number generation (best-effort)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const key = "ks.invoice.lastNo";
        const j = await safeGet<{ ok: boolean; data?: any[] }>("/api/invoices?page=1&pageSize=80");
        const data = (j?.data ?? []) as Array<{ invoice_no?: string }>;
        const nums = data.map((x) => parseInvNo(x.invoice_no || "")).filter((n) => Number.isFinite(n)) as number[];
        const max = nums.length ? Math.max(...nums) : NaN;

        let nextNum = 1;
        if (Number.isFinite(max)) nextNum = max + 1;
        else {
          let last = 0;
          try {
            last = Number(localStorage.getItem(key) || "0") || 0;
          } catch {}
          nextNum = last + 1;
        }

        try {
          localStorage.setItem(key, String(nextNum));
        } catch {}

        if (!alive) return;
        setInvoiceNo(`INV-${pad4(nextNum)}`);
      } catch {
        if (!alive) return;
        setInvoiceNo(`INV-${pad4(1)}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load customers
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

  // Close dropdown on outside click
  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!custBoxRef.current) return;
      if (custBoxRef.current.contains(t)) return;
      setCustOpen(false);
      setSpotlight(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        custInputRef.current?.focus();
        setCustOpen(true);
        setSpotlight(true);
        return;
      }

      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        addRow("desc");
        return;
      }

      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void onSaveDraft();
        return;
      }

      if (meta && e.key === "Enter") {
        e.preventDefault();
        void onIssue();
        return;
      }

      if (e.key === "Escape") {
        setCustOpen(false);
        setSpotlight(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, customerId, invoiceNo, invoiceDate, dueDate, vatRate, invoiceId]);

  function onRowKeyDown(e: React.KeyboardEvent, rowId: string, field: "desc" | "qty" | "price") {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const idx = rows.findIndex((r) => r.id === rowId);
    const isLast = idx === rows.length - 1;

    if (field === "desc") return qtyRefs.current[rowId]?.focus();
    if (field === "qty") return priceRefs.current[rowId]?.focus();
    if (field === "price") {
      if (isLast) addRow("desc");
      else {
        const nextId = rows[idx + 1]?.id;
        if (nextId) descRefs.current[nextId]?.focus();
      }
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

  const showPreview = true;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(900px_460px_at_12%_-20%,rgba(7,27,56,0.14),transparent_60%),radial-gradient(700px_420px_at_110%_-10%,rgba(255,122,24,0.14),transparent_60%),linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]" />
        <div className="relative px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="blue">
                  <Building2 className="size-3.5" />
                  Sales
                </Chip>
                <Chip tone="orange">
                  <BadgeCheck className="size-3.5" />
                  Enterprise Invoice
                </Chip>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">New Invoice</h1>

              <div className="mt-1 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">MUR</span> •{" "}
                <span className="text-slate-500">⌘K Customer • ⌥N Add row • ⌘S Save • ⌘↵ Issue</span>
              </div>

              {invoiceId ? (
                <div className="mt-2 text-xs text-slate-500">
                  Saved ID: <span className="font-mono text-slate-700">{invoiceId}</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/sales/invoices">
                <Button variant="outline" className="rounded-2xl h-11 bg-white/70 shadow-sm hover:bg-white" disabled={busy}>
                  <ArrowLeft className="mr-2 size-4" />
                  Back
                </Button>
              </Link>

              <Button
                onClick={onSaveDraft}
                disabled={busy}
                variant="outline"
                className="rounded-2xl h-11 bg-white/70 shadow-sm hover:bg-white"
                title="Ctrl/Cmd + S"
              >
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Save Draft
              </Button>

              <Button
                onClick={onIssue}
                disabled={busy}
                className="rounded-2xl h-11 bg-[#071b38] text-white hover:bg-[#06142b] shadow-[0_16px_44px_rgba(7,27,56,0.18)]"
                title="Ctrl/Cmd + Enter"
              >
                {issuing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Issue & Print
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="slate">
                <Hash className="size-3.5" />
                {invoiceNo || "INV-—"}
              </Chip>
              <Chip tone="slate">
                <Calendar className="size-3.5" />
                {invoiceDate}
              </Chip>
              <Chip tone="slate">
                <Percent className="size-3.5" />
                VAT {Math.round(vatRate * 100)}%
              </Chip>
            </div>

            {toast ? (
              <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl px-4 py-2">
                {toast}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>
      ) : null}

      <div className={cn("grid grid-cols-1 gap-4", showPreview && "xl:grid-cols-[1.25fr_0.75fr]")}>
        {/* LEFT */}
        <div className="space-y-4">
          {/* Meta */}
          <Card3D className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Invoice Details</div>
                <div className="mt-0.5 text-sm text-slate-600">Dates, number & VAT preset — audit-ready.</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone="orange">MUR</Chip>
                <Button size="sm" variant="outline" className={cn("h-9 rounded-2xl", vatRate === 0 && "ring-2 ring-[#ff7a18]/25")} onClick={() => setVatPreset(0)} type="button" disabled={busy}>
                  0%
                </Button>
                <Button size="sm" variant="outline" className={cn("h-9 rounded-2xl", vatRate === 0.15 && "ring-2 ring-[#ff7a18]/25")} onClick={() => setVatPreset(15)} type="button" disabled={busy}>
                  15%
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <IconLabel icon={Hash} label="Invoice Number" />
                <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="mt-1 h-11 rounded-2xl" disabled={busy} />
              </div>
              <div>
                <IconLabel icon={Calendar} label="Invoice Date" />
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="mt-1 h-11 rounded-2xl" disabled={busy} />
              </div>
              <div>
                <IconLabel icon={Calendar} label="Due Date" />
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 h-11 rounded-2xl" disabled={busy} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-xs text-slate-600">
                <Command className="size-4 text-slate-500" />
                <span>Keyboard-first invoice creation enabled</span>
              </div>
              <div className="text-xs text-slate-500">
                Tip: Select customer with <span className="font-semibold">⌘K</span>
              </div>
            </div>
          </Card3D>

          {/* Customer */}
          <Card3D className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Customer</div>
                <div className="mt-0.5 text-sm text-slate-600">
                  Search & select from <span className="font-semibold">/api/customers</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Chip tone="orange" className="px-2.5 py-1">
                  ⌘K
                </Chip>
              </div>
            </div>

            <div ref={custBoxRef} className="mt-4">
              <SpotlightShell active={spotlight}>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    ref={custInputRef}
                    value={custQuery}
                    onChange={(e) => {
                      setCustQuery(e.target.value);
                      setCustOpen(true);
                      setCustActiveIdx(0);
                    }}
                    onFocus={() => {
                      setCustOpen(true);
                      setSpotlight(true);
                    }}
                    onBlur={() => setSpotlight(false)}
                    onKeyDown={onCustomerKeyDown}
                    placeholder={custLoading ? "Loading customers…" : "Search name, email, VAT, BRN…"}
                    className={cn(
                      "h-11 rounded-[20px] pl-10 pr-3 border-0 bg-transparent",
                      "focus-visible:ring-2 focus-visible:ring-[#ff7a18]/25",
                      "shadow-none"
                    )}
                    disabled={busy}
                  />
                </div>
              </SpotlightShell>

              {custOpen && (
                <div className="mt-2 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
                  <div className="max-h-[280px] overflow-auto">
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
                              "w-full px-4 py-3 text-left transition",
                              "border-b last:border-b-0 border-slate-100",
                              active ? "bg-[#ff7a18]/6" : "hover:bg-slate-50"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
                                <div className="mt-0.5 truncate text-xs text-slate-600">{c.email ? c.email : "—"}</div>
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
                <IconLabel icon={Building2} label="Customer Name" />
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 h-11 rounded-2xl" disabled={busy} />
              </div>
              <div>
                <IconLabel icon={Search} label="Customer Email" />
                <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1 h-11 rounded-2xl" disabled={busy} />
              </div>
              <div>
                <IconLabel icon={Percent} label="VAT No" />
                <Input value={customerVat} onChange={(e) => setCustomerVat(e.target.value)} className="mt-1 h-11 rounded-2xl" disabled={busy} />
              </div>
              <div>
                <IconLabel icon={Hash} label="BRN" />
                <Input value={customerBrn} onChange={(e) => setCustomerBrn(e.target.value)} className="mt-1 h-11 rounded-2xl" disabled={busy} />
              </div>
              <div className="md:col-span-2">
                <IconLabel icon={Building2} label="Address" />
                <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="mt-1 h-11 rounded-2xl" disabled={busy} />
              </div>
            </div>
          </Card3D>

          {/* Items */}
          <Card3D className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Invoice Items</div>
                <div className="mt-0.5 text-sm text-slate-600">Enter moves fields • Last price + Enter adds a new row • Alt+N adds row.</div>
              </div>
              <Button type="button" variant="outline" className="rounded-2xl h-11" onClick={() => addRow("desc")} title="Alt + N" disabled={busy}>
                <Plus className="mr-2 size-4" />
                Add Item
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>

              <div className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const amt = n2(r.qty) * n2(r.price);
                  return (
                    <div key={r.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
                      <div className="col-span-6">
                        <Input
                          ref={(el) => {
                            descRefs.current[r.id] = el;
                          }}
                          value={r.description}
                          onChange={(e) => updateRow(r.id, { description: e.target.value })}
                          onKeyDown={(e) => onRowKeyDown(e, r.id, "desc")}
                          className="h-11 rounded-2xl"
                          placeholder="Item / service description"
                          disabled={busy}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          ref={(el) => {
                            qtyRefs.current[r.id] = el;
                          }}
                          type="number"
                          value={r.qty}
                          onChange={(e) => updateRow(r.id, { qty: Number(e.target.value || 0) })}
                          onKeyDown={(e) => onRowKeyDown(e, r.id, "qty")}
                          className="h-11 rounded-2xl text-right"
                          disabled={busy}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          ref={(el) => {
                            priceRefs.current[r.id] = el;
                          }}
                          type="number"
                          value={r.price}
                          onChange={(e) => updateRow(r.id, { price: Number(e.target.value || 0) })}
                          onKeyDown={(e) => onRowKeyDown(e, r.id, "price")}
                          className="h-11 rounded-2xl text-right"
                          disabled={busy}
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <div className="text-sm font-semibold text-slate-900">{money(amt)}</div>
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className={cn(
                            "grid size-9 place-items-center rounded-2xl",
                            "bg-slate-50 ring-1 ring-slate-200 text-slate-500 hover:bg-slate-100",
                            busy && "pointer-events-none opacity-60"
                          )}
                          aria-label="Remove item"
                          title="Remove"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Subtotal</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{money(subtotal)}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">VAT ({Math.round(vatRate * 100)}%)</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{money(vat)}</div>
              </div>

              <div className="rounded-2xl bg-[#071b38] p-4 text-white shadow-[0_18px_40px_rgba(2,6,23,0.18)] ring-1 ring-white/10">
                <div className="text-xs font-semibold text-white/70">Total</div>
                <div className="mt-1 text-lg font-extrabold">{money(total)}</div>
              </div>
            </div>
          </Card3D>
        </div>

        {/* RIGHT: Preview */}
        {showPreview && (
          <div className="xl:sticky xl:top-[92px] h-fit">
            <Card3D className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Live Preview</div>
                  <div className="mt-0.5 text-sm text-slate-600">Real-time invoice rendering</div>
                </div>
                <Chip tone="orange" className="px-3 py-1">
                  <Eye className="size-3.5" />
                  Preview
                </Chip>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <div className="bg-[linear-gradient(180deg,#071b38_0%,#06142b_100%)] px-4 py-4 text-white">
                  <div className="text-xs font-semibold text-white/70">KS CONTRACTING LTD</div>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div className="text-lg font-extrabold tracking-tight">Invoice</div>
                    <div className="text-sm font-semibold">{invoiceNo || "—"}</div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <div className="text-xs font-semibold text-slate-500">Bill To</div>
                      <div className="mt-1 font-semibold text-slate-900 truncate">{customerName || "—"}</div>
                      {customerEmail ? <div className="text-xs text-slate-600 truncate">{customerEmail}</div> : null}
                      {customerAddress ? <div className="text-xs text-slate-600 truncate">{customerAddress}</div> : null}
                      {customerVat || customerBrn ? (
                        <div className="mt-1 text-[11px] text-slate-500">
                          {customerVat ? <>VAT: <span className="font-semibold text-slate-700">{customerVat}</span></> : null}
                          {customerVat && customerBrn ? " • " : null}
                          {customerBrn ? <>BRN: <span className="font-semibold text-slate-700">{customerBrn}</span></> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <div className="text-xs font-semibold text-slate-500">Dates</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                        <span>Invoice Date</span>
                        <span className="font-semibold text-slate-900">{invoiceDate || "—"}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                        <span>Due Date</span>
                        <span className="font-semibold text-slate-900">{dueDate || "—"}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                        <span>Currency</span>
                        <span className="font-semibold text-slate-900">MUR</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
                    <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
                      <div className="col-span-7">Item</div>
                      <div className="col-span-2 text-right">Qty</div>
                      <div className="col-span-3 text-right">Amount</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {rows.map((r) => (
                        <div key={r.id} className="grid grid-cols-12 px-3 py-2 text-xs">
                          <div className="col-span-7 text-slate-800">
                            <div className="font-semibold truncate">{r.description || "—"}</div>
                            <div className="text-[11px] text-slate-500">{money(n2(r.price))} each</div>
                          </div>
                          <div className="col-span-2 text-right font-semibold text-slate-700">{n2(r.qty)}</div>
                          <div className="col-span-3 text-right font-extrabold text-slate-900">{money(n2(r.qty) * n2(r.price))}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">{money(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>VAT ({Math.round(vatRate * 100)}%)</span>
                      <span className="font-semibold text-slate-900">{money(vat)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">Total</span>
                      <span className="font-extrabold text-slate-900">{money(total)}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#071b38]/5 p-3 ring-1 ring-[#071b38]/10">
                    <div className="text-xs font-semibold text-slate-700">Reference</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Please use <span className="font-semibold text-slate-900">{invoiceNo || "—"}</span> as payment reference.
                    </div>
                  </div>
                </div>
              </div>
            </Card3D>
          </div>
        )}
      </div>
    </div>
  );
}