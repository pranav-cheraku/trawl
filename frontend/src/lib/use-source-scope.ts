"use client";

import { useCallback, useEffect, useState } from "react";

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
    // Corrupted localStorage entry — treat as no mutes.
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
    // Quota exceeded / storage disabled — silently ignore.
  }
}

export interface UseSourceScopeReturn {
  /** Currently muted source IDs for this (project, tab). */
  mutedIds: string[];
  /** Test whether a single source is muted. */
  isMuted: (id: string) => boolean;
  /** Toggle a source's mute state. */
  toggle: (id: string) => void;
  /** Un-mute every source for this (project, tab). */
  clear: () => void;
  /**
   * Derive the active source IDs given the current ready-source list.
   * "Active" = a source ID that exists in `allReady` but isn't in `mutedIds`.
   */
  activeIds: (allReady: Source[]) => string[];
}

/**
 * Per-tab, per-project source mute selection backed by localStorage.
 *
 * The storage shape is a list of MUTED source IDs (not a list of selected
 * IDs). This means the default state — for a brand-new tab visit, or for
 * a user who has never opted in — is "every source is active." Newly-added
 * sources are automatically active because they aren't in the muted list.
 */
export function useSourceScope(
  projectId: string,
  tab: SourceScopeTab,
): UseSourceScopeReturn {
  const [mutedIds, setMutedIds] = useState<string[]>(() =>
    readMutedIds(projectId, tab),
  );

  // Re-read when the (projectId, tab) key changes so navigating between
  // projects in the same tab picks up the new project's saved state.
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

  return { mutedIds, isMuted, toggle, clear, activeIds };
}
