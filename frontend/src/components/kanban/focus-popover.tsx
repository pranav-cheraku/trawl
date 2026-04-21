"use client";

import { useEffect, useRef, useState } from "react";
import type { SpecType } from "@/types";

interface FocusPopoverProps {
  type: SpecType;
  onSubmit: (focus: string) => void;
  onClose: () => void;
}

const SUGGESTIONS = ["onboarding", "performance", "accessibility", "low ratings"];
const MAX_LEN = 200;

export default function FocusPopover({
  type,
  onSubmit,
  onClose,
}: FocusPopoverProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Autofocus on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Click-outside to close. Defer registering the listener so the
  // click that OPENED the popover doesn't immediately close it.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", onDown);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const trimmed = value.trim();
  const canRun = trimmed.length > 0;

  const submit = () => {
    if (!canRun) return;
    onSubmit(trimmed);
  };

  const label = type === "feature_specs" ? "Feature specs" : "User stories";

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label={`Focused ${label} generation`}
      className="absolute right-0 top-[calc(100%+6px)] z-20 w-[min(340px,calc(100vw-32px))] rounded-[4px] bg-surface-container-lowest/90 px-3.5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-md ring-1 ring-outline-variant/20"
    >
      <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        Focus — {label}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        maxLength={MAX_LEN}
        placeholder="e.g. onboarding friction, low ratings"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="w-full rounded-[4px] bg-surface-container-lowest px-2.5 py-2 font-mono text-[12px] text-on-surface ring-1 ring-outline-variant/35 focus:outline-none focus:ring-1 focus:ring-secondary focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)]"
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setValue(s)}
            className="rounded-[2px] bg-surface-container px-2 py-[3px] text-[11px] text-on-surface-variant hover:bg-surface-container-high"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.1em] text-on-surface-variant">
          {value.length}/{MAX_LEN} · Enter to run · Esc to close
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!canRun}
          className="inline-flex items-center gap-1.5 rounded-[4px] bg-on-surface px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
