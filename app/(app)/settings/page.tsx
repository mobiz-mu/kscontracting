"use client";

import { Shield, Building2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function Box({
  title,
  desc,
  icon,
  action,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  action: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.06),0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-600">{desc}</div>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl">
          {action}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-slate-500">Admin</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <div className="mt-1 text-sm text-slate-600">
          Single company mode. Currency: MUR. Secure role-based access.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Box
          title="Company Profile"
          desc="Legal name, BRN/VAT, address, logo, invoice footer."
          icon={<Building2 className="size-5" />}
          action="Edit"
        />
        <Box
          title="Access Control"
          desc="Roles, permissions, and user access (admin-only)."
          icon={<Shield className="size-5" />}
          action="Manage"
        />
        <Box
          title="System Preferences"
          desc="Invoice numbering, VAT rate defaults, print templates."
          icon={<Settings2 className="size-5" />}
          action="Configure"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-600">
        Next: wire Settings to DB tables (company_settings, roles, role_permissions).
      </div>
    </div>
  );
}