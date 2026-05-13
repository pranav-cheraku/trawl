"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { durations, easings, staggers } from "@/lib/motion";
import type { BuildReportSpec, BuildTheme } from "@/types";

import ThemeSpecCard from "./theme-spec-card";
import ThemeSpecFailed from "./theme-spec-failed";

type Props = {
  theme: BuildTheme;
  displayRank: number;
  specs: BuildReportSpec[];
  projectId: string;
  onSpecClick: (spec: BuildReportSpec) => void;
  onPromote: (spec: BuildReportSpec) => void;
  promotingIds: Set<string>;
};

export default function ThemeCard({
  theme,
  displayRank,
  specs,
  projectId,
  onSpecClick,
  onPromote,
  promotingIds,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: true });
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion || inView;

  const themeSpecs = specs
    .filter((s) => s.themeId === theme.id)
    .sort((a, b) => a.buildRank - b.buildRank);
  const pct = (Math.max(0, Math.min(1, theme.frequencyPct)) * 100).toFixed(0);

  return (
    <motion.section
      ref={ref}
      id={`theme-${theme.id}`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: durations.normal, ease: easings.standard }}
      className="rounded-[4px] bg-surface-container p-5"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <motion.span
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={reveal ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: durations.normal, ease: easings.standard }}
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface"
        >
          Q{displayRank} / {theme.name.toUpperCase()}
        </motion.span>
        <motion.span
          initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
          animate={reveal ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
          transition={{
            duration: durations.normal,
            ease: easings.standard,
            delay: reveal ? 0.1 : 0,
          }}
          className="rounded-[2px] bg-surface-container-lowest px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-on-surface-variant"
        >
          {pct}% · {theme.chunkCount} chunks
        </motion.span>
        <motion.span
          initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
          animate={reveal ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
          transition={{
            duration: durations.normal,
            ease: easings.standard,
            delay: reveal ? 0.15 : 0,
          }}
          className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-on-surface-variant"
        >
          severity {theme.severityScore.toFixed(2)}
        </motion.span>
      </header>
      {theme.description ? (
        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
          transition={{
            duration: durations.normal,
            ease: easings.standard,
            delay: reveal ? 0.2 : 0,
          }}
          className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-on-surface-variant"
        >
          {theme.description}
        </motion.p>
      ) : null}
      <div className="mt-4 space-y-2">
        {theme.specGenerationFailed ? (
          <ThemeSpecFailed />
        ) : themeSpecs.length === 0 ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            · No specs generated
          </p>
        ) : (
          themeSpecs.map((spec, idx) => (
            <ThemeSpecCard
              key={spec.id}
              spec={spec}
              projectId={projectId}
              onClick={() => onSpecClick(spec)}
              onPromote={() => onPromote(spec)}
              isPromoting={promotingIds.has(spec.id)}
              delay={reveal ? 0.3 + idx * staggers.cards : 0}
            />
          ))
        )}
      </div>
    </motion.section>
  );
}
