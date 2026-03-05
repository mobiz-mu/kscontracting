"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiResp = {
  ok: boolean;
  data?: { id: number | string };
  error?: any;
};

async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();
  if (!res.ok) {
    try {
      const j = JSON.parse(raw);
      throw new Error(j?.error?.message ?? j?.error ?? j?.message ?? `HTTP ${res.status}`);
    } catch {
      throw new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`);
    }
  }
  if (!ct.includes("application/json")) throw new Error(`Expected JSON. Got ${ct || "unknown"}`);
  return JSON.parse(raw) as T;
}

export default function NewSupplierPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [brn, setBrn] = React.useState("");
  const [vatNo, setVatNo] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function onSave() {
    try {
      setErr("");
      if (!name.trim()) {
        setErr("Supplier name is required.");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          name: name.trim(),
          brn: brn.trim() || null,
          vat_no: vatNo.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      });

      const j = await safeJson<ApiResp>(res);
      if (!j.ok || !j.data?.id) throw new Error(j?.error ?? "Failed to create supplier");

      router.push(`/contacts/suppliers/${encodeURIComponent(String(j.data.id))}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[760px] space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/contacts/suppliers"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          Back to suppliers
        </Link>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">New Supplier</h1>
        <div className="mt-1 text-sm text-slate-600">Create a supplier for purchases & bills.</div>
      </div>

      {/* Form */}
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_14px_30px_rgba(15,23,42,0.06)] space-y-5">
        {err ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        ) : null}

        <div>
          <label className="text-sm font-semibold text-slate-700">Supplier name *</label>
          <Input className="mt-1 h-11 rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">BRN</label>
            <Input className="mt-1 h-11 rounded-2xl" value={brn} onChange={(e) => setBrn(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">VAT No</label>
            <Input className="mt-1 h-11 rounded-2xl" value={vatNo} onChange={(e) => setVatNo(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <Input className="mt-1 h-11 rounded-2xl" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Phone</label>
            <Input className="mt-1 h-11 rounded-2xl" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Address</label>
          <Input className="mt-1 h-11 rounded-2xl" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={saving}
            className="h-11 rounded-2xl bg-[#071b38] text-white hover:bg-[#06142b]"
          >
            <Save className="mr-2 size-4" />
            {saving ? "Saving…" : "Save Supplier"}
          </Button>
        </div>
      </div>
    </div>
  );
}