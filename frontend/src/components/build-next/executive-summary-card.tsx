"use client";

import type { ReactNode } from "react";
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

  const summaryWords = useMemo(
    () => (summary ? summary.split(/\s+/) : []),
    [summary],
  );

  const hasStats =
    queryCount > 0 ||
    chunkCount > 0 ||
    totalSec != null ||
    (tokenIn != null && tokenOut != null);

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
      <div
        className={`mt-3 grid grid-cols-1 gap-6 ${
          hasStats ? "lg:grid-cols-[1fr_220px] lg:items-start" : ""
        }`}
      >
        {/* Summary text */}
        <div>
          {summary ? (
            <p className="text-[14px] leading-relaxed text-on-surface">
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
            <p className="text-[14px] leading-relaxed text-on-surface">
              No summary generated.
            </p>
          )}
          {partialFailure ? (
            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
              animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
              transition={{
                duration: durations.normal,
                ease: easings.standard,
                delay: reveal ? staggers.cards * 2 : 0,
              }}
              className="mt-3 text-[12px] leading-relaxed text-error"
            >
              · Partial failure: some themes had spec generation errors.
            </motion.p>
          ) : null}
        </div>

        {/* Stats row */}
        {hasStats ? (
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-1 lg:gap-y-3 lg:pl-5 lg:shadow-[inset_1px_0_0_rgba(15,23,42,0.06)]">
            {queryCount > 0 ? (
              <Stat
                label="Queries"
                value={<CountUp to={queryCount} duration={900} />}
              />
            ) : null}
            {chunkCount > 0 ? (
              <Stat
                label="Chunks"
                value={<CountUp to={chunkCount} duration={1100} />}
              />
            ) : null}
            {totalSec != null ? (
              <Stat
                label="Latency"
                value={
                  <CountUp
                    to={Math.round(totalSec * 10)}
                    duration={1000}
                    format={(n) => `${(n / 10).toFixed(1)}s`}
                  />
                }
              />
            ) : null}
            {tokenIn != null && tokenOut != null ? (
              <Stat
                label="Tokens"
                value={
                  <>
                    <CountUp
                      to={tokenIn}
                      duration={1200}
                      format={(n) => n.toLocaleString()}
                    />
                    <span className="mx-1 text-on-surface-variant">/</span>
                    <CountUp
                      to={tokenOut}
                      duration={1200}
                      format={(n) => n.toLocaleString()}
                    />
                  </>
                }
                sublabel="in / out"
              />
            ) : null}
          </dl>
        ) : null}
      </div>
    </motion.section>
  );
}

function Stat({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </dt>
      <dd className="font-mono text-[18px] font-semibold leading-none tabular-nums text-on-surface">
        {value}
      </dd>
      {sublabel ? (
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}
