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

function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = React.useState<T>(initial);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored != null) setState(JSON.parse(stored));
    } catch {}
  }, [key]);

  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState] as const;
}

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = usePersistedState<boolean>("ks.sidebar.collapsed", false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleCollapsed = React.useCallback(() => setCollapsed((v) => !v), [setCollapsed]);
  const openMobile = React.useCallback(() => setMobileOpen(true), []);
  const closeMobile = React.useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarStateContext.Provider
      value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen, toggleCollapsed, openMobile, closeMobile }}
    >
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState() {
  const ctx = React.useContext(SidebarStateContext);
  if (!ctx) throw new Error("useSidebarState must be used inside SidebarStateProvider");
  return ctx;
}