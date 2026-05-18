"use client";
// Compact spec row inside a ThemeCard. Priority is displayed as colored text
// using the priority color scale (not generic pills; this is a label, not a
// selector). "+ Kanban" toggles to "On Kanban" link once the spec is promoted.

import { motion, useReducedMotion } from "framer-motion";

import { springs } from "@/lib/motion";
import type { BuildReportSpec } from "@/types";

const PRIORITY_TEXT: Record<string, string> = {
  critical: "text-priority-critical-text",
  high: "text-priority-high-text",
  medium: "text-priority-medium-text",
  low: "text-priority-low-text",
};

type Props = {
  spec: BuildReportSpec;
  projectId: string;
  onClick: () => void;
  onPromote: () => void;
  isPromoting: boolean;
  delay?: number;
};

export default function ThemeSpecCard({
  spec,
  projectId,
  onClick,
  onPromote,
  isPromoting,
  delay = 0,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const priority = String(spec.content.priority ?? "medium").toLowerCase();
  const supportingRaw = (spec.content.supporting_feedback_indices ?? []) as unknown[];
  const citationCount = Array.isArray(supportingRaw)
    ? supportingRaw.filter(
        (n): n is number =>
          typeof n === "number" && Number.isInteger(n) && n >= 1,
      ).length
    : 0;
  const isPromoted = spec.promotedSpecId !== null;

  return (
    <motion.article
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.gentle, delay }}
      className="flex items-stretch gap-3 rounded-[4px] bg-surface-container-lowest px-4 py-3 transition-colors hover:bg-surface-container-high"
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex-shrink-0 rounded-[2px] bg-surface-container-highest px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            B{spec.buildRank}
          </span>
          <span className="line-clamp-2 min-w-0 text-[13px] font-medium text-on-surface">
            {spec.title}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
          <span className={PRIORITY_TEXT[priority] ?? "text-on-surface-variant"}>
            {priority}
          </span>
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
    </motion.article>
  );
}
