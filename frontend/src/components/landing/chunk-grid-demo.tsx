// frontend/src/components/landing/chunk-grid-demo.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { durations, easings, springs } from "@/lib/motion";
import answerData from "../../../public/landing-fixtures/answer.json";
import chunks from "../../../public/landing-fixtures/chunks.json";

const QUESTION = "Why are users churning after the free trial?";
const TYPE_INTERVAL_MS = 60;
const ANSWER_CHAR_INTERVAL_MS = 25;

interface AnswerSegment {
  type: "text" | "citation";
  value: string;
  marker?: number;
  chunkId?: string;
}

/** Parse "...with auto-renew triggers without warning [3], and ..." into segments. */
function parseAnswer(text: string, citations: { marker: number; chunkId: string }[]): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  const regex = /\[(\d+)\]/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const marker = Number(match[1]);
    const lookup = citations.find((c) => c.marker === marker);
    if (match.index > lastIdx) {
      segments.push({ type: "text", value: text.slice(lastIdx, match.index) });
    }
    segments.push({
      type: "citation",
      value: match[0],
      marker,
      chunkId: lookup?.chunkId,
    });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    segments.push({ type: "text", value: text.slice(lastIdx) });
  }
  return segments;
}

export function ChunkGridDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const prefersReducedMotion = useReducedMotion();

  const [typedQuestion, setTypedQuestion] = useState("");
  const [chunksRevealed, setChunksRevealed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [hoveredChunkId, setHoveredChunkId] = useState<string | null>(null);
  const chunkRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const citationRefs = useRef<Map<string, HTMLSpanElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(
    () => parseAnswer(answerData.text, answerData.citations),
    [],
  );

  // Reset state when leaving viewport so re-entry replays the demo.
  useEffect(() => {
    if (!inView) {
      setTypedQuestion("");
      setChunksRevealed(false);
      setTypedAnswer("");
    }
  }, [inView]);

  // Type the question.
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      setTypedQuestion(QUESTION);
      setChunksRevealed(true);
      setTypedAnswer(answerData.text);
      return;
    }
    if (typedQuestion.length === QUESTION.length) {
      const t = setTimeout(() => setChunksRevealed(true), 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setTypedQuestion(QUESTION.slice(0, typedQuestion.length + 1));
    }, TYPE_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [inView, typedQuestion, prefersReducedMotion]);

  // Type the answer once chunks are revealed.
  useEffect(() => {
    if (!chunksRevealed) return;
    if (prefersReducedMotion) {
      setTypedAnswer(answerData.text);
      return;
    }
    if (typedAnswer.length === answerData.text.length) return;
    const startDelay = typedAnswer.length === 0 ? 1_400 : 0;
    const t = setTimeout(
      () => setTypedAnswer(answerData.text.slice(0, typedAnswer.length + 1)),
      typedAnswer.length === 0 ? startDelay : ANSWER_CHAR_INTERVAL_MS,
    );
    return () => clearTimeout(t);
  }, [chunksRevealed, typedAnswer, prefersReducedMotion]);

  // Compute SVG path coords for the active hover guide-line.
  const guideLinePath = useMemo(() => {
    if (!hoveredChunkId) return null;
    const container = containerRef.current;
    const chunkEl = chunkRefs.current.get(hoveredChunkId);
    const citationEntry = answerData.citations.find(
      (c) => c.chunkId === hoveredChunkId,
    );
    const citationEl = citationEntry
      ? citationRefs.current.get(String(citationEntry.marker))
      : null;
    if (!container || !chunkEl || !citationEl) return null;
    const cBox = container.getBoundingClientRect();
    const fromBox = citationEl.getBoundingClientRect();
    const toBox = chunkEl.getBoundingClientRect();
    const x1 = fromBox.left - cBox.left + fromBox.width / 2;
    const y1 = fromBox.top - cBox.top + fromBox.height / 2;
    const x2 = toBox.left - cBox.left + toBox.width / 2;
    const y2 = toBox.top - cBox.top + toBox.height / 2;
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }, [hoveredChunkId]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-[4px] bg-surface-container-lowest p-4"
    >
      <div ref={ref} />

      {/* Question input */}
      <div className="rounded-[4px] bg-surface-container-low px-3 py-2 font-mono text-xs">
        <span className="text-on-surface-variant">q:</span> {typedQuestion}
        {!prefersReducedMotion && typedQuestion.length < QUESTION.length && (
          <motion.span
            className="ml-0.5 inline-block w-[2px] bg-on-surface align-middle"
            style={{ height: "1em" }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      {/* 4x3 chunk grid */}
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {chunks.map((chunk, idx) => {
          const isTop = chunk.similarity >= 0.7;
          const isHovered = hoveredChunkId === chunk.id;
          return (
            <motion.div
              key={chunk.id}
              ref={(el) => {
                chunkRefs.current.set(chunk.id, el);
              }}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={
                chunksRevealed
                  ? { opacity: isTop ? 1 : 0.5 }
                  : prefersReducedMotion
                  ? { opacity: isTop ? 1 : 0.5 }
                  : { opacity: 0 }
              }
              transition={{
                duration: durations.normal,
                ease: easings.standard,
                delay: chunksRevealed ? idx * 0.04 : 0,
              }}
              className={`rounded-[2px] px-2 py-1.5 transition-colors ${
                isTop
                  ? "bg-secondary/10 text-on-surface"
                  : "bg-surface-container-low text-on-surface-variant"
              } ${isHovered ? "ring-1 ring-secondary" : ""}`}
            >
              <div className="font-mono text-[9px] tracking-[0.1em] text-secondary">
                {chunk.similarity.toFixed(2)}
              </div>
              <div className="mt-0.5 line-clamp-1 text-[10px]">
                {chunk.snippet}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Answer text with citation badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={chunksRevealed ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: durations.normal, delay: 0.4 }}
        className="mt-4 rounded-[4px] bg-surface-container-low px-3 py-3 text-sm leading-relaxed"
      >
        {(() => {
          let charPos = 0;
          return segments.map((seg, idx) => {
            const segStart = charPos;
            const segEnd = charPos + seg.value.length;
            charPos = segEnd;
            const renderUntil = Math.max(0, typedAnswer.length - segStart);
            const visibleSlice = seg.value.slice(0, renderUntil);
            if (visibleSlice.length === 0) return null;

            if (seg.type === "citation" && seg.chunkId !== undefined) {
              return (
                <motion.span
                  key={`seg-${idx}`}
                  ref={(el) => {
                    if (seg.marker !== undefined) {
                      citationRefs.current.set(String(seg.marker), el);
                    }
                  }}
                  className="mx-0.5 inline-flex cursor-pointer items-center rounded-[2px] bg-secondary/15 px-1 py-0.5 font-mono text-[10px] text-secondary"
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          boxShadow: [
                            "0 0 0 0 rgba(37,99,235,0)",
                            "0 0 0 4px rgba(37,99,235,0.15)",
                            "0 0 0 0 rgba(37,99,235,0)",
                          ],
                        }
                  }
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : { duration: 2, repeat: Infinity }
                  }
                  onMouseEnter={() => setHoveredChunkId(seg.chunkId ?? null)}
                  onMouseLeave={() => setHoveredChunkId(null)}
                >
                  {visibleSlice}
                </motion.span>
              );
            }
            return <span key={`seg-${idx}`}>{visibleSlice}</span>;
          });
        })()}
        {!prefersReducedMotion &&
          typedAnswer.length < answerData.text.length &&
          typedAnswer.length > 0 && (
            <motion.span
              className="ml-0.5 inline-block w-[2px] bg-on-surface align-middle"
              style={{ height: "1em" }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
      </motion.div>

      {/* Hover guide-line overlay */}
      {guideLinePath && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        >
          <motion.path
            d={guideLinePath}
            stroke="rgb(76,181,114)"
            strokeWidth={1}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ ...springs.snappy }}
          />
        </svg>
      )}
    </div>
  );
}
