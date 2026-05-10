"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { ChunkCard } from "@/components/rag-xray/chunk-card";
import { ChunkDetailModal } from "@/components/rag-xray/chunk-detail-modal";
import { QAttributionRow } from "@/components/rag-xray/q-attribution-row";
import { XrayEmpty } from "@/components/rag-xray/xray-empty";
import { queryIndexFromText } from "@/lib/build-next-queries";
import { springs } from "@/lib/motion";
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

  // Build variant: hover state for guide-line drawing + badge refs
  const [hoveredBuildChunkId, setHoveredBuildChunkId] = useState<string | null>(null);
  const attributionBadgeRefs = useRef<Map<number, HTMLDivElement | null>>(
    new Map(),
  );
  const attributionRowRef = useRef<HTMLDivElement | null>(null);

  // Memoize build-variant derivations at the top level so they don't reallocate
  // on every parent re-render (e.g. when the hover state changes). Hooks can't
  // be called conditionally, so we hoist the source data via a stable dep and
  // gate the computation inside the memo.
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
  const chunkQueryIndex = useMemo<Map<string, number>>(() => {
    if (!buildVariantChunks) return new Map();
    return new Map(
      buildVariantChunks.map((c) => [c.chunkId, queryIndexFromText(c.sourceQuery)]),
    );
  }, [buildVariantChunks]);
  const highestSimilarityChunkId = useMemo<string | null>(() => {
    if (buildChunks.length === 0) return null;
    let bestId: string | null = null;
    let bestScore = -Infinity;
    for (const c of buildChunks) {
      if (c.similarityScore > bestScore) {
        bestScore = c.similarityScore;
        bestId = c.chunkId;
      }
    }
    return bestId;
  }, [buildChunks]);

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
    const isAssistant =
      props.selectedMessage?.role === "assistant" && transparency !== null;

    if (!isAssistant) {
      // No message yet (or non-assistant). Retrieval settings live in the
      // page-level corpus context strip, not this panel — so just render the
      // empty state.
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

  // ── Build variant: derive chunks from a Build Next report ─────────────
  if (props.variant === "build") {
    const { reportMetadata } = props;
    const activeQueryIndex =
      hoveredBuildChunkId !== null
        ? chunkQueryIndex.get(hoveredBuildChunkId) ?? null
        : null;

    return (
      <BuildPanelLayout
        header={
          <XrayBuildHeader
            metadata={reportMetadata}
            retrievedCount={buildChunks.length}
          />
        }
        attributionRow={
          <QAttributionRow
            ref={attributionRowRef}
            activeIndex={
              activeQueryIndex !== null && activeQueryIndex >= 0
                ? activeQueryIndex
                : null
            }
            setBadgeRef={(idx) => (el) => {
              attributionBadgeRefs.current.set(idx, el);
            }}
          />
        }
        chunks={buildChunks}
        chunkQueryIndex={chunkQueryIndex}
        highestSimilarityChunkId={highestSimilarityChunkId}
        highlightedChunkId={highlightedChunkId}
        cardRefs={cardRefs}
        attributionBadgeRefs={attributionBadgeRefs}
        hoveredChunkId={hoveredBuildChunkId}
        onChunkHover={setHoveredBuildChunkId}
        onChunkClick={setDetailChunk}
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
  // Only render the modal if the stored chunk actually belongs to the
  // currently-displayed chunk set. Prevents a stale modal from appearing
  // when the user switches between messages while detailChunk state hasn't
  // been cleared yet.
  const visibleDetailChunk =
    detailChunk && chunks.some((c) => c.chunkId === detailChunk.chunkId)
      ? detailChunk
      : null;
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

// ── BuildPanelLayout ──────────────────────────────────────────────────────────
// Replaces PanelShell for the build variant — has a Q-attribution row above the
// chunk list and renders an SVG guide-line from the hovered chunk to its badge.

interface BuildPanelLayoutProps {
  header: React.ReactNode;
  attributionRow: React.ReactNode;
  chunks: TransparencyChunk[];
  chunkQueryIndex: Map<string, number>;
  highestSimilarityChunkId: string | null;
  highlightedChunkId: string | null;
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  attributionBadgeRefs: React.MutableRefObject<Map<number, HTMLDivElement | null>>;
  hoveredChunkId: string | null;
  onChunkHover: (chunkId: string | null) => void;
  onChunkClick: (chunk: TransparencyChunk) => void;
  detailChunk: TransparencyChunk | null;
  closeDetail: () => void;
  projectId: string;
}

function BuildPanelLayout(props: BuildPanelLayoutProps) {
  const {
    header,
    attributionRow,
    chunks,
    chunkQueryIndex,
    highestSimilarityChunkId,
    highlightedChunkId,
    cardRefs,
    attributionBadgeRefs,
    hoveredChunkId,
    onChunkHover,
    onChunkClick,
    detailChunk,
    closeDetail,
    projectId,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Compute SVG path coords from the hovered chunk card to its matching badge.
  const guideLinePath = useMemo(() => {
    if (!hoveredChunkId) return null;
    const queryIndex = chunkQueryIndex.get(hoveredChunkId);
    if (queryIndex === undefined || queryIndex < 0) return null;
    const container = containerRef.current;
    const cardEl = cardRefs.current.get(hoveredChunkId);
    const badgeEl = attributionBadgeRefs.current.get(queryIndex);
    if (!container || !cardEl || !badgeEl) return null;
    const cBox = container.getBoundingClientRect();
    const cardBox = cardEl.getBoundingClientRect();
    const badgeBox = badgeEl.getBoundingClientRect();
    const x1 = cardBox.left - cBox.left + 8; // anchor on the left edge of the card
    const y1 = cardBox.top - cBox.top + cardBox.height / 2;
    const x2 = badgeBox.left - cBox.left + badgeBox.width / 2;
    const y2 = badgeBox.top - cBox.top + badgeBox.height;
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }, [hoveredChunkId, chunkQueryIndex, cardRefs, attributionBadgeRefs]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-col rounded-[4px] bg-surface-container-low"
    >
      {header}
      {attributionRow}
      <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-4 pt-1">
        {chunks.map((chunk) => (
          <li key={chunk.chunkId}>
            <ChunkCard
              chunk={chunk}
              isHighlighted={highlightedChunkId === chunk.chunkId}
              onClick={onChunkClick}
              pulse={chunk.chunkId === highestSimilarityChunkId}
              onHoverChange={onChunkHover}
              ref={(el) => {
                if (el) cardRefs.current.set(chunk.chunkId, el);
                else cardRefs.current.delete(chunk.chunkId);
              }}
            />
          </li>
        ))}
      </ul>
      {guideLinePath && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <motion.path
            d={guideLinePath}
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
      )}
      {detailChunk && (
        <ChunkDetailModal
          chunk={detailChunk}
          projectId={projectId}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
