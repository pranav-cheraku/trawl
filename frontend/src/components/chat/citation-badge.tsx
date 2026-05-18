"use client";
// Inline citation badge rendered inside chat message Markdown. Clicking
// scrolls the X-Ray panel to the corresponding chunk. Emitted by the
// custom remark plugin in chat-message.tsx via sentinel-marker tokenization.

import { motion, useReducedMotion } from "framer-motion";

import type { TransparencyChunk } from "@/types";

interface CitationBadgeProps {
  index: number;
  chunk: TransparencyChunk | undefined;
  onClick?: (chunkId: string) => void;
}

// Renders disabled when chunk is undefined (out-of-range citation index)
// so users still see the citation intent without a broken click target.
export function CitationBadge({ index, chunk, onClick }: CitationBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const isClickable = Boolean(chunk && onClick);

  const motionInitial = prefersReducedMotion ? false : { opacity: 0 };
  const motionAnimate = { opacity: 1 };
  const motionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: "easeOut" };

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Without stopPropagation the parent bubble's onClick clears focusedChunkId,
    // undoing the scroll-to-chunk before it can happen.
    e.stopPropagation();
    if (chunk && onClick) {
      onClick(chunk.chunkId);
    }
  }

  const baseClasses =
    "inline-flex items-center align-baseline font-mono text-[11px] font-medium " +
    "rounded-[4px] px-1.5 py-0.5 mx-0.5 transition-colors select-none";

  if (!isClickable) {
    return (
      <motion.span
        initial={motionInitial}
        animate={motionAnimate}
        transition={motionTransition}
        className={`${baseClasses} bg-surface-container-high text-on-surface-variant opacity-40 cursor-not-allowed`}
        title="Citation target missing"
      >
        F#{index}
      </motion.span>
    );
  }

  return (
    <motion.button
      initial={motionInitial}
      animate={motionAnimate}
      transition={motionTransition}
      type="button"
      onClick={handleClick}
      className={`${baseClasses} bg-surface-container-high text-on-surface hover:bg-secondary hover:text-white`}
      title={chunk ? `${chunk.sourceName} · ${chunk.similarityScore.toFixed(2)}` : ""}
    >
      F#{index}
    </motion.button>
  );
}
