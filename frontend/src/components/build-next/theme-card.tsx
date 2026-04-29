"use client";

import type { BuildReportSpec, BuildTheme } from "@/types";

import ThemeSpecCard from "./theme-spec-card";
import ThemeSpecFailed from "./theme-spec-failed";

type Props = {
  theme: BuildTheme;
  specs: BuildReportSpec[];
  projectId: string;
  onSpecClick: (spec: BuildReportSpec) => void;
  onPromote: (spec: BuildReportSpec) => void;
  promotingIds: Set<string>;
};

const TWO_DIGITS = (n: number) => n.toString().padStart(2, "0");

export default function ThemeCard({
  theme,
  specs,
  projectId,
  onSpecClick,
  onPromote,
  promotingIds,
}: Props) {
  const themeSpecs = specs
    .filter((s) => s.themeId === theme.id)
    .sort((a, b) => a.buildRank - b.buildRank);
  const pct = (Math.max(0, Math.min(1, theme.frequencyPct)) * 100).toFixed(0);

  return (
    <section
      id={`theme-${theme.id}`}
      className="rounded-[4px] bg-surface-container p-5"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface">
          {TWO_DIGITS(theme.rank)} / {theme.name.toUpperCase()}
        </span>
        <span className="rounded-[2px] bg-surface-container-lowest px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-on-surface-variant">
          {pct}% · {theme.chunkCount} chunks
        </span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-on-surface-variant">
          severity {theme.severityScore.toFixed(2)}
        </span>
      </header>
      {theme.description ? (
        <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-on-surface-variant">
          {theme.description}
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        {theme.specGenerationFailed ? (
          <ThemeSpecFailed />
        ) : themeSpecs.length === 0 ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            · No specs generated
          </p>
        ) : (
          themeSpecs.map((spec) => (
            <ThemeSpecCard
              key={spec.id}
              spec={spec}
              projectId={projectId}
              onClick={() => onSpecClick(spec)}
              onPromote={() => onPromote(spec)}
              isPromoting={promotingIds.has(spec.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
