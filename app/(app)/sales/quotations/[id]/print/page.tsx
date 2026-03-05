"use client";

import * as React from "react";
import { useParams } from "next/navigation";

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

export default function PrintQuotationPage() {
  const params = useParams();
  const id = params?.id as string;

  const [quote, setQuote] = React.useState<Quote | null>(null);

  async function load() {
    const res = await fetch(`/api/quotations/${id}`);
    const json = await res.json();
    setQuote(json.data);
  }

  React.useEffect(() => {
    load();
  }, [id]);

  if (!quote) {
    return (
      <div className="p-10 text-slate-500">
        Loading quotation...
      </div>
    );
  }

  return (
    <div className="print:p-0 p-8 bg-white text-slate-900">

      <div className="max-w-[900px] mx-auto">

        {/* Header */}

        <div className="flex justify-between items-start mb-8">

          <div>
            <h1 className="text-2xl font-bold">
              QUOTATION
            </h1>

            <div className="text-sm text-slate-500 mt-1">
              {quote.quote_no}
            </div>
          </div>

          <div className="text-right text-sm">
            <div className="font-semibold">
              Your Company Name
            </div>

            <div>Address line</div>
            <div>Phone</div>
            <div>Email</div>
          </div>

        </div>

        {/* Customer */}

        <div className="grid grid-cols-2 gap-6 mb-8">

          <div>

            <div className="text-xs text-slate-500 uppercase">
              Customer
            </div>

            <div className="font-semibold mt-1">
              {quote.customer_name}
            </div>

          </div>

          <div className="text-right">

            <div className="text-sm">
              <span className="text-slate-500">
                Quote date:
              </span>{" "}
              {quote.quote_date}
            </div>

            <div className="text-sm">
              <span className="text-slate-500">
                Valid until:
              </span>{" "}
              {quote.valid_until}
            </div>

          </div>

        </div>

        {/* Table */}

        <table className="w-full border text-sm">

          <thead className="bg-slate-100">

            <tr>
              <th className="text-left p-3 border">
                Description
              </th>
              <th className="text-right p-3 border">
                Qty
              </th>
              <th className="text-right p-3 border">
                Price
              </th>
              <th className="text-right p-3 border">
                Total
              </th>
            </tr>

          </thead>

          <tbody>

            {quote.items.map((item) => (
              <tr key={item.id}>

                <td className="p-3 border">
                  {item.description}
                </td>

                <td className="p-3 border text-right">
                  {item.qty}
                </td>

                <td className="p-3 border text-right">
                  {money(item.price)}
                </td>

                <td className="p-3 border text-right">
                  {money(item.total)}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

        {/* Totals */}

        <div className="flex justify-end mt-6">

          <div className="w-[300px] text-sm">

            <div className="flex justify-between py-1">
              <span>Subtotal</span>
              <span>{money(quote.subtotal)}</span>
            </div>

            <div className="flex justify-between py-2 border-t font-bold text-lg">
              <span>Total</span>
              <span>{money(quote.total_amount)}</span>
            </div>

          </div>

        </div>

        {/* Footer */}

        <div className="mt-16 text-xs text-slate-500">

          <div>
            Thank you for considering our quotation.
          </div>

          <div className="mt-2">
            Prices are valid until {quote.valid_until}.
          </div>

        </div>

      </div>

    </div>
  );
}