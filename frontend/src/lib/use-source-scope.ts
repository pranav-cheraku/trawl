"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Source } from "@/types";

export type SourceScopeTab = "explore" | "specs" | "build";

function storageKey(projectId: string, tab: SourceScopeTab): string {
  return `trawl:scope:${projectId}:${tab}:muted`;
}

function readMutedIds(projectId: string, tab: SourceScopeTab): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(projectId, tab));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((v) => typeof v === "string")
    ) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function writeMutedIds(
  projectId: string,
  tab: SourceScopeTab,
  ids: string[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(projectId, tab),
      JSON.stringify(ids),
    );
  } catch {
    // Quota exceeded or storage disabled.
  }
}

export interface UseSourceScopeReturn {
  mutedIds: string[];
  isMuted: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  activeIds: (allReady: Source[]) => string[];
}

/**
 * Per-tab, per-project source mute selection backed by localStorage.
 * Stores muted IDs rather than selected IDs so newly-added sources are
 * automatically active without any explicit opt-in.
 */
export function useSourceScope(
  projectId: string,
  tab: SourceScopeTab,
): UseSourceScopeReturn {
  const [mutedIds, setMutedIds] = useState<string[]>(() =>
    readMutedIds(projectId, tab),
  );

  useEffect(() => {
    setMutedIds(readMutedIds(projectId, tab));
  }, [projectId, tab]);

  const toggle = useCallback(
    (id: string) => {
      setMutedIds((prev) => {
        const next = prev.includes(id)
          ? prev.filter((existing) => existing !== id)
          : [...prev, id];
        writeMutedIds(projectId, tab, next);
        return next;
      });
    },
    [projectId, tab],
  );

  const clear = useCallback(() => {
    setMutedIds(() => {
      writeMutedIds(projectId, tab, []);
      return [];
    });
  }, [projectId, tab]);

  const isMuted = useCallback(
    (id: string) => mutedIds.includes(id),
    [mutedIds],
  );

  const activeIds = useCallback(
    (allReady: Source[]): string[] => {
      const muted = new Set(mutedIds);
      return allReady.filter((s) => !muted.has(s.id)).map((s) => s.id);
    },
    [mutedIds],
  );

  return useMemo(
    () => ({ mutedIds, isMuted, toggle, clear, activeIds }),
    [mutedIds, isMuted, toggle, clear, activeIds],
  );
}
