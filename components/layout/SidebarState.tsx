// src/components/layout/SidebarState.tsx
"use client";

import * as React from "react";

type SidebarStateContextType = {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
};

const SidebarStateContext = React.createContext<SidebarStateContextType | null>(null);

function usePersistedBoolean(key: string, initialValue: boolean) {
  const [value, setValue] = React.useState<boolean>(initialValue);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setValue(JSON.parse(raw));
      }
    } catch {}
    setHydrated(true);
  }, [key]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = usePersistedBoolean("ks.sidebar.collapsed", false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

  const openMobile = React.useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMobile = React.useCallback(() => {
    setMobileOpen(false);
  }, []);

  const value = React.useMemo<SidebarStateContextType>(
    () => ({
      collapsed,
      setCollapsed,
      mobileOpen,
      setMobileOpen,
      toggleCollapsed,
      openMobile,
      closeMobile,
    }),
    [collapsed, mobileOpen, setCollapsed, toggleCollapsed, openMobile, closeMobile]
  );

  return <SidebarStateContext.Provider value={value}>{children}</SidebarStateContext.Provider>;
}

export function useSidebarState() {
  const ctx = React.useContext(SidebarStateContext);
  if (!ctx) {
    throw new Error("useSidebarState must be used inside SidebarStateProvider");
  }
  return ctx;
}