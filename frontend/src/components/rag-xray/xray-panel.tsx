"use client";
// RAG X-Ray panel: 3-arm discriminated union (chat | spec | build). Each variant
// exposes the retrieved chunks that drove the response/spec/report. TypeScript
// narrows the props per branch so callers get compile-time safety.
// focusTick is incremented by the caller to re-scroll to the same chunk when
// the user clicks a citation badge that is already the highlighted chunk.
import { useEffect, useMemo, useRef, useState } from "react";

import { ChunkCard } from "@/components/rag-xray/chunk-card";
import { ChunkDetailModal } from "@/components/rag-xray/chunk-detail-modal";
import { XrayEmpty } from "@/components/rag-xray/xray-empty";
import {
  BUILD_NEXT_QUERY_LABELS,
  queryIndexFromText,
} from "@/lib/build-next-queries";
import type {
  BuildReportChunk,
  BuildRetrievalMetadata,
  Message,
  SpecSources,
  TransparencyChunk,
} from "@/types";

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

type BuildVariant = {
  variant: "build";
  projectId: string;
  reportChunks: BuildReportChunk[];
  reportMetadata: BuildRetrievalMetadata | null;
  focusedChunkId: string | null;
  focusTick: number;
};

type XrayPanelProps = ChatVariant | SpecVariant | BuildVariant;

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

  // Hooks cannot be called conditionally, so all variants' memos run at the top
  // level; the build-variant ones short-circuit when buildVariantChunks is null.
  const buildVariantChunks =
    props.variant === "build" ? props.reportChunks : null;
  const buildChunks = useMemo<TransparencyChunk[]>(() => {
    if (!buildVariantChunks) return [];
    return buildVariantChunks.map((c) => ({
      chunkId: c.chunkId,
      feedbackItemId: c.feedbackItemId,
      chunkTextPreview:
        c.chunkText.length > 280
          ? c.chunkText.slice(0, 280) + "…"
          : c.chunkText,
      chunkText: c.chunkText,
      similarityScore: c.similarity,
      retrievalRank: c.retrievalRank,
      sourceType: "",
      sourceName: c.sourceName,
    }));
  }, [buildVariantChunks]);
  const chunkQueryLabels = useMemo<Map<string, string>>(() => {
    if (!buildVariantChunks) return new Map();
    const m = new Map<string, string>();
    for (const c of buildVariantChunks) {
      const idx = queryIndexFromText(c.sourceQuery);
      if (idx >= 0) m.set(c.chunkId, BUILD_NEXT_QUERY_LABELS[idx]);
    }
    return m;
  }, [buildVariantChunks]);

  // Depend on both focusedChunkId and focusTick so re-clicking the same citation
  // badge re-triggers the scroll (tick changes even when id stays the same).
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

  if (props.variant === "chat") {
    const transparency = props.selectedMessage?.transparency ?? null;
    const isAssistant =
      props.selectedMessage?.role === "assistant" && transparency !== null;

    if (!isAssistant) {
      return (
        <div className="flex h-full flex-col rounded-[4px] bg-surface-container-low">
          <XrayEmpty />
        </div>
      );
    }

    const chunks = transparency!.retrievedChunks ?? [];
    return (
      <PanelShell
        header={<XrayChatHeader transparency={transparency!} />}
        chunks={chunks}
        threshold={transparency!.threshold}
        highlightedChunkId={highlightedChunkId}
        onChunkClick={setDetailChunk}
        cardRefs={cardRefs}
        detailChunk={detailChunk}
        closeDetail={() => setDetailChunk(null)}
        projectId={projectId}
      />
    );
  }

  if (props.variant === "build") {
    const { reportMetadata } = props;
    return (
      <PanelShell
        header={
          <XrayBuildHeader
            metadata={reportMetadata}
            retrievedCount={buildChunks.length}
          />
        }
        chunks={buildChunks}
        threshold={null}
        highlightedChunkId={highlightedChunkId}
        onChunkClick={setDetailChunk}
        cardRefs={cardRefs}
        detailChunk={detailChunk}
        closeDetail={() => setDetailChunk(null)}
        projectId={projectId}
        chunkQueryLabels={chunkQueryLabels}
      />
    );
  }

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
  threshold: number | null;
  highlightedChunkId: string | null;
  onChunkClick: (chunk: TransparencyChunk) => void;
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  detailChunk: TransparencyChunk | null;
  closeDetail: () => void;
  projectId: string;
  chunkQueryLabels?: Map<string, string>;
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
  chunkQueryLabels,
}: PanelShellProps) {
  // Guard against a stale detailChunk lingering after the user switches
  // messages before the state has been cleared.
  const visibleDetailChunk =
    detailChunk && chunks.some((c) => c.chunkId === detailChunk.chunkId)
      ? detailChunk
      : null;
  return (
    <>
      <div className="flex h-full flex-col rounded-[4px] bg-surface-container-low">
        {/* Header */}
        {header}
        {/* Chunk list */}
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
                  queryLabel={chunkQueryLabels?.get(chunk.chunkId)}
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
      {visibleDetailChunk && (
        <ChunkDetailModal
          projectId={projectId}
          chunk={visibleDetailChunk}
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
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        RAG X-Ray
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-on-surface-variant">
        <span>k={transparency.topK}</span>
        <span>·</span>
        <span>t={transparency.threshold.toFixed(2)}</span>
        <span>·</span>
        <span>{transparency.totalChunksSearched} candidates</span>
        <span>·</span>
        <span>{transparency.retrievalLatencyMs}ms retrieval</span>
        {transparency.modelUsed !== null && (
          <>
            <span>·</span>
            <span>{transparency.generationLatencyMs}ms gen</span>
          </>
        )}
      </div>
    </div>
  );
}

interface XrayBuildHeaderProps {
  metadata: BuildRetrievalMetadata | null;
  retrievedCount: number;
}

function XrayBuildHeader({ metadata, retrievedCount }: XrayBuildHeaderProps) {
  if (!metadata) {
    return (
      <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          RAG X-Ray
        </div>
      </div>
    );
  }
  const queryCount = metadata.queries?.length ?? 0;
  const tokens = metadata.tokenUsage
    ? metadata.tokenUsage.input + metadata.tokenUsage.output
    : null;
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        RAG X-Ray · Build Report
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-on-surface-variant">
        {queryCount > 0 ? <span>{queryCount} queries</span> : null}
        {metadata.topKPerQuery ? (
          <span>k={metadata.topKPerQuery} per query</span>
        ) : null}
        <span>{retrievedCount} retrieved</span>
        {tokens != null ? <span>{tokens.toLocaleString()} tokens</span> : null}
      </div>
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
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        RAG X-Ray · Spec
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-on-surface">
        {(() => {
          const parts: string[] = [];
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

