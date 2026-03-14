"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Truck,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Hash,
  Percent,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Customer = {
  id: string | number;
  name?: string | null;
  customer_name?: string | null;
  email?: string | null;
  phone?: string | null;
  vat_no?: string | null;
  brn?: string | null;
  address?: string | null;
};

type Supplier = {
  id: string | number;
  name?: string | null;
  supplier_name?: string | null;
  email?: string | null;
  phone?: string | null;
  vat_no?: string | null;
  brn?: string | null;
  address?: string | null;
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
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

function SectionHeader({
  icon: Icon,
  title,
  desc,
  tone = "blue",
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  tone?: "blue" | "amber";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "grid size-10 place-items-center rounded-xl",
          tone === "blue" && "bg-blue-50 text-blue-700",
          tone === "amber" && "bg-amber-50 text-amber-800"
        )}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-sm text-slate-600">{desc}</div>
      </div>
    </div>
  );
}

function ContactMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="inline-flex items-center gap-2 text-xs text-slate-600">
      <Icon className="size-4 text-slate-400" />
      <span>
        {label}: <span className="font-semibold text-slate-900">{value}</span>
      </span>
    </div>
  );
}

function ContactCard({
  name,
  email,
  phone,
  vat,
  brn,
  address,
  kind,
}: {
  name: string;
  email?: string | null;
  phone?: string | null;
  vat?: string | null;
  brn?: string | null;
  address?: string | null;
  kind: "customer" | "supplier";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-900">
            {name || "—"}
          </div>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            <Building2 className="size-3.5 text-slate-500" />
            {kind === "customer" ? "Customer" : "Supplier"}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <ContactMeta icon={Mail} label="Email" value={email} />
        <ContactMeta icon={Phone} label="Phone" value={phone} />
        <ContactMeta icon={Percent} label="VAT" value={vat} />
        <ContactMeta icon={Hash} label="BRN" value={brn} />
        <ContactMeta icon={MapPin} label="Address" value={address} />
      </div>
    </div>
  );
}

async function safeGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON. Got ${ct || "unknown"}`);
  }

  return JSON.parse(text) as T;
}

export default function ContactsPage() {
  const [q, setQ] = React.useState("");
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = React.useState(false);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [err, setErr] = React.useState("");

  const loadCustomers = React.useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const j = await safeGet<{ ok: boolean; data?: Customer[] }>("/api/customers");
      setCustomers(Array.isArray(j?.data) ? j.data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const loadSuppliers = React.useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const j = await safeGet<{ ok: boolean; data?: Supplier[] }>("/api/suppliers");
      setSuppliers(Array.isArray(j?.data) ? j.data : []);
    } catch (e: any) {
      setErr((prev) => prev || e?.message || "Failed to load suppliers");
      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCustomers();
    void loadSuppliers();
  }, [loadCustomers, loadSuppliers]);

  const filteredCustomers = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;

    return customers.filter((c) => {
      const name = (c.name ?? c.customer_name ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      const vat = (c.vat_no ?? "").toLowerCase();
      const brn = (c.brn ?? "").toLowerCase();
      const address = (c.address ?? "").toLowerCase();

      return (
        name.includes(needle) ||
        email.includes(needle) ||
        phone.includes(needle) ||
        vat.includes(needle) ||
        brn.includes(needle) ||
        address.includes(needle)
      );
    });
  }, [customers, q]);

  const filteredSuppliers = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return suppliers;

    return suppliers.filter((s) => {
      const name = (s.name ?? s.supplier_name ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const phone = (s.phone ?? "").toLowerCase();
      const vat = (s.vat_no ?? "").toLowerCase();
      const brn = (s.brn ?? "").toLowerCase();
      const address = (s.address ?? "").toLowerCase();

      return (
        name.includes(needle) ||
        email.includes(needle) ||
        phone.includes(needle) ||
        vat.includes(needle) ||
        brn.includes(needle) ||
        address.includes(needle)
      );
    });
  }, [suppliers, q]);

  const refreshing = loadingCustomers || loadingSuppliers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-500">Directory</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Contacts
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            Manage customers and suppliers (BRN/VAT, address, contact person).
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              void loadCustomers();
              void loadSuppliers();
            }}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("mr-2 size-4", refreshing && "animate-spin")}
            />
            Refresh
          </Button>

          <Link href="/contacts/suppliers/new">
            <Button variant="outline" className="rounded-xl">
              <Plus className="mr-2 size-4" />
              New Supplier
            </Button>
          </Link>

          <Link href="/contacts/customers/new">
            <Button className="rounded-xl bg-[#071b38] text-white hover:bg-[#06142b]">
              <Plus className="mr-2 size-4" />
              New Customer
            </Button>
          </Link>
        </div>
      </div>

      <Card3D className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, BRN, VAT, phone..."
              className="h-10 rounded-xl pl-10"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Pill>MUR</Pill>
            <Pill>Single Company</Pill>
            <Pill>{filteredCustomers.length} Customers</Pill>
            <Pill>{filteredSuppliers.length} Suppliers</Pill>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <SectionHeader
              icon={Users}
              title="Customers"
              desc="Invoice recipients, quotations, statements."
              tone="blue"
            />

            <div className="mt-4 space-y-3">
              {loadingCustomers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 animate-pulse"
                  >
                    <div className="h-4 w-40 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-52 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-32 rounded bg-slate-200" />
                  </div>
                ))
              ) : filteredCustomers.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  No customers found.
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <ContactCard
                    key={String(c.id)}
                    name={c.name ?? c.customer_name ?? "—"}
                    email={c.email}
                    phone={c.phone}
                    vat={c.vat_no}
                    brn={c.brn}
                    address={c.address}
                    kind="customer"
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <SectionHeader
              icon={Truck}
              title="Suppliers"
              desc="Purchases, expenses and payable records."
              tone="amber"
            />

            <div className="mt-4 space-y-3">
              {loadingSuppliers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 animate-pulse"
                  >
                    <div className="h-4 w-40 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-52 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-32 rounded bg-slate-200" />
                  </div>
                ))
              ) : filteredSuppliers.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                  No suppliers found.
                </div>
              ) : (
                filteredSuppliers.map((s) => (
                  <ContactCard
                    key={String(s.id)}
                    name={s.name ?? s.supplier_name ?? "—"}
                    email={s.email}
                    phone={s.phone}
                    vat={s.vat_no}
                    brn={s.brn}
                    address={s.address}
                    kind="supplier"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </Card3D>
    </div>
  );
}