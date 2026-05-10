"use client";

import { useMemo, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { durations, easings, staggers } from "@/lib/motion";
import { computeRadialGeometry } from "@/lib/radial-chart-math";
import type { BuildTheme } from "@/types";

type Props = {
  themes: BuildTheme[];
  onThemeClick: (themeId: string) => void;
};

// 4-stop ramp. All four contrast against the white card background.
const TIER_FILLS = [
  "rgb(0, 73, 194)", // top — secondary_dim
  "rgb(37, 99, 235)", // upper-mid — secondary
  "rgb(96, 154, 255)", // lower-mid — light signal
  "rgb(164, 180, 190)", // bottom — outline_variant slate
] as const;

const TIER_LABELS = ["Largest", "Major", "Minor", "Smallest"] as const;

/**
 * Map a theme's display index (0 = biggest theme by frequency in this run) to
 * one of 4 tier fills via quartile bucketing. The caller passes themes already
 * sorted by frequency desc; biggest wedge gets the darkest color.
 */
function fillByRank(rankIdx: number, total: number): string {
  if (total <= 1) return TIER_FILLS[0];
  const ratio = rankIdx / (total - 1); // 0 = top, 1 = bottom
  if (ratio <= 0.25) return TIER_FILLS[0];
  if (ratio <= 0.5) return TIER_FILLS[1];
  if (ratio <= 0.75) return TIER_FILLS[2];
  return TIER_FILLS[3];
}

const CHART_SIZE = 240;
const CHART_OUTER = 110;
const CHART_INNER = 60;

export default function RadialThemeChart({ themes, onThemeClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: true });
  const prefersReducedMotion = useReducedMotion();

  // The caller (build/page.tsx) passes themes already sorted by frequencyPct
  // desc, so the array index doubles as the frequency rank used for coloring,
  // wedge order, and the Q label.
  const totalChunks = useMemo(
    () => themes.reduce((sum, t) => sum + t.chunkCount, 0),
    [themes],
  );
  const total = themes.length;

  const geometry = useMemo(
    () =>
      computeRadialGeometry(
        themes.map((t) => ({
          id: t.id,
          weight: Math.max(0.001, t.frequencyPct),
        })),
        { size: CHART_SIZE, outer: CHART_OUTER, inner: CHART_INNER },
      ),
    [themes],
  );

  if (themes.length === 0) return null;

  return (
    <section
      ref={ref}
      className="rounded-[4px] bg-surface-container-lowest p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Theme Distribution
          </p>
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-on-surface-variant">
            Wedge size = frequency. Color = size rank within this run.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-on-surface-variant">
          {TIER_FILLS.map((fill, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: fill }}
              />
              {TIER_LABELS[i]}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:items-center">
        {/* Explicit width/height pins the overlay to the SVG box, otherwise
            the parent expands to the grid track and the centered text drifts. */}
        <div
          className="relative mx-auto lg:mx-0"
          style={{ width: CHART_SIZE, height: CHART_SIZE }}
        >
          <svg
            viewBox={`0 0 ${geometry.size} ${geometry.size}`}
            width={geometry.size}
            height={geometry.size}
            aria-label="Radial theme distribution chart"
            role="img"
          >
            {geometry.segments.map((segment, idx) => {
              const fill = fillByRank(idx, total);
              return (
                <motion.path
                  key={segment.id}
                  d={segment.pathD}
                  fill={fill}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.92 }
                  }
                  animate={
                    inView
                      ? { opacity: 1, scale: 1 }
                      : prefersReducedMotion
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.92 }
                  }
                  transition={{
                    duration: durations.slow,
                    ease: easings.emphasis,
                    delay: inView ? idx * staggers.cards : 0,
                  }}
                  style={{
                    transformOrigin: `${geometry.cx}px ${geometry.cy}px`,
                    cursor: "pointer",
                  }}
                  onClick={() => onThemeClick(segment.id)}
                />
              );
            })}
          </svg>
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            aria-hidden
          >
            <span className="font-mono text-[22px] font-semibold leading-none tracking-tight text-on-surface">
              {total}
            </span>
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">
              Themes
            </span>
            <span className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">
              {totalChunks} chunks
            </span>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {themes.map((theme, idx) => {
            const pct = Math.max(0, Math.min(1, theme.frequencyPct)) * 100;
            // Bar width represents this theme's share of the corpus relative
            // to the largest theme in the run (so the biggest theme's bar
            // hits 100%). Makes small themes still visible while preserving
            // proportionality.
            const maxPct = Math.max(
              ...themes.map((t) =>
                Math.max(0, Math.min(1, t.frequencyPct)) * 100,
              ),
            );
            const barPct =
              maxPct > 0 ? Math.max(8, (pct / maxPct) * 100) : 0;
            const fill = fillByRank(idx, total);
            return (
              <li key={theme.id}>
                <button
                  type="button"
                  onClick={() => onThemeClick(theme.id)}
                  className="group flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left transition-colors hover:bg-surface-container-high"
                >
                  <span
                    aria-hidden
                    className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[4px] font-mono text-[10px] font-semibold tracking-tight text-surface-container-lowest"
                    style={{ backgroundColor: fill }}
                  >
                    Q{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-medium text-on-surface group-hover:text-secondary">
                        {theme.name}
                      </span>
                      <span className="flex-shrink-0 font-mono text-[10px] tabular-nums text-on-surface-variant">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div
                        className="relative h-1 flex-1 overflow-hidden rounded-[2px] bg-surface-container"
                        aria-hidden
                      >
                        <motion.span
                          className="absolute inset-y-0 left-0 block rounded-[2px]"
                          style={{ backgroundColor: fill }}
                          initial={
                            prefersReducedMotion
                              ? { width: `${barPct}%` }
                              : { width: 0 }
                          }
                          animate={
                            inView
                              ? { width: `${barPct}%` }
                              : prefersReducedMotion
                                ? { width: `${barPct}%` }
                                : { width: 0 }
                          }
                          transition={{
                            duration: durations.slow,
                            ease: easings.standard,
                            delay: inView ? idx * staggers.cards + 0.15 : 0,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">
                        {theme.chunkCount} chunks
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
