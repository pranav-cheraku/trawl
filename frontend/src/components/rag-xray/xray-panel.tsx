"use client";

import { useEffect, useRef, useState } from "react";

import { ChunkCard } from "@/components/rag-xray/chunk-card";
import { ChunkDetailModal } from "@/components/rag-xray/chunk-detail-modal";
import { XrayEmpty } from "@/components/rag-xray/xray-empty";
import type { Message, SpecSources, TransparencyChunk } from "@/types";

type ChatVariant = {
  variant: "chat";
  projectId: string;
  selectedMessage: Message | null;
  focusedChunkId: string | null;
  focusTick: number;
};

type SpecVariant = {
  variant: "spec";
  projectId: string;
  specSources: SpecSources | null;
  focusedChunkId: string | null;
  focusTick: number;
};

type XrayPanelProps = ChatVariant | SpecVariant;

const HIGHLIGHT_DURATION_MS = 800;

export function XrayPanel(props: XrayPanelProps) {
  const { projectId, focusedChunkId, focusTick } = props;
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

  // ── Chat variant: derive chunks + header from selectedMessage ─────────
  if (props.variant === "chat") {
    const transparency = props.selectedMessage?.transparency ?? null;
    const chunks = transparency?.retrievedChunks ?? [];

    if (
      !props.selectedMessage ||
      props.selectedMessage.role !== "assistant" ||
      !transparency
    ) {
      return (
        <div className="flex h-full flex-col rounded-[4px] bg-surface-container-low">
          <XrayEmpty />
        </div>
      );
    }

    return (
      <PanelShell
        header={<XrayChatHeader transparency={transparency} />}
        chunks={chunks}
        threshold={transparency.threshold}
        highlightedChunkId={highlightedChunkId}
        onChunkClick={setDetailChunk}
        cardRefs={cardRefs}
        detailChunk={detailChunk}
        closeDetail={() => setDetailChunk(null)}
        projectId={projectId}
      />
    );
  }

  // ── Spec variant: derive chunks from specSources ──────────────────────
  const { specSources } = props;
  if (!specSources) {
    return (
      <div className="flex h-full flex-col rounded-[4px] bg-surface-container-low">
        <XrayEmpty />
      </div>
    );
  }
  const chunks = specSources.retrievedChunks ?? [];

  return (
    <PanelShell
      header={<XraySpecHeader specSources={specSources} />}
      chunks={chunks}
      threshold={null}
      highlightedChunkId={highlightedChunkId}
      onChunkClick={setDetailChunk}
      cardRefs={cardRefs}
      detailChunk={detailChunk}
      closeDetail={() => setDetailChunk(null)}
      projectId={projectId}
    />
  );
}

interface PanelShellProps {
  header: React.ReactNode;
  chunks: TransparencyChunk[];
  /** Used only to render the "no chunks above threshold" empty-state copy. */
  threshold: number | null;
  highlightedChunkId: string | null;
  onChunkClick: (chunk: TransparencyChunk) => void;
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  detailChunk: TransparencyChunk | null;
  closeDetail: () => void;
  projectId: string;
}

function PanelShell({
  header,
  chunks,
  threshold,
  highlightedChunkId,
  onChunkClick,
  cardRefs,
  detailChunk,
  closeDetail,
  projectId,
}: PanelShellProps) {
  return (
    <>
      <div className="flex h-full flex-col rounded-[4px] bg-surface-container-low">
        {header}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {chunks.length === 0 ? (
            <div className="mt-4 rounded-[4px] bg-surface-container-lowest px-4 py-6 text-center text-[12px] leading-relaxed text-on-surface-variant">
              {threshold !== null ? (
                <>
                  No chunks above the{" "}
                  <span className="font-mono">{threshold.toFixed(2)}</span>{" "}
                  similarity threshold. Try rephrasing or adding more feedback
                  sources.
                </>
              ) : (
                <>No retrieved chunks recorded for this spec.</>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {chunks.map((chunk) => (
                <ChunkCard
                  key={chunk.chunkId}
                  chunk={chunk}
                  isHighlighted={highlightedChunkId === chunk.chunkId}
                  onClick={onChunkClick}
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
          onClose={closeDetail}
        />
      )}
    </>
  );
}

interface XrayChatHeaderProps {
  transparency: NonNullable<Message["transparency"]>;
}

function XrayChatHeader({ transparency }: XrayChatHeaderProps) {
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

interface XraySpecHeaderProps {
  specSources: SpecSources;
}

function XraySpecHeader({ specSources }: XraySpecHeaderProps) {
  const chunksShown = specSources.retrievedChunks?.length ?? 0;
  const candidates = specSources.totalChunksSearched;
  const topK = specSources.retrievalTopK;
  const model = specSources.modelUsed;
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        RAG X-Ray · Spec
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-on-surface">
        {(() => {
          const parts: string[] = [];
          if (model) parts.push(model);
          if (topK != null) parts.push(`k=${topK}`);
          if (candidates != null) parts.push(`${candidates} candidates`);
          parts.push(`${chunksShown} retrieved`);
          return parts.flatMap((part, i) =>
            i === 0
              ? [<span key={`p${i}`}>{part}</span>]
              : [
                  <span key={`s${i}`} className="text-on-surface-variant">
                    ·
                  </span>,
                  <span key={`p${i}`}>{part}</span>,
                ],
          );
        })()}
      </div>
    </div>
  );
}
