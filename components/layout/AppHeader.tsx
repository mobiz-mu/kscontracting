// src/components/layout/AppHeader.tsx
"use client";

import * as React from "react";
import { Bell, Search, Menu, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSidebarState } from "./SidebarState";

/* =========================
   Helpers
========================= */

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

/* =========================
   LIVE (real-time feel)
========================= */

function LivePill({ active = true }: { active?: boolean }) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full px-3 py-1.5",
        active
          ? "bg-emerald-50/90 text-emerald-700 ring-1 ring-emerald-200/70"
          : "bg-slate-100/80 text-slate-600 ring-1 ring-slate-200/70",
        "shadow-[0_12px_28px_rgba(16,185,129,0.12)]",
        "backdrop-blur-md"
      )}
      aria-label={active ? "Live mode on" : "Live mode off"}
      title={active ? "Live" : "Offline"}
    >
      <span className="relative flex size-2">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/55" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            active ? "bg-emerald-500" : "bg-slate-400",
            active && "shadow-[0_0_0_4px_rgba(16,185,129,0.16)]"
          )}
        />
      </span>

      <span className="text-[11px] font-semibold tracking-wide">LIVE</span>

      {/* subtle “signal” shimmer */}
      {active && (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(60%_120%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)] opacity-70" />
      )}
    </div>
  );
}

/* =========================
   Notification bell pulse
========================= */

function BellButton({
  count,
}: {
  count: number;
}) {
  const has = count > 0;

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "relative h-11 w-11 rounded-2xl",
        "border-slate-200/80 bg-white/60 shadow-[0_10px_25px_rgba(2,6,23,0.06)]",
        "backdrop-blur-md",
        "hover:bg-white/80 hover:shadow-[0_14px_34px_rgba(2,6,23,0.10)]",
        "transition-all duration-300 hover:scale-[1.02]"
      )}
      aria-label="Notifications"
      title="Notifications — unpaid invoices > 30 days"
    >
      <Bell className={cn("size-4", has ? "text-slate-900" : "text-slate-700")} />

      {/* pulsing ring when there are notifications */}
      {has && (
        <>
          <span className="pointer-events-none absolute -right-1 -top-1 inline-flex size-5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff7a18]/35" />
            <span className="relative inline-flex size-5 rounded-full bg-[#ff7a18]/15 ring-1 ring-[#ff7a18]/30" />
          </span>

          <span
            className={cn(
              "absolute -right-1 -top-1 min-w-[18px] px-1.5",
              "h-[18px] rounded-full",
              "bg-[#ff7a18] text-white text-[10px] font-bold leading-[18px] text-center",
              "shadow-[0_12px_24px_rgba(255,122,24,0.22)]",
              "animate-in fade-in zoom-in-50"
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        </>
      )}
    </Button>
  );
}

/* =========================
   Spotlight Search
========================= */

function SpotlightSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = React.useState(false);

  return (
    <div className="relative">
      {/* Outer orange border (always visible, premium) */}
      <div
        className={cn(
          "relative rounded-2xl p-[1px]",
          "bg-[linear-gradient(90deg,rgba(255,122,24,0.65),rgba(255,122,24,0.18),rgba(255,122,24,0.65))]",
          "shadow-[0_12px_34px_rgba(255,122,24,0.10)]",
          "transition-all duration-300",
          focused && "shadow-[0_18px_46px_rgba(255,122,24,0.16)]"
        )}
      >
        {/* Spotlight sweep */}
        <span
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden rounded-2xl",
            focused ? "opacity-100" : "opacity-70",
            "transition-opacity duration-300"
          )}
        >
          <span
            className={cn(
              "absolute -left-1/3 top-0 h-full w-1/2",
              "bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]",
              "blur-[2px]",
              focused ? "animate-[spotlight_1.4s_ease-in-out_infinite]" : ""
            )}
          />
        </span>

        {/* Inner glass input shell */}
        <div
          className={cn(
            "relative rounded-2xl",
            "bg-white/70 backdrop-blur-xl",
            "ring-1 ring-white/35",
            "shadow-[0_10px_30px_rgba(2,6,23,0.06)]",
            "transition-all duration-300",
            focused && "bg-white/80 shadow-[0_16px_40px_rgba(2,6,23,0.10)]"
          )}
        >
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search invoices, customers, documents..."
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              "h-11 w-full rounded-2xl pl-11 pr-3",
              "bg-transparent",
              "border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
              "text-slate-900 placeholder:text-slate-500"
            )}
          />

          {/* subtle top gloss */}
          <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.65),transparent_55%)] opacity-60" />
        </div>
      </div>

      {/* extra ambient glow when focused */}
      <span
        className={cn(
          "pointer-events-none absolute -inset-2 rounded-3xl",
          "bg-[radial-gradient(60%_60%_at_30%_30%,rgba(255,122,24,0.18),transparent_60%)]",
          focused ? "opacity-100" : "opacity-0",
          "transition-opacity duration-300"
        )}
      />
    </div>
  );
}

