"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  Printer,
  FileText,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Item = {
  id: number;
  description: string;
  qty: number;
  price: number;
  total: number;
};

type Quote = {
  id: string;
  quote_no: string;
  customer_name: string;
  quote_date: string;
  valid_until: string;
  status: string;
  subtotal: number;
  total_amount: number;
  items: Item[];
};

function money(v: any) {
  const n = Number(v ?? 0);
  return `Rs ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function QuotationPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id as string;

  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(`/api/quotations/${id}`);

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to load quotation");
      }

      setQuote(json.data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-slate-500">
        Loading quotation...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-8 text-red-500">
        Quotation not found
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>

          <Link
            href="/sales/quotations"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} />
            Back to quotations
          </Link>

          <h1 className="mt-2 text-2xl font-bold">
            Quotation {quote.quote_no}
          </h1>

          <div className="text-sm text-slate-500">
            Status: {quote.status}
          </div>

        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            onClick={load}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              window.open(
                `/sales/quotations/${quote.id}/print`,
                "_blank"
              )
            }
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <Button
            className="bg-[#071b38] hover:bg-[#06142b]"
            onClick={() =>
              router.push(
                `/sales/quotations/${quote.id}/convert`
              )
            }
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Convert to Invoice
          </Button>

        </div>

      </div>

      {/* Info */}

      <div className="grid md:grid-cols-3 gap-4">

        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-slate-500">
            Customer
          </div>
          <div className="font-semibold">
            {quote.customer_name}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-slate-500">
            Quote Date
          </div>
          <div className="font-semibold">
            {quote.quote_date}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-slate-500">
            Valid Until
          </div>
          <div className="font-semibold">
            {quote.valid_until}
          </div>
        </div>

      </div>

      {/* Items */}

      <div className="bg-white border rounded-xl">

        <div className="border-b p-4 font-semibold">
          Items
        </div>

        <table className="w-full text-sm">

          <thead className="bg-slate-50">

            <tr>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Price</th>
              <th className="text-right p-3">Total</th>
            </tr>

          </thead>

          <tbody>

            {quote.items.map((item) => (
              <tr
                key={item.id}
                className="border-t"
              >
                <td className="p-3">
                  {item.description}
                </td>

                <td className="p-3 text-right">
                  {item.qty}
                </td>

                <td className="p-3 text-right">
                  {money(item.price)}
                </td>

                <td className="p-3 text-right font-semibold">
                  {money(item.total)}
                </td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {/* Totals */}

      <div className="flex justify-end">

        <div className="w-[320px] border rounded-xl bg-white p-4 space-y-2">

          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{money(quote.subtotal)}</span>
          </div>

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{money(quote.total_amount)}</span>
          </div>

        </div>

      </div>

    </div>
  );
}