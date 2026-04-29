"use client";

import type { BuildReportSpec } from "@/types";

type Props = {
  spec: BuildReportSpec;
  projectId: string;
  onClick: () => void;
  onPromote: () => void;
  isPromoting: boolean;
};

export default function ThemeSpecCard({
  spec,
  projectId,
  onClick,
  onPromote,
  isPromoting,
}: Props) {
  const priority = String(spec.content.priority ?? "medium").toLowerCase();
  const effort = String(spec.content.effort_estimate ?? "");
  const supportingRaw = (spec.content.supporting_feedback_indices ?? []) as unknown[];
  const citationCount = Array.isArray(supportingRaw)
    ? supportingRaw.filter(
        (n): n is number =>
          typeof n === "number" && Number.isInteger(n) && n >= 1,
      ).length
    : 0;
  const isPromoted = spec.promotedSpecId !== null;

  return (
    <article className="flex items-stretch gap-3 rounded-[4px] bg-surface-container-lowest px-4 py-3 transition-colors hover:bg-surface-container-high">
      <button type="button" onClick={onClick} className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="rounded-[2px] bg-surface-container-highest px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            B{spec.buildRank}
          </span>
          <span className="line-clamp-2 text-[13px] font-medium text-on-surface">
            {spec.title}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
          <span>{priority}</span>
          {effort ? <span>· effort {effort}</span> : null}
          <span>· {citationCount} citations</span>
        </div>
      </button>
      <div className="flex items-center">
        {isPromoted ? (
          <a
            href={`/project/${projectId}/specs`}
            className="rounded-[2px] bg-surface-container px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-secondary"
          >
            ✓ On Kanban
          </a>
        ) : (
          <button
            type="button"
            onClick={onPromote}
            disabled={isPromoting}
            className="rounded-[2px] bg-on-surface px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:opacity-60"
          >
            {isPromoting ? "Adding…" : "+ Kanban"}
          </button>
        )}
      </div>
    </article>
  );
}
