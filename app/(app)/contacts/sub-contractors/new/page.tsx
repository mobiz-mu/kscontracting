"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewSubContractorPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [vatNo, setVatNo] = React.useState("");
  const [brn, setBrn] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [contactPerson, setContactPerson] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function createSubContractor() {
    try {
      if (!name.trim()) {
        alert("Sub contractor name required");
        return;
      }

      setLoading(true);

      const res = await fetch("/api/sub-contractors", {
        method: "POST",
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
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to create sub contractor");
      }

      router.push(`/contacts/sub-contractors/${json.data.id}`);
    } catch (e: any) {
      alert(e?.message || "Failed to create sub contractor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[720px] space-y-6">
      <div>
        <Link
          href="/contacts/sub-contractors"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to sub contractors
        </Link>

        <h1 className="mt-2 text-2xl font-bold">New Sub Contractor</h1>
      </div>

      <div className="space-y-5 rounded-xl border bg-white p-6">
        <div>
          <label className="text-sm text-slate-600">Sub contractor name *</label>
          <Input
            placeholder="Sub contractor name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Email</label>
          <Input
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Phone</label>
          <Input
            placeholder="+230 58000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">VAT Number</label>
          <Input
            placeholder="VAT123456"
            value={vatNo}
            onChange={(e) => setVatNo(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">BRN</label>
          <Input
            placeholder="C12345678"
            value={brn}
            onChange={(e) => setBrn(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Contact Person</label>
          <Input
            placeholder="Contact person"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Address</label>
          <Input
            placeholder="Sub contractor address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Notes</label>
          <Input
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={createSubContractor}
            disabled={loading}
            className="bg-[#071b38] hover:bg-[#06142b]"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Sub Contractor
          </Button>
        </div>
      </div>
    </div>
  );
}