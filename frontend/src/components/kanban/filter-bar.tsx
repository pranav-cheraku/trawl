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
  right?: ReactNode;
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
    const next: Filters = { ...filters };
    next[key] = filters[key] === value ? null : value;
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-y-2 rounded-[4px] bg-surface-container-lowest px-4 py-2.5">
      <FilterGroup label="Type" withDivider>
        {TYPE_OPTIONS.map((opt) => (
          <FilterChip
            key={String(opt.value)}
            label={opt.label}
            active={filters.type === opt.value}
            onClick={() => setField("type", opt.value)}
            ariaLabel={`Filter type ${opt.label}`}
            layoutGroup="filter-type"
            neutral={opt.value === null}
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
            neutral={opt.value === null}
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
            neutral={opt.value === null}
          />
        ))}
      </FilterGroup>

      <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto sm:pl-4">
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
        <span className="ml-auto sm:ml-0">{right}</span>
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
  // Inset shadow instead of border (No-Line rule). Hidden below sm because groups
  // stack vertically there, making a right-edge seam look like a stray ornament.
  const divider = withDivider
    ? "sm:pr-4 sm:mr-4 sm:shadow-[inset_-1px_0_0_rgba(15,23,42,0.1)]"
    : "";
  return (
    <div className={`flex w-full items-center gap-2.5 py-0.5 sm:w-auto ${divider}`}>
      <span className="w-[60px] shrink-0 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/70 sm:w-auto">
        {label}
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5 sm:flex-none sm:flex-nowrap">{children}</div>
    </div>
  );
}
