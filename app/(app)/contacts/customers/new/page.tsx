"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewCustomerPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [vatNo, setVatNo] = React.useState("");
  const [address, setAddress] = React.useState("");

  const [loading, setLoading] = React.useState(false);

  async function createCustomer() {
    try {
      if (!name.trim()) {
        alert("Customer name required");
        return;
      }

      setLoading(true);

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          vat_no: vatNo,
          address,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to create customer");
      }

      router.push(`/contacts/customers/${json.data.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[720px] space-y-6">

      {/* Header */}

      <div>

        <Link
          href="/contacts/customers"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>

        <h1 className="mt-2 text-2xl font-bold">
          New Customer
        </h1>

      </div>

      {/* Form */}

      <div className="bg-white border rounded-xl p-6 space-y-5">

        {/* Name */}

        <div>
          <label className="text-sm text-slate-600">
            Customer name *
          </label>

          <Input
            placeholder="Customer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Email */}

        <div>
          <label className="text-sm text-slate-600">
            Email
          </label>

          <Input
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Phone */}

        <div>
          <label className="text-sm text-slate-600">
            Phone
          </label>

          <Input
            placeholder="+230 58000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* VAT */}

        <div>
          <label className="text-sm text-slate-600">
            VAT Number
          </label>

          <Input
            placeholder="VAT123456"
            value={vatNo}
            onChange={(e) => setVatNo(e.target.value)}
          />
        </div>

        {/* Address */}

        <div>
          <label className="text-sm text-slate-600">
            Address
          </label>

          <Input
            placeholder="Customer address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Save */}

        <div className="flex justify-end pt-2">

          <Button
            onClick={createCustomer}
            disabled={loading}
            className="bg-[#071b38] hover:bg-[#06142b]"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Customer
          </Button>

        </div>

      </div>

    </div>
  );
}