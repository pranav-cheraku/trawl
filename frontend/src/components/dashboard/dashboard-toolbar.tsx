"use client";

import FilterChip from "@/components/kanban/filter-chip";
import type { DashboardView } from "@/lib/use-dashboard-view";

export type ToolbarChip = "all" | "recent" | "pinned";

export interface ToolbarCounts {
  all: number;
  recent: number;
  pinned: number;
}

interface DashboardToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  activeChip: ToolbarChip;
  onChipChange: (chip: ToolbarChip) => void;
  counts: ToolbarCounts;
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

export default function DashboardToolbar({
  query,
  onQueryChange,
  activeChip,
  onChipChange,
  counts,
  view,
  onViewChange,
}: DashboardToolbarProps) {
  function handleChipClick(chip: ToolbarChip) {
    onChipChange(activeChip === chip ? "all" : chip);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query) {
        e.preventDefault();
        onQueryChange("");
      } else {
        e.currentTarget.blur();
      }
    }
  }

  return (
    <div className="rounded-[4px] bg-surface-container-lowest px-3 py-2.5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="w-full rounded-[4px] bg-surface-container-low py-2 pl-9 pr-3 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-secondary/40"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              label={`All · ${counts.all}`}
              active={activeChip === "all"}
              onClick={() => handleChipClick("all")}
              accent="ink"
              ariaLabel="Show all projects"
              layoutGroup="dashboard-filter"
            />
            <FilterChip
              label={`Recent · ${counts.recent}`}
              active={activeChip === "recent"}
              onClick={() => handleChipClick("recent")}
              accent="ink"
              ariaLabel="Show projects updated in the last 7 days"
              layoutGroup="dashboard-filter"
            />
            <FilterChip
              label={`Pinned · ${counts.pinned}`}
              active={activeChip === "pinned"}
              onClick={() => handleChipClick("pinned")}
              accent="ink"
              ariaLabel="Show pinned projects only"
              layoutGroup="dashboard-filter"
            />
          </div>

          <div
            role="group"
            aria-label="View"
            className="flex gap-0.5 rounded-[4px] bg-surface-container-low p-0.5"
          >
            <button
              type="button"
              onClick={() => onViewChange("grid")}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              className={`flex h-6 w-7 items-center justify-center rounded-[3px] transition-colors ${
                view === "grid"
                  ? "bg-surface-container-lowest text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <rect x="1" y="1" width="5" height="5" />
                <rect x="8" y="1" width="5" height="5" />
                <rect x="1" y="8" width="5" height="5" />
                <rect x="8" y="8" width="5" height="5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewChange("list")}
              aria-pressed={view === "list"}
              aria-label="List view"
              className={`flex h-6 w-7 items-center justify-center rounded-[3px] transition-colors ${
                view === "list"
                  ? "bg-surface-container-lowest text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <line x1="1" y1="3" x2="13" y2="3" />
                <line x1="1" y1="7" x2="13" y2="7" />
                <line x1="1" y1="11" x2="13" y2="11" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
