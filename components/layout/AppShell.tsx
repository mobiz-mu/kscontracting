"use client";

import * as React from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";
import { SidebarStateProvider, useSidebarState } from "./SidebarState";
import { cn } from "@/lib/utils";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState();

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <div
        className={cn(
          "mx-auto grid min-h-[100dvh] max-w-[1600px] grid-cols-1",
          // Desktop grid: sidebar + main
          "lg:grid-cols-[auto_1fr]"
        )}
      >
        {/* Sidebar (handles desktop + mobile drawer internally) */}
        <Sidebar />

        {/* Main */}
        <div className="flex min-w-0 flex-col">
          <AppHeader />

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {/* optional: subtle width normalization for content */}
            <div className={cn("mx-auto w-full", collapsed ? "max-w-[1320px]" : "max-w-[1400px]")}>
              {children}
            </div>
          </main>

          <AppFooter />
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarStateProvider>
      <ShellInner>{children}</ShellInner>
    </SidebarStateProvider>
  );
}