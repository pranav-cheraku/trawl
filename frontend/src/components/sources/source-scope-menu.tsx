"use client";
// Frosted-glass dropdown for muting/unmuting sources per tab and project.
// Stores muted IDs (not included IDs) so new sources are auto-included.
// Uses useFloatingPosition for mobile viewport safety.

import { useEffect, useMemo, useRef, useState } from "react";

import { useFloatingPosition } from "@/lib/use-floating-position";
import type { Source } from "@/types";

interface SourceScopeMenuProps {
  sources: Source[];
  mutedIds: string[];
  onToggle: (sourceId: string) => void;
  onEnableAll: () => void;
  ariaLabel?: string;
}

function computeDisplayNames(sources: Source[]): Map<string, string> {
  const sorted = [...sources].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const totals = new Map<string, number>();
  const keyFor = (s: Source): string => {
    if (s.sourceType === "app_store") {
      return `appstore::${s.appStoreName ?? s.appStoreId ?? ""}`;
    }
    return `csv::${s.filename ?? "CSV Upload"}`;
  };
  for (const s of sorted) {
    const k = keyFor(s);
    totals.set(k, (totals.get(k) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  const result = new Map<string, string>();
  for (const s of sorted) {
    const k = keyFor(s);
    const idx = (seen.get(k) ?? 0) + 1;
    seen.set(k, idx);
    const total = totals.get(k) ?? 1;
    const suffix = total > 1 ? ` (${idx})` : "";
    if (s.sourceType === "app_store") {
      const label = s.appStoreName ?? `#${s.appStoreId ?? "?"}`;
      result.set(s.id, `App Store - ${label}${suffix}`);
    } else {
      const label = s.filename ?? "CSV Upload";
      result.set(s.id, `${label}${suffix}`);
    }
  }
  return result;
}

export function SourceScopeMenu({
  sources,
  mutedIds,
  onToggle,
  onEnableAll,
  ariaLabel,
}: SourceScopeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const position = useFloatingPosition({
    isOpen,
    triggerRef,
    preferredWidth: 360,
  });

  const displayNames = useMemo(() => computeDisplayNames(sources), [sources]);
  const mutedSet = useMemo(() => new Set(mutedIds), [mutedIds]);

  const totalCount = sources.length;
  const activeCount = totalCount - sources.filter((s) => mutedSet.has(s.id)).length;
  const isScopeEmpty = totalCount > 0 && activeCount === 0;
  const isAllActive = totalCount > 0 && activeCount === totalCount;

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Register via setTimeout(0) so the opening click doesn't immediately close
  // the popover. The popover renders outside the trigger's DOM subtree
  // (position: fixed), so both refs must be checked for outside-click detection.
  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleMouseDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen]);

  if (totalCount === 0) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/70">
        No ready sources yet
      </span>
    );
  }

  // Partial and empty both render "N/M" so the trigger width stays stable
  // as the user toggles. The empty state is communicated by the error-toned
  // pill background, not the label text.
  let triggerCount: React.ReactNode;
  if (isAllActive) {
    triggerCount = (
      <span className="font-semibold text-secondary">ALL</span>
    );
  } else if (isScopeEmpty) {
    triggerCount = (
      <span className="font-semibold">
        {activeCount}/{totalCount}
      </span>
    );
  } else {
    triggerCount = (
      <span className="font-semibold text-secondary">
        {activeCount}/{totalCount}
      </span>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel ?? "Source scope selector"}
        className={
          isScopeEmpty
            ? "inline-flex min-w-[120px] items-center justify-between gap-1.5 rounded-[4px] bg-error/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-error transition-colors hover:bg-error/15"
            : "inline-flex min-w-[120px] items-center justify-between gap-1.5 rounded-[4px] bg-surface-container-high px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface transition-colors hover:bg-surface-container-highest"
        }
      >
        <span className="inline-flex items-center">
          <span>Sources · </span>
          {triggerCount}
        </span>
        <svg
          className={`h-2 w-2 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m6 9 6 6 6-6"
          />
        </svg>
      </button>

      {isOpen && position && (
        <div
          ref={popoverRef}
          role="menu"
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            width: position.width,
          }}
          className="z-50 max-h-[80vh] overflow-y-auto rounded-[4px] bg-surface-container-lowest/[0.94] shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-inset ring-outline-variant/20 backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3 bg-surface-container-low/60 px-3 py-2">
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-on-surface-variant/70">
              Active Sources · {activeCount}/{totalCount}
            </span>
            {!isAllActive ? (
              <button
                type="button"
                onClick={() => onEnableAll()}
                className="font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-on-surface-variant transition-colors hover:text-on-surface"
              >
                Enable all
              </button>
            ) : null}
          </div>

          <div className="max-h-[320px] overflow-y-auto p-1.5">
            {sources.map((source) => {
              const muted = mutedSet.has(source.id);
              const label = displayNames.get(source.id) ?? source.id;
              const meta = `${source.recordCount.toLocaleString()} records`;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => onToggle(source.id)}
                  aria-pressed={!muted}
                  className="flex w-full items-start gap-2.5 rounded-[4px] px-2 py-1.5 transition-colors hover:bg-surface-container-low/70"
                >
                  {muted ? (
                    <span
                      className="mt-[3px] h-3.5 w-3.5 flex-shrink-0 rounded-[2px] ring-[1.5px] ring-inset ring-on-surface/25"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="mt-[3px] flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-[2px] bg-secondary"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-2 w-2 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span
                      className={
                        muted
                          ? "max-w-full break-words text-left text-[12.5px] leading-tight text-on-surface-variant/60"
                          : "max-w-full break-words text-left text-[12.5px] leading-tight text-on-surface"
                      }
                    >
                      {label}
                    </span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-on-surface-variant/70">
                      {meta}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
