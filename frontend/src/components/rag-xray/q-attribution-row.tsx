// frontend/src/components/rag-xray/q-attribution-row.tsx
"use client";

import { forwardRef } from "react";

import { BUILD_NEXT_QUERY_LABELS } from "@/lib/build-next-queries";

interface QAttributionRowProps {
  /** 0..4: which Q badge is currently highlighted, or null for none. */
  activeIndex: number | null;
  /** Map a Q-index to its DOM ref so the parent can compute guide-line coords. */
  setBadgeRef: (index: number) => (el: HTMLDivElement | null) => void;
}

/**
 * Horizontal row of Q1..Q5 badges shown above the chunks list in the X-Ray
 * build variant. Used as the target for hover guide-lines drawn from chunks.
 * The active badge brightens; others stay dim.
 */
export const QAttributionRow = forwardRef<HTMLDivElement, QAttributionRowProps>(
  function QAttributionRow({ activeIndex, setBadgeRef }, ref) {
    return (
      <div
        ref={ref}
        className="flex flex-wrap gap-1.5 px-4 pb-2 pt-3"
        aria-label="Build Next query attribution"
      >
        {BUILD_NEXT_QUERY_LABELS.map((label, idx) => {
          const active = activeIndex === idx;
          return (
            <div
              key={idx}
              ref={setBadgeRef(idx)}
              className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "bg-secondary text-surface-container-lowest"
                  : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    );
  },
);
