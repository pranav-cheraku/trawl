"use client";

import type { ReactNode } from "react";
import type { SpecPriority, SpecStatus, SpecType } from "@/types";
import FilterChip from "./filter-chip";

export interface Filters {
  type: SpecType | null;
  status: SpecStatus | null;
  priority: SpecPriority | null;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  filteredCount: number;
  totalCount: number;
  right?: ReactNode; // slot for export menu (Checkpoint 3)
}

const TYPE_OPTIONS: { value: SpecType | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "feature_specs", label: "Feature" },
  { value: "user_stories", label: "Story" },
];

const STATUS_OPTIONS: { value: SpecStatus | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Prog" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: SpecPriority | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "critical", label: "Crit" },
  { value: "high", label: "High" },
  { value: "medium", label: "Med" },
  { value: "low", label: "Low" },
];

export default function FilterBar({
  filters,
  onChange,
  filteredCount,
  totalCount,
  right,
}: FilterBarProps) {
  const isFiltered =
    filters.type !== null ||
    filters.status !== null ||
    filters.priority !== null;

  const setField = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    // Re-clicking the currently-active value clears that facet.
    const next: Filters = { ...filters };
    next[key] = filters[key] === value ? null : value;
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center rounded-[4px] bg-surface-container-lowest px-4 py-2.5">
      <FilterGroup label="Type" withDivider>
        {TYPE_OPTIONS.map((opt) => (
          <FilterChip
            key={String(opt.value)}
            label={opt.label}
            active={filters.type === opt.value}
            onClick={() => setField("type", opt.value)}
            ariaLabel={`Filter type ${opt.label}`}
            layoutGroup="filter-type"
          />
        ))}
      </FilterGroup>
      <FilterGroup label="Status" withDivider>
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={String(opt.value)}
            label={opt.label}
            active={filters.status === opt.value}
            onClick={() => setField("status", opt.value)}
            accent="signal"
            ariaLabel={`Filter status ${opt.label}`}
            layoutGroup="filter-status"
          />
        ))}
      </FilterGroup>
      <FilterGroup label="Priority">
        {PRIORITY_OPTIONS.map((opt) => (
          <FilterChip
            key={String(opt.value)}
            label={opt.label}
            active={filters.priority === opt.value}
            onClick={() => setField("priority", opt.value)}
            ariaLabel={`Filter priority ${opt.label}`}
            layoutGroup="filter-priority"
          />
        ))}
      </FilterGroup>

      <div className="ml-auto flex items-center gap-3 pl-4">
        <span className="font-mono text-[11px] text-on-surface-variant">
          <b className="font-mono font-medium text-on-surface">
            {filteredCount}
          </b>
          /{totalCount} specs
        </span>
        {isFiltered ? (
          <button
            type="button"
            onClick={() =>
              onChange({ type: null, status: null, priority: null })
            }
            className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface hover:underline"
          >
            Clear
          </button>
        ) : null}
        {right}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
  withDivider,
}: {
  label: string;
  children: ReactNode;
  withDivider?: boolean;
}) {
  // Architectural vertical seam between groups (No-Line rule — inset shadow,
  // not a border). Equal pr/mr keep both sides of the seam visually balanced.
  const divider = withDivider
    ? "pr-4 mr-4 shadow-[inset_-1px_0_0_rgba(15,23,42,0.1)]"
    : "";
  return (
    <div className={`flex items-center gap-2.5 py-0.5 ${divider}`}>
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/70">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}
