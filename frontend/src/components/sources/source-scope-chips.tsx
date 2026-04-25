"use client";

import { useMemo } from "react";

import type { Source } from "@/types";

interface SourceScopeChipsProps {
  /** Pre-filtered to status === "ready" by the caller. */
  sources: Source[];
  mutedIds: string[];
  onToggle: (sourceId: string) => void;
  /** Optional ARIA label for the chip-row container. */
  ariaLabel?: string;
}

/**
 * Compute display names with duplicate suffixes. Mirrors the logic in
 * SourceList so the same source renders identically across the app.
 */
function computeDisplayNames(sources: Source[]): Map<string, string> {
  const sorted = [...sources].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const totals = new Map<string, number>();
  const keyFor = (s: Source): string => {
    if (s.sourceType === "app_store") {
      return `appstore::${s.appStoreName ?? s.appStoreId ?? ""}`;
    }
    return `csv::${s.filename ?? "CSV Upload"}`;
  };
  for (const s of sorted) {
    const k = keyFor(s);
    totals.set(k, (totals.get(k) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  const result = new Map<string, string>();
  for (const s of sorted) {
    const k = keyFor(s);
    const idx = (seen.get(k) ?? 0) + 1;
    seen.set(k, idx);
    const total = totals.get(k) ?? 1;
    const suffix = total > 1 ? ` (${idx})` : "";
    // Match the rendering in source-list.tsx so the same source reads
    // identically across the Sources list and the scope chips.
    if (s.sourceType === "app_store") {
      const label = s.appStoreName ?? `#${s.appStoreId ?? "?"}`;
      result.set(s.id, `App Store - ${label}${suffix}`);
    } else {
      const label = s.filename ?? "CSV Upload";
      result.set(s.id, `${label}${suffix}`);
    }
  }
  return result;
}

export function SourceScopeChips({
  sources,
  mutedIds,
  onToggle,
  ariaLabel,
}: SourceScopeChipsProps) {
  const displayNames = useMemo(() => computeDisplayNames(sources), [sources]);
  const mutedSet = useMemo(() => new Set(mutedIds), [mutedIds]);

  if (sources.length === 0) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/70">
        No ready sources yet
      </span>
    );
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? "Source scope selector"}
      className="flex flex-wrap gap-1"
    >
      {sources.map((source) => {
        const muted = mutedSet.has(source.id);
        const label = displayNames.get(source.id) ?? source.id;
        return (
          <button
            key={source.id}
            type="button"
            onClick={() => onToggle(source.id)}
            aria-pressed={!muted}
            className={
              muted
                ? "rounded-[2px] px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-on-surface-variant/50 ring-1 ring-inset ring-outline-variant/30 transition-colors hover:text-on-surface hover:ring-outline-variant/60"
                : "rounded-[2px] bg-surface-container-high px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-on-surface transition-colors hover:bg-surface-container-highest"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
