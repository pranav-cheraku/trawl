"use client";
// Persists the dashboard grid/list view preference in localStorage.
import { useCallback, useMemo, useState } from "react";

const STORAGE_KEY = "trawl:dashboard:view";

export type DashboardView = "grid" | "list";
const DEFAULT_VIEW: DashboardView = "grid";

function read(): DashboardView {
  if (typeof window === "undefined") return DEFAULT_VIEW;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "list" || raw === "grid" ? raw : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

function write(view: DashboardView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // ignore quota / permission errors
  }
}

export interface DashboardViewApi {
  view: DashboardView;
  setView: (view: DashboardView) => void;
}

/** Persists the grid/list view preference in localStorage. */
export function useDashboardView(): DashboardViewApi {
  const [view, setViewState] = useState<DashboardView>(() => read());

  const setView = useCallback((next: DashboardView) => {
    setViewState(next);
    write(next);
  }, []);

  return useMemo(() => ({ view, setView }), [view, setView]);
}
