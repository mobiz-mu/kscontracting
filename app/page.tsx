// app/page.tsx

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#071b38] via-[#0a2550] to-[#071b38] text-white">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,24,0.15),transparent_40%)]" />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Image
            src="/kslogo.png"
            alt="KS Logo"
            width={42}
            height={42}
            className="rounded-xl"
          />
          <div>
            <div className="text-lg font-semibold tracking-tight">
              KS Accounting
            </div>
            <div className="text-xs text-white/60">
              KS CONTRACTING LTD
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Login
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl bg-[#ff7a18] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#ff7a18]/30 hover:bg-[#ff6a00] transition"
          >
            Enter System
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pt-20 text-center">
        <div className="mb-6 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold tracking-wide text-white/70 ring-1 ring-white/15">
          Enterprise Accounting Platform
        </div>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Modern Financial Control
          <span className="block text-[#ff7a18]">
            Built for KS CONTRACTING LTD
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
          Professional invoice management, credit note control, VAT reporting
          and real-time financial dashboards — designed for audit-safe
          operations.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a18] px-6 py-3 font-semibold text-white shadow-xl shadow-[#ff7a18]/30 hover:bg-[#ff6a00] transition"
          >
            Go to Dashboard
            <ArrowRight className="size-4" />
          </Link>

          <Link
            href="/reports"
            className="rounded-2xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10 transition"
          >
            View Reports
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
            <div className="text-sm font-semibold text-white">
              Invoice Control
            </div>
            <p className="mt-2 text-sm text-white/60">
              DRAFT → ISSUED → PAID lifecycle with strict audit safety.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
            <div className="text-sm font-semibold text-white">
              VAT Reporting
            </div>
            <p className="mt-2 text-sm text-white/60">
              Real-time VAT summaries and detailed line exports.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
            <div className="text-sm font-semibold text-white">
              Credit & Wallet Logic
            </div>
            <p className="mt-2 text-sm text-white/60">
              Automated credit application with full audit logs.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} KS CONTRACTING LTD. All rights reserved.
      </footer>
    </div>
  );
}