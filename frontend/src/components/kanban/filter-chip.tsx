"use client";

import { motion, useReducedMotion } from "framer-motion";

import { springs } from "@/lib/motion";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: "ink" | "signal";
  ariaLabel?: string;
  layoutGroup: string;
  neutral?: boolean;
}

export default function FilterChip({
  label,
  active,
  onClick,
  accent = "ink",
  ariaLabel,
  layoutGroup,
  neutral = false,
}: FilterChipProps) {
  const prefersReducedMotion = useReducedMotion();

  const base =
    "relative inline-flex items-center rounded-[2px] px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[0.15em] focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";

  if (neutral) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={ariaLabel ?? label}
        className={`${base} bg-surface-container transition-colors hover:bg-surface-container-high ${
          active ? "text-on-surface" : "text-on-surface-variant"
        }`}
      >
        <span className="relative">
          {label}
          {active ? (
            <span
              aria-hidden
              className="absolute -bottom-[2px] left-0 right-0 h-[1.5px] rounded-full bg-secondary"
            />
          ) : null}
        </span>
      </button>
    );
  }

  const inactive = "text-on-surface-variant hover:text-on-surface";
  const activeInk = "text-surface-container-lowest";
  const activeSignal = "text-surface-container-lowest";
  const activeText = accent === "signal" ? activeSignal : activeInk;
  const highlightBg = accent === "signal" ? "bg-secondary" : "bg-on-surface";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      className={`${base} ${active ? activeText : inactive} ${
        active ? "" : "bg-surface-container hover:bg-surface-container-high transition-colors"
      }`}
    >
      {active ? (
        prefersReducedMotion ? (
          <span
            aria-hidden
            className={`absolute inset-0 rounded-[2px] ${highlightBg}`}
          />
        ) : (
          <motion.span
            aria-hidden
            layoutId={`filter-active-${layoutGroup}`}
            className={`absolute inset-0 rounded-[2px] ${highlightBg}`}
            transition={{ ...springs.snappy }}
          />
        )
      ) : null}
      <span className="relative">{label}</span>
    </button>
  );
}
