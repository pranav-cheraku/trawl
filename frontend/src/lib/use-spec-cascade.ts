"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks which spec IDs are NEW since the previous render (i.e., were not in
 * the previous specs array). Used to flag which spec cards should play the
 * post-generation cascade entrance animation.
 *
 * Returns a Set of spec IDs that should animate in. The set is cleared
 * automatically after `clearAfterMs` so subsequent re-renders (e.g. from
 * filter changes) don't re-trigger the animation on the same cards.
 */
export function useSpecCascade(
  specIds: string[],
  clearAfterMs = 1500,
): Set<string> {
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string> | null>(null);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentSet = new Set(specIds);

    if (prevIdsRef.current !== null) {
      const added: string[] = [];
      currentSet.forEach((id) => {
        if (!prevIdsRef.current!.has(id)) added.push(id);
      });
      // Heuristic: only treat as a "cascade" if 2+ new specs landed at once.
      // A single new spec from drag-and-drop or status-change should not cascade.
      if (added.length >= 2) {
        setNewIds(new Set(added));
        if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = setTimeout(() => {
          setNewIds(new Set());
        }, clearAfterMs);
      }
    }

    prevIdsRef.current = currentSet;

    return () => {
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, [specIds, clearAfterMs]);

  return newIds;
}
