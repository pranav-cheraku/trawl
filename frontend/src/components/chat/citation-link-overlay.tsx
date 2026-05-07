"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useCitationLink } from "@/lib/citation-link-context";
import { springs } from "@/lib/motion";

/**
 * Absolute-positioned full-screen SVG overlay rendered as a sibling of the
 * Explore page's tri-column grid. Reads `hoveredCitation` from the shared
 * context and draws an animated guide-line from the badge to its matching chunk.
 *
 * Pointer-events disabled so the overlay never intercepts hover/click on the
 * chat or X-Ray UI beneath it.
 */
export function CitationLinkOverlay() {
  const { hoveredCitation } = useCitationLink();
  const prefersReducedMotion = useReducedMotion();

  if (!hoveredCitation) return null;

  const { badgeRect, chunkRect } = hoveredCitation;

  // Anchor on badge right edge, chunk left edge — most natural read.
  const x1 = badgeRect.right;
  const y1 = badgeRect.top + badgeRect.height / 2;
  const x2 = chunkRect.left;
  const y2 = chunkRect.top + chunkRect.height / 2;
  const pathD = `M ${x1} ${y1} L ${x2} ${y2}`;

  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] h-screen w-screen"
    >
      <motion.path
        d={pathD}
        stroke="rgb(37,99,235)"
        strokeWidth={1}
        fill="none"
        initial={
          prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }
        }
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={
          prefersReducedMotion ? { duration: 0 } : { ...springs.snappy }
        }
      />
    </svg>
  );
}
