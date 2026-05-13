"use client";

import { useEffect, useRef, useState } from "react";

import { getChunkDetail } from "@/lib/api";
import type { ChunkDetail, TransparencyChunk } from "@/types";

interface ChunkDetailModalProps {
  projectId: string;
  chunk: TransparencyChunk;
  onClose: () => void;
}

// Falls back to a backend fetch when chunkText/feedbackItemContent are absent
// from the transparency blob (older messages only carry the truncated preview).
export function ChunkDetailModal({
  projectId,
  chunk,
  onClose,
}: ChunkDetailModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const needsFetch =
    chunk.chunkText === undefined || chunk.feedbackItemContent === undefined;
  const [fetchedDetail, setFetchedDetail] = useState<ChunkDetail | null>(null);
  const [isFetching, setIsFetching] = useState(needsFetch);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!needsFetch) return;
    let cancelled = false;
    setIsFetching(true);
    setFetchError(null);
    getChunkDetail(projectId, chunk.chunkId)
      .then((detail) => {
        if (!cancelled) setFetchedDetail(detail);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError(
            "Couldn't load the full feedback for this chunk. Showing preview only.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chunk.chunkId, projectId, needsFetch]);

  const fullChunkText =
    chunk.chunkText ?? fetchedDetail?.chunkText ?? chunk.chunkTextPreview;
  const fullItemContent =
    chunk.feedbackItemContent ?? fetchedDetail?.feedbackItemContent ?? "";
  const showParentSection =
    fullItemContent.length > 0 &&
    fullItemContent.trim() !== fullChunkText.trim();

  const rankLabel = `#${String(chunk.retrievalRank).padStart(2, "0")}`;
  const score = chunk.similarityScore.toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close chunk details"
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[4px] bg-surface-container-lowest"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
              <span className="text-secondary">{rankLabel}</span>
              <span className="text-secondary">{score}</span>
              <span>·</span>
              <span className="truncate">
                {chunk.sourceType.toUpperCase()} · {chunk.sourceName}
              </span>
            </div>
            <h2 className="mt-2 text-[15px] font-bold text-on-surface">
              Retrieved chunk detail
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[4px] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isFetching && (
            <div className="flex items-center gap-2 rounded-[4px] bg-surface-container-low px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
              Loading full feedback…
            </div>
          )}
          {fetchError && (
            <div className="mb-3 rounded-[4px] bg-error/10 px-3 py-2 text-[12px] text-error">
              {fetchError}
            </div>
          )}
          <section className={isFetching ? "mt-3" : ""}>
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Chunk text
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-on-surface">
              {fullChunkText}
            </p>
          </section>

          {showParentSection && (
            <section className="mt-6 rounded-[4px] bg-surface-container-low p-4">
              <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                Full feedback item
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-on-surface">
                {fullItemContent}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
