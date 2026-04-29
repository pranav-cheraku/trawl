"use client";

import type { BuildTheme } from "@/types";

type Props = {
  themes: BuildTheme[];
  onThemeClick: (themeId: string) => void;
};

export default function ThemeDistributionChart({
  themes,
  onThemeClick,
}: Props) {
  if (themes.length === 0) return null;
  return (
    <section className="rounded-[4px] bg-surface-container-lowest p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
        Theme Distribution
      </p>
      <ul className="mt-5 space-y-4">
        {themes.map((theme) => {
          const raw = Number.isFinite(theme.frequencyPct) ? theme.frequencyPct : 0;
          const pct = Math.max(0, Math.min(1, raw)) * 100;
          return (
            <li key={theme.id}>
              <button
                type="button"
                onClick={() => onThemeClick(theme.id)}
                className="block w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-on-surface">
                    {theme.name}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-secondary">
                    {pct.toFixed(0)}% · {theme.chunkCount} chunks
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-surface-container">
                  <div
                    className="h-2 rounded-full bg-secondary transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
