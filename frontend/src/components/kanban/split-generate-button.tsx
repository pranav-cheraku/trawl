"use client";
// Main generate button paired with a caret that opens the FocusPopover for
// topic-scoped generation. Both halves are disabled in demo mode via useDemoMode().

import { useState } from "react";
import type { SpecType } from "@/types";
import FocusPopover from "./focus-popover";
import { useDemoMode } from "@/lib/demo-mode";

interface SplitGenerateButtonProps {
  label: string;
  type: SpecType;
  variant?: "primary" | "ghost";
  isActive: boolean;
  disabled: boolean;
  onGenerate: (type: SpecType) => void;
  onFocusGenerate: (type: SpecType, focus: string) => void;
}

export default function SplitGenerateButton({
  label,
  type,
  variant = "primary",
  isActive,
  disabled,
  onGenerate,
  onFocusGenerate,
}: SplitGenerateButtonProps) {
  const isDemo = useDemoMode();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isDisabled = disabled || isDemo;

  const primaryStyles =
    variant === "primary"
      ? "bg-on-surface text-surface-container-lowest hover:bg-secondary"
      : "bg-surface-container-lowest text-on-surface ring-1 ring-[rgba(110,125,134,0.3)] hover:bg-surface-container-high";
  const caretStyles =
    variant === "primary"
      ? "bg-on-surface text-surface-container-lowest hover:bg-secondary ring-[rgba(255,255,255,0.15)]"
      : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-high ring-[rgba(110,125,134,0.3)]";

  return (
    <div className="relative inline-flex w-full sm:w-auto">
      <button
        type="button"
        onClick={() => { if (isDemo) return; onGenerate(type); }}
        disabled={isDisabled}
        title={isDemo ? "Generation disabled in demo mode" : undefined}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-l-[4px] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:justify-start ${primaryStyles}`}
      >
        <svg
          className="h-3 w-3 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>{isActive ? "Queued…" : label}</span>
      </button>
      <button
        type="button"
        aria-label={`Open focused ${label} generator`}
        aria-haspopup="dialog"
        aria-expanded={popoverOpen}
        onClick={() => { if (isDemo) return; setPopoverOpen((v) => !v); }}
        disabled={isDisabled}
        title={isDemo ? "Generation disabled in demo mode" : undefined}
        className={`inline-flex shrink-0 items-center rounded-r-[4px] px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] transition-colors ring-1 ring-inset disabled:cursor-not-allowed disabled:opacity-50 ${caretStyles}`}
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {popoverOpen ? (
        <FocusPopover
          type={type}
          onClose={() => setPopoverOpen(false)}
          onSubmit={(focus) => {
            setPopoverOpen(false);
            onFocusGenerate(type, focus);
          }}
        />
      ) : null}
    </div>
  );
}
