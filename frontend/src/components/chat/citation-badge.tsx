"use client";

import { motion, useReducedMotion } from "framer-motion";

import type { TransparencyChunk } from "@/types";

interface CitationBadgeProps {
  index: number;
  chunk: TransparencyChunk | undefined;
  onClick?: (chunkId: string) => void;
}

/**
 * Inline citation pill rendered inside assistant prose — `[F#3]`.
 *
 * Resolves to a specific chunk via transparency.retrievedChunks[index-1].
 * When the chunk is undefined (rare — Claude cited an out-of-range index),
 * the badge renders disabled so users still see the citation intent but
 * can't click to nowhere.
 */
export function CitationBadge({ index, chunk, onClick }: CitationBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const isClickable = Boolean(chunk && onClick);

  const motionInitial = prefersReducedMotion ? false : { opacity: 0 };
  const motionAnimate = { opacity: 1 };
  const motionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: "easeOut" };

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Stop propagation so the badge click doesn't also trigger the
    // parent assistant bubble's onClick (which would clear focusedChunkId
    // as part of its "plain bubble click" behavior and clobber our
    // scroll-to-chunk intent).
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
