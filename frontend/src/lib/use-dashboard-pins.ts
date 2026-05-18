"use client";
// Persists pinned project IDs in localStorage. Independent of project list
// state; stale IDs from deleted projects are silently ignored.
import { useCallback, useMemo, useState } from "react";

const STORAGE_KEY = "trawl:dashboard:pinned";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / permission errors
  }
}

export interface DashboardPinsApi {
  pinnedIds: string[];
  isPinned: (id: string) => boolean;
  toggle: (id: string) => void;
}

/**
 * Persists pinned project IDs in localStorage. Stale IDs (project deleted
 * while ID still in storage) are harmless. isPinned returns false for any
 * ID not present in the current project list.
 */
export function useDashboardPins(): DashboardPinsApi {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => read());

  const isPinned = useCallback(
    (id: string) => pinnedIds.includes(id),
    [pinnedIds],
  );

  const toggle = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({ pinnedIds, isPinned, toggle }),
    [pinnedIds, isPinned, toggle],
  );
}
