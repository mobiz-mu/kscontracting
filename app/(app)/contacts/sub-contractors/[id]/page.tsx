"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Building2,
  User,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type SubContractor = {
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
  updated_at?: string | null;
};

export default function SubContractorDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String((params as any)?.id ?? "").trim();

  const [row, setRow] = React.useState<SubContractor | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/sub-contractors/${id}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to load sub contractor");
      }

      setRow(json.data ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load sub contractor");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRow() {
    const ok = window.confirm(
      "Are you sure you want to delete this sub contractor?"
    );
    if (!ok) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/sub-contractors/${id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to delete sub contractor");
      }

      router.push("/contacts/sub-contractors");
    } catch (e: any) {
      alert(e?.message || "Failed to delete sub contractor");
    } finally {
      setDeleting(false);
    }
  }

  React.useEffect(() => {
    if (id) void load();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-slate-600">Loading sub contractor...</div>;
  }

  if (error || !row) {
    return (
      <div className="p-6">
        <Link
          href="/contacts/sub-contractors"
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to sub contractors
        </Link>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error || "Sub contractor not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/contacts/sub-contractors"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} />
            Back to sub contractors
          </Link>

          <h1 className="mt-2 text-2xl font-bold">{row.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sub Contractor ID: {row.id}
          </p>
        </div>

        <div className="flex gap-2">
          <Link href={`/contacts/sub-contractors/${row.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>

          <Button
            variant="destructive"
            onClick={deleteRow}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Sub Contractor Details</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Name</div>
                <div className="font-medium">{row.name || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Email</div>
                <div className="font-medium">{row.email || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Phone</div>
                <div className="font-medium">{row.phone || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">VAT Number</div>
                <div className="font-medium">{row.vat_no || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">BRN</div>
                <div className="font-medium">{row.brn || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Address</div>
                <div className="whitespace-pre-line font-medium">
                  {row.address || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Other Info</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <div className="text-slate-500">Contact Person</div>
                <div className="font-medium">{row.contact_person || "—"}</div>
              </div>
            </div>

            <div>
              <div className="text-slate-500">Notes</div>
              <div className="whitespace-pre-line font-medium">
                {row.notes || "—"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Status</div>
              <div className="font-medium">
                {row.is_active ? "Active" : "Inactive"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Created At</div>
              <div className="font-medium">{row.created_at || "—"}</div>
            </div>

            <div>
              <div className="text-slate-500">Updated At</div>
              <div className="font-medium">{row.updated_at || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}