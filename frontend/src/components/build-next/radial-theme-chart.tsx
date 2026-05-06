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

/** Map severity (0..1) to one of 4 swatches in the surface→signal ramp. */
function severityFill(severity: number): string {
  if (severity >= 0.75) return "rgb(0, 73, 194)"; // secondary_dim
  if (severity >= 0.5) return "rgb(37, 99, 235)"; // secondary
  if (severity >= 0.25) return "rgb(221, 234, 243)"; // surface_container_high
  return "rgb(229, 239, 247)"; // surface_container
}

export default function RadialThemeChart({ themes, onThemeClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: true });
  const prefersReducedMotion = useReducedMotion();

  const geometry = useMemo(
    () =>
      computeRadialGeometry(
        themes.map((t) => ({
          id: t.id,
          weight: Math.max(0.001, t.frequencyPct),
        })),
        { size: 260, outer: 120, inner: 64 },
      ),
    [themes],
  );

  if (themes.length === 0) return null;

  return (
    <section
      ref={ref}
      className="rounded-[4px] bg-surface-container-lowest p-6"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Theme Distribution
          </p>
          <p className="mt-2 max-w-xs text-[12.5px] leading-relaxed text-on-surface-variant">
            Wedge size = frequency. Wedge color = severity. Click a wedge to
            scroll to its theme.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-1.5 text-[11px]">
          {themes.map((theme) => {
            const pct = (Math.max(0, Math.min(1, theme.frequencyPct)) * 100).toFixed(0);
            return (
              <li key={theme.id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: severityFill(theme.severityScore) }}
                />
                <button
                  type="button"
                  onClick={() => onThemeClick(theme.id)}
                  className="text-left text-on-surface hover:text-secondary"
                >
                  <span className="font-medium">{theme.name}</span>
                  <span className="ml-2 font-mono text-[10px] text-on-surface-variant">
                    {pct}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-4 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${geometry.size} ${geometry.size}`}
          width={geometry.size}
          height={geometry.size}
          aria-label="Animated radial theme distribution chart"
          role="img"
        >
          {geometry.segments.map((segment, idx) => {
            const theme = themes.find((t) => t.id === segment.id);
            if (!theme) return null;
            const fill = severityFill(theme.severityScore);
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
                style={{ transformOrigin: `${geometry.cx}px ${geometry.cy}px`, cursor: "pointer" }}
                onClick={() => onThemeClick(segment.id)}
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}
