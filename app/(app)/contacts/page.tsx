"use client";

import Link from "next/link";
import { Users, Truck, HardHat, ArrowRight } from "lucide-react";

const cards = [
  {
    title: "Customers",
    desc: "Manage customer records, VAT, BRN and contact details.",
    href: "/contacts/customers",
    icon: Users,
  },
  {
    title: "Suppliers",
    desc: "Manage suppliers and their contact information.",
    href: "/contacts/suppliers",
    icon: Truck,
  },
  {
    title: "Sub Contractors",
    desc: "Manage subcontractors that your company pays for outsourced work.",
    href: "/contacts/sub-contractors",
    icon: HardHat,
  },
];

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contacts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage customers, suppliers and sub contractors.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-slate-100 p-3">
                  <Icon className="h-6 w-6 text-slate-700" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </div>

              <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}