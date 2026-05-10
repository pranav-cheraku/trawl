"use client";

import { forwardRef } from "react";

import type { TransparencyChunk } from "@/types";

interface ChunkCardProps {
  chunk: TransparencyChunk;
  isHighlighted: boolean;
  onClick?: (chunk: TransparencyChunk) => void;
  /** Optional badge text rendered above the chunk preview — e.g. "Q2 · REQUESTS" in the build variant. */
  queryLabel?: string;
}

/**
 * One card in the RAG X-Ray panel. Clickable — opens a detail modal showing
 * the full chunk text and full parent feedback item content. Scroll+highlight
 * orchestration lives on the parent XrayPanel, which keeps a ref map keyed
 * by chunkId.
 */
export const ChunkCard = forwardRef<HTMLDivElement, ChunkCardProps>(
  function ChunkCard({ chunk, isHighlighted, onClick, queryLabel }, ref) {
    const rankLabel = `#${String(chunk.retrievalRank).padStart(2, "0")}`;
    const score = chunk.similarityScore.toFixed(2);
    const sourceType = chunk.sourceType.toUpperCase();

    return (
      <div
        ref={ref}
        className={`rounded-[4px] transition-shadow duration-500 ${
          isHighlighted ? "ring-2 ring-secondary" : "ring-0 ring-transparent"
        }`}
      >
        <button
          type="button"
          onClick={() => onClick?.(chunk)}
          className="w-full cursor-pointer rounded-[4px] bg-surface-container-lowest px-4 py-3 text-left transition-colors hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.1em]">
            <div className="flex items-center gap-2">
              <span className="text-secondary">{rankLabel}</span>
              <span className="text-secondary">{score}</span>
            </div>
            <div className="truncate text-on-surface-variant">
              {sourceType ? `${sourceType} · ` : ""}
              {chunk.sourceName}
            </div>
          </div>
          {queryLabel ? (
            <div className="mt-2 inline-flex items-center rounded-[2px] bg-surface-container px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">
              {queryLabel}
            </div>
          ) : null}
          <p className="mt-2 text-[13px] leading-relaxed text-on-surface">
            {chunk.chunkTextPreview}
          </p>
        </button>
      </div>
    );
  },
);
