"use client";

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
  const isClickable = Boolean(chunk && onClick);

  function handleClick() {
    if (chunk && onClick) {
      onClick(chunk.chunkId);
    }
  }

  const baseClasses =
    "inline-flex items-center align-baseline font-mono text-[11px] font-medium " +
    "rounded-[4px] px-1.5 py-0.5 mx-0.5 transition-colors select-none";

  if (!isClickable) {
    return (
      <span
        className={`${baseClasses} bg-surface-container-high text-on-surface-variant opacity-40 cursor-not-allowed`}
        title="Citation target missing"
      >
        F#{index}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseClasses} bg-surface-container-high text-on-surface hover:bg-secondary hover:text-white`}
      title={chunk ? `${chunk.sourceName} · ${chunk.similarityScore.toFixed(2)}` : ""}
    >
      F#{index}
    </button>
  );
}
