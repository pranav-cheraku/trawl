"use client";
// Minimal context flag that gates write actions in the read-only demo path.
// Components check useDemoMode() to disable generation buttons and mutations.
import { createContext, useContext, type ReactNode } from "react";

const DemoContext = createContext<boolean>(false);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  return <DemoContext.Provider value={true}>{children}</DemoContext.Provider>;
}

export function useDemoMode(): boolean {
  return useContext(DemoContext);
}
