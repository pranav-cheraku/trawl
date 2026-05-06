"use client";

import type { Spec, SpecPriority } from "@/types";

interface Props {
  spec: Spec;
  onClick?: (spec: Spec) => void;
  isDragging?: boolean;
}

const PRIORITY_LABELS: Record<SpecPriority, string> = {
  critical: "CRIT",
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

const PRIORITY_COLORS: Record<SpecPriority, string> = {
  critical: "text-error",
  high: "text-secondary",
  medium: "text-on-surface-variant",
  low: "text-outline-variant",
};

const PRIORITY_BARS: Record<SpecPriority, string> = {
  critical: "bg-error",
  high: "bg-secondary",
  medium: "bg-on-surface-variant/40",
  low: "bg-outline-variant/50",
};

const TYPE_LABELS: Record<string, string> = {
  feature_specs: "FEATURE",
  user_stories: "STORY",
};

export default function SpecCard({ spec, onClick, isDragging }: Props) {
  const priority = spec.priority as SpecPriority;
  const typeLabel = TYPE_LABELS[spec.type] ?? spec.type.toUpperCase();
  const citationCount = spec.sourceChunkIds.length;
  const effort =
    (spec.content as Record<string, unknown>)?.effort_estimate ?? null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(spec)}
      aria-label={`Open spec ${spec.title}`}
      className={`group relative flex w-full flex-col gap-2.5 rounded-[4px] bg-surface-container-lowest p-3 pl-4 text-left transition-colors hover:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-secondary/30 ${
        isDragging ? "opacity-40" : ""
      } ${
        isDragging ? "shadow-[0_8px_24px_rgba(15,23,42,0.04)]" : ""
      }`}
    >
      {/* Priority bar — architectural ruler mark on left edge */}
      <span
        aria-hidden
        className={`absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-[1px] ${PRIORITY_BARS[priority]}`}
      />

      {/* Header row — priority label left, type chip right */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`font-mono text-[9px] font-medium uppercase tracking-[0.18em] ${PRIORITY_COLORS[priority]}`}
        >
          {PRIORITY_LABELS[priority] ?? priority.toUpperCase()}
        </span>
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-on-surface-variant/70">
          {typeLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-medium leading-snug text-on-surface line-clamp-3">
        {spec.title}
      </h3>

      {/* Meta row — effort + citation count */}
      <div className="flex items-center gap-2 pt-0.5">
        {effort ? (
          <span className="rounded-[2px] bg-surface-container px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-on-surface-variant">
            {String(effort)}
          </span>
        ) : null}
        <span className="flex items-center gap-1 font-mono text-[10px] font-medium text-on-surface-variant">
          <svg
            className="h-2.5 w-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span>
            {citationCount}
            <span className="ml-0.5 tracking-[0.15em] text-on-surface-variant/70">
              SRC
            </span>
          </span>
        </span>
      </div>
    </button>
  );
}
