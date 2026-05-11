"use client";

import type { SpecPriority } from "@/types";

interface PriorityPillsProps {
  value: SpecPriority;
  onChange: (next: SpecPriority) => Promise<void>;
}

const OPTIONS: { value: SpecPriority; label: string }[] = [
  { value: "critical", label: "CRIT" },
  { value: "high", label: "HIGH" },
  { value: "medium", label: "MED" },
  { value: "low", label: "LOW" },
];

export default function PriorityPills({ value, onChange }: PriorityPillsProps) {
  return (
    <div className="flex items-center gap-1">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            aria-label={`Set priority to ${opt.label}`}
            onClick={() => {
              if (!active) void onChange(opt.value);
            }}
            className={`rounded-[2px] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] transition-colors ${
              active
                ? "bg-on-surface text-surface-container-lowest"
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
