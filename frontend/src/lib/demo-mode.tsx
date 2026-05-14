"use client";

import { createContext, useContext, type ReactNode } from "react";

const DemoContext = createContext<boolean>(false);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  return <DemoContext.Provider value={true}>{children}</DemoContext.Provider>;
}

export function useDemoMode(): boolean {
  return useContext(DemoContext);
}
