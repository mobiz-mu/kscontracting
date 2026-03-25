"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, FileText, Building2 } from "lucide-react";

type Customer = {
  id: string | number;
  name: string;
  email: string | null;
  phone: string | null;
  vat_no: string | null;
  brn: string | null;
  address: string | null;
  contact_person?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String((params as any)?.id ?? "").trim();

  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function loadCustomer() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/customers", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? "Failed to load customer");
        }

        const found =
          (json.data ?? []).find((c: Customer) => String(c.id) === id) ?? null;

        if (!found) {
          throw new Error("Customer not found");
        }

        setCustomer(found);
      } catch (e: any) {
        setError(e?.message || "Failed to load customer");
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) void loadCustomer();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-slate-600">Loading customer...</div>;
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <Link
          href="/contacts/customers"
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error || "Customer not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/contacts/customers"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>

        <h1 className="mt-2 text-2xl font-bold">{customer.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Customer ID: {customer.id}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Customer Details</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Name</div>
                <div className="font-medium">{customer.name || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Email</div>
                <div className="font-medium">{customer.email || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Phone</div>
                <div className="font-medium">{customer.phone || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">VAT Number</div>
                <div className="font-medium">{customer.vat_no || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">BRN</div>
                <div className="font-medium">{customer.brn || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Address</div>
                <div className="font-medium whitespace-pre-line">
                  {customer.address || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Other Info</h2>

          <div className="space-y-3 text-sm">
            <div>
              <div className="text-slate-500">Contact Person</div>
              <div className="font-medium">{customer.contact_person || "—"}</div>
            </div>

            <div>
              <div className="text-slate-500">Notes</div>
              <div className="font-medium whitespace-pre-line">
                {customer.notes || "—"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Status</div>
              <div className="font-medium">
                {customer.is_active ? "Active" : "Inactive"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Created At</div>
              <div className="font-medium">{customer.created_at || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}