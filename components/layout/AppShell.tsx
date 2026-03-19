"use client";

import * as React from "react";
import Sidebar from "./Sidebar";
import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";
import { SidebarStateProvider, useSidebarState } from "./SidebarState";
import { cn } from "@/lib/utils";

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState();

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <div
        className={cn(
          "mx-auto grid min-h-[100dvh] max-w-[1600px] grid-cols-1",
          "lg:grid-cols-[auto_1fr]"
        )}
      >
        <Sidebar />

        <div className="flex min-w-0 flex-col">
          <AppHeader />

          <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
            <div
              className={cn(
                "mx-auto w-full transition-all duration-300",
                collapsed ? "max-w-[1320px]" : "max-w-[1400px]"
              )}
            >
              {children}
            </div>
          </main>

          <AppFooter />
        </div>
      </div>
    </div>
  );
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarStateProvider>
      <ShellLayout>{children}</ShellLayout>
    </SidebarStateProvider>
  );
}