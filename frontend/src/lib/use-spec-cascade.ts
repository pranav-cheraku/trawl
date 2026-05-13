"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a Set of spec IDs that appeared in the latest specIds array but not
 * the previous one. Cards in this set should play the cascade entrance animation.
 * The set is cleared after `clearAfterMs` so filter changes don't re-trigger
 * the animation on the same cards.
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
