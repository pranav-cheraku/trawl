"use client";
// Status selector in the spec detail modal. Uses sea-green active fill (secondary)
// to signal the currently active workflow stage.

import type { SpecStatus } from "@/types";

interface StatusPillsProps {
  value: SpecStatus;
  onChange: (next: SpecStatus) => Promise<void>;
}

const OPTIONS: { value: SpecStatus; label: string }[] = [
  { value: "backlog", label: "BACKLOG" },
  { value: "planned", label: "PLANNED" },
  { value: "in_progress", label: "IN PROG" },
  { value: "done", label: "DONE" },
];

export default function StatusPills({ value, onChange }: StatusPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            aria-label={`Set status to ${opt.label}`}
            onClick={() => {
              if (!active) void onChange(opt.value);
            }}
            className={`rounded-[2px] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] transition-colors ${
              active
                ? "bg-secondary text-surface-container-lowest"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
