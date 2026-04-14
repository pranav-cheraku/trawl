"use client";

import { useEffect, useRef, useState } from "react";

import { ChunkCard } from "@/components/rag-xray/chunk-card";
import { ChunkDetailModal } from "@/components/rag-xray/chunk-detail-modal";
import { XrayEmpty } from "@/components/rag-xray/xray-empty";
import type { Message, TransparencyChunk } from "@/types";

interface XrayPanelProps {
  projectId: string;
  selectedMessage: Message | null;
  /** Chunk the parent wants scrolled+highlighted. */
  focusedChunkId: string | null;
  /** Monotonic counter so repeat clicks on the same chunk refocus. */
  focusTick: number;
}

const HIGHLIGHT_DURATION_MS = 800;

export function XrayPanel({
  projectId,
  selectedMessage,
  focusedChunkId,
  focusTick,
}: XrayPanelProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(
    null,
  );
  const [detailChunk, setDetailChunk] = useState<TransparencyChunk | null>(
    null,
  );

  // Scroll + highlight when the parent changes focus. Depending on both the
  // id AND the tick means re-clicking the same badge still triggers the
  // effect (state transition is the tick, not the id).
  useEffect(() => {
    if (!focusedChunkId) return;
    const node = cardRefs.current.get(focusedChunkId);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedChunkId(focusedChunkId);
    const handle = window.setTimeout(() => {
      setHighlightedChunkId(null);
    }, HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedChunkId, focusTick]);

  const transparency = selectedMessage?.transparency ?? null;
  const chunks = transparency?.retrievedChunks ?? [];

  if (!selectedMessage || selectedMessage.role !== "assistant" || !transparency) {
    return (
      <div className="flex h-full flex-col rounded-[4px] bg-surface-container-low">
        <XrayEmpty />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col rounded-[4px] bg-surface-container-low">
        <XrayHeader transparency={transparency} />
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {chunks.length === 0 ? (
            <div className="mt-4 rounded-[4px] bg-surface-container-lowest px-4 py-6 text-center text-[12px] leading-relaxed text-on-surface-variant">
              No chunks above the{" "}
              <span className="font-mono">
                {transparency.threshold.toFixed(2)}
              </span>{" "}
              similarity threshold. Try rephrasing or adding more feedback
              sources.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {chunks.map((chunk) => (
                <ChunkCard
                  key={chunk.chunkId}
                  chunk={chunk}
                  isHighlighted={highlightedChunkId === chunk.chunkId}
                  onClick={setDetailChunk}
                  ref={(node) => {
                    if (node) {
                      cardRefs.current.set(chunk.chunkId, node);
                    } else {
                      cardRefs.current.delete(chunk.chunkId);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {detailChunk && (
        <ChunkDetailModal
          projectId={projectId}
          chunk={detailChunk}
          onClose={() => setDetailChunk(null)}
        />
      )}
    </>
  );
}

interface XrayHeaderProps {
  transparency: NonNullable<Message["transparency"]>;
}

function XrayHeader({ transparency }: XrayHeaderProps) {
  const hasModel = transparency.modelUsed !== null;
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        RAG X-Ray
      </div>
      {hasModel ? (
        <>
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-on-surface">
            <span>{transparency.modelUsed}</span>
            <span className="text-on-surface-variant">·</span>
            <span>k={transparency.topK}</span>
            <span className="text-on-surface-variant">·</span>
            <span>t={transparency.threshold.toFixed(2)}</span>
            <span className="text-on-surface-variant">·</span>
            <span>{transparency.totalChunksSearched} candidates</span>
          </div>
          <div className="font-mono text-[10px] text-on-surface-variant">
            retrieval {transparency.retrievalLatencyMs}ms · generation{" "}
            {transparency.generationLatencyMs}ms · {transparency.inputTokens}↓
            / {transparency.outputTokens}↑
          </div>
        </>
      ) : (
        <div className="font-mono text-[10px] text-on-surface-variant">
          {transparency.retrievedChunks.length} chunks found · retrieval{" "}
          {transparency.retrievalLatencyMs}ms
        </div>
      )}
    </div>
  );
}
