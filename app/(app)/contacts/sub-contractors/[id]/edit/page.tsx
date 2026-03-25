"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
};

export default function EditSubContractorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String((params as any)?.id ?? "").trim();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [vatNo, setVatNo] = React.useState("");
  const [brn, setBrn] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [contactPerson, setContactPerson] = React.useState("");
  const [notes, setNotes] = React.useState("");

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

      const row: SubContractor = json.data;

      setName(row.name ?? "");
      setEmail(row.email ?? "");
      setPhone(row.phone ?? "");
      setVatNo(row.vat_no ?? "");
      setBrn(row.brn ?? "");
      setAddress(row.address ?? "");
      setContactPerson(row.contact_person ?? "");
      setNotes(row.notes ?? "");
    } catch (e: any) {
      setError(e?.message || "Failed to load sub contractor");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      if (!name.trim()) {
        alert("Sub contractor name required");
        return;
      }

      setSaving(true);

      const res = await fetch(`/api/sub-contractors/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          vat_no: vatNo.trim() || null,
          brn: brn.trim() || null,
          address: address.trim() || null,
          contact_person: contactPerson.trim() || null,
          notes: notes.trim() || null,
          is_active: true,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Failed to update sub contractor");
      }

      router.push(`/contacts/sub-contractors/${id}`);
    } catch (e: any) {
      alert(e?.message || "Failed to update sub contractor");
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    if (id) void load();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-slate-600">Loading sub contractor...</div>;
  }

  if (error) {
    return <div className="p-6 text-rose-600">{error}</div>;
  }

  return (
    <div className="max-w-[720px] space-y-6">
      <div>
        <Link
          href={`/contacts/sub-contractors/${id}`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to sub contractor
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Edit Sub Contractor</h1>
      </div>

      <div className="space-y-5 rounded-xl border bg-white p-6">
        <div>
          <label className="text-sm text-slate-600">Sub contractor name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-slate-600">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-slate-600">Phone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-slate-600">VAT Number</label>
          <Input value={vatNo} onChange={(e) => setVatNo(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-slate-600">BRN</label>
          <Input value={brn} onChange={(e) => setBrn(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-slate-600">Contact Person</label>
          <Input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Address</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div>
          <label className="text-sm text-slate-600">Notes</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#071b38] hover:bg-[#06142b]"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}