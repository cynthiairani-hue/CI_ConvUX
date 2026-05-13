"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface LayoutContextValue {
  leftRailCollapsed: boolean;
  toggleLeftRail: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);

  const toggleLeftRail = useCallback(() => {
    setLeftRailCollapsed((prev) => !prev);
  }, []);

  return (
    <LayoutContext.Provider value={{ leftRailCollapsed, toggleLeftRail }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
