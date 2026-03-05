// app/(app)/contacts/customers/[id]/page.tsx
"use client";

import * as React from "react";
import { useParams } from "next/navigation";

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String((params as any)?.id ?? "").trim();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Customer</h1>
      <p className="mt-2 text-slate-600">ID: {id || "—"}</p>
    </div>
  );
}