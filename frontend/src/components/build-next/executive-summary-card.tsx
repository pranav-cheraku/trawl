// frontend/src/components/build-next/executive-summary-card.tsx
"use client";

import { useMemo, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { CountUp } from "@/components/landing/count-up";
import { durations, easings, staggers } from "@/lib/motion";
import type { BuildRetrievalMetadata } from "@/types";

type Props = {
  summary: string;
  metadata: BuildRetrievalMetadata | null;
  partialFailure: boolean;
};

export default function ExecutiveSummaryCard({
  summary,
  metadata,
  partialFailure,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion || inView;

  const totalSec = metadata?.totalMs
    ? Number((metadata.totalMs / 1000).toFixed(1))
    : null;
  const tokenIn = metadata?.tokenUsage?.input ?? null;
  const tokenOut = metadata?.tokenUsage?.output ?? null;
  const queryCount = metadata?.queries?.length ?? 0;
  const chunkCount = metadata?.dedupedTotal ?? 0;

  // Split the summary on whitespace so we can fade each word in sequence.
  const summaryWords = useMemo(
    () => (summary ? summary.split(/\s+/) : []),
    [summary],
  );

  return (
    <motion.section
      ref={ref}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: durations.normal, ease: easings.standard }}
      className="rounded-[4px] bg-surface-container-lowest p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
        Executive Summary
      </p>
      {summary ? (
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-on-surface">
          {summaryWords.map((word, idx) => (
            <motion.span
              key={`w-${idx}`}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={reveal ? { opacity: 1 } : { opacity: 0 }}
              transition={{
                duration: durations.normal,
                ease: easings.standard,
                delay: reveal ? idx * 0.025 : 0,
              }}
              className="inline-block whitespace-pre"
            >
              {word + (idx < summaryWords.length - 1 ? " " : "")}
            </motion.span>
          ))}
        </p>
      ) : (
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-on-surface">
          No summary generated.
        </p>
      )}
      <div className="mt-5 flex min-w-0 flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
        {metadata?.model ? <span>Model · {metadata.model}</span> : null}
        {queryCount > 0 ? (
          <span>
            Queries ·{" "}
            <CountUp to={queryCount} duration={900} />
          </span>
        ) : null}
        {chunkCount > 0 ? (
          <span>
            Chunks ·{" "}
            <CountUp to={chunkCount} duration={1100} />
          </span>
        ) : null}
        {totalSec != null ? (
          <span>
            Latency ·{" "}
            {/* CountUp rounds to integers; multiply by 10 then divide in format to preserve one decimal place. */}
            <CountUp
              to={Math.round(totalSec * 10)}
              duration={1000}
              format={(n) => `${(n / 10).toFixed(1)}s`}
            />
          </span>
        ) : null}
        {tokenIn != null && tokenOut != null ? (
          <span>
            Tokens ·{" "}
            <CountUp
              to={tokenIn}
              duration={1200}
              format={(n) => n.toLocaleString()}
            />{" "}
            in /{" "}
            <CountUp
              to={tokenOut}
              duration={1200}
              format={(n) => n.toLocaleString()}
            />{" "}
            out
          </span>
        ) : null}
      </div>
      {partialFailure ? (
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
          transition={{
            duration: durations.normal,
            ease: easings.standard,
            delay: reveal ? staggers.cards * 2 : 0,
          }}
          className="mt-2 text-[12px] leading-relaxed text-error"
        >
          · Partial failure — some themes had spec generation errors.
        </motion.p>
      ) : null}
    </motion.section>
  );
}
