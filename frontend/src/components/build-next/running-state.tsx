"use client";
// Progress stepper shown while a Build Next run is in-flight. Stage thresholds
// are time-based estimates; the active stage advances as elapsed time passes
// each threshold. The page's 2-second polling loop triggers the real transition.

import { useEffect, useState } from "react";

import { parseUtcIso } from "@/lib/time";

const STAGES = [
  { key: "embedding", label: "Embedding queries", thresholdMs: 0 },
  { key: "retrieving", label: "Retrieving context", thresholdMs: 4000 },
  { key: "clustering", label: "Clustering themes", thresholdMs: 10000 },
  { key: "generating", label: "Generating specs", thresholdMs: 22000 },
  { key: "finalizing", label: "Finalizing report", thresholdMs: 40000 },
] as const;

type Props = {
  startedAtIso: string;
};

export default function RunningState({ startedAtIso }: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const startedMs = parseUtcIso(startedAtIso).getTime();
  const elapsed = Math.max(0, now - startedMs);
  const elapsedSec = Math.floor(elapsed / 1000);

  let activeIdx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (elapsed >= STAGES[i].thresholdMs) activeIdx = i;
  }

  return (
    <div className="rounded-[4px] bg-surface-container-lowest px-8 py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
        Run · In Progress · Started {elapsedSec}s ago
      </p>
      <ul className="mt-6 space-y-3">
        {STAGES.map((stage, idx) => {
          const isActive = idx === activeIdx;
          const isDone = idx < activeIdx;
          const dot = isDone ? "✓" : isActive ? "◐" : "○";
          const labelTone = isDone
            ? "text-on-surface-variant"
            : isActive
              ? "text-on-surface"
              : "text-on-surface-variant/60";
          const stateLabel = isDone
            ? "Done"
            : isActive
              ? "Running"
              : "Pending";
          return (
            <li
              key={stage.key}
              className="flex items-center gap-4 font-mono text-[12px]"
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center text-[14px] ${
                  isActive
                    ? "text-secondary"
                    : "text-on-surface-variant/60"
                }`}
              >
                {dot}
              </span>
              <span className={`flex-1 ${labelTone}`}>{stage.label}</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/70">
                {stateLabel}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-[12px] text-on-surface-variant">
        The page will refresh when the run completes.
      </p>
    </div>
  );
}