/* =========================
   AppHeader
========================= */

export default function AppHeader() {
  const { collapsed, toggleCollapsed, openMobile } = useSidebarState();

  // Replace with real logic:
  // unpaid invoices older than 30 days
  // Example: fetch('/api/notifications/unpaid-overdue?days=30')
  const overdueUnpaidCount = 0;

  const [q, setQ] = React.useState("");

  return (
    <>
      {/* Keyframes for spotlight */}
      <style jsx global>{`
        @keyframes spotlight {
          0% {
            transform: translateX(-60%);
            opacity: 0.35;
          }
          40% {
            opacity: 0.75;
          }
          100% {
            transform: translateX(220%);
            opacity: 0.35;
          }
        }
      `}</style>

      <header
        className={cn(
          "sticky top-0 z-30",
          // glass morphism
          "bg-white/55 supports-[backdrop-filter]:bg-white/35 backdrop-blur-2xl",
          "border-b border-slate-200/70",
          "shadow-[0_10px_40px_rgba(2,6,23,0.06)]"
        )}
      >
        <div className="px-3 sm:px-5 lg:px-8">
          <div className="flex h-16 items-center gap-2.5 sm:gap-3">
            {/* Mobile menu */}
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "lg:hidden rounded-2xl",
                "border-slate-200/80 bg-white/60 backdrop-blur-md",
                "shadow-[0_10px_25px_rgba(2,6,23,0.06)]",
                "hover:bg-white/80 hover:shadow-[0_14px_34px_rgba(2,6,23,0.10)]",
                "transition-all duration-300 hover:scale-[1.02]"
              )}
              onClick={openMobile}
              aria-label="Open sidebar"
            >
              <Menu className="size-4 text-slate-800" />
            </Button>

            {/* Desktop collapse */}
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "hidden lg:inline-flex rounded-2xl",
                "border-slate-200/80 bg-white/60 backdrop-blur-md",
                "shadow-[0_10px_25px_rgba(2,6,23,0.06)]",
                "hover:bg-white/80 hover:shadow-[0_14px_34px_rgba(2,6,23,0.10)]",
                "transition-all duration-300 hover:scale-[1.02]"
              )}
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className="size-4 text-slate-800" />
            </Button>

            {/* Search (spotlight) */}
            <div className="flex-1">
              <SpotlightSearch value={q} onChange={setQ} />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live toggle */}
              <div className="hidden sm:block">
                <LivePill active />
              </div>

              {/* New Invoice */}
              <Button
                className={cn(
                  "h-11 rounded-2xl px-4 sm:px-5",
                  "bg-[#ff7a18] text-white hover:bg-[#ff6a00]",
                  "shadow-[0_18px_44px_rgba(255,122,24,0.24)]",
                  "transition-all duration-300 hover:scale-[1.02] active:scale-[0.99]"
                )}
              >
                New Invoice
              </Button>

              {/* Notifications */}
              <BellButton count={n2(overdueUnpaidCount)} />

              {/* Account */}
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "hidden sm:inline-flex h-11 w-11 rounded-2xl",
                  "border-slate-200/80 bg-white/60 backdrop-blur-md",
                  "shadow-[0_10px_25px_rgba(2,6,23,0.06)]",
                  "hover:bg-white/80 hover:shadow-[0_14px_34px_rgba(2,6,23,0.10)]",
                  "transition-all duration-300 hover:scale-[1.02]"
                )}
                aria-label="Account"
                title="Account"
              >
                <span className="text-xs font-extrabold text-slate-800">KS</span>
              </Button>
            </div>
          </div>

          {/* Mobile: LIVE row */}
          <div className="pb-2 sm:hidden">
            <div className="flex items-center justify-between">
              <LivePill active />
              <span className="text-[11px] text-slate-600">
                Alerts: unpaid &gt; 30 days
              </span>
            </div>
          </div>
        </div>

        {/* premium divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
      </header>
    </>
  );
}