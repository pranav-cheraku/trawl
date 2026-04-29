"use client";

import { useEffect, useRef, useState } from "react";

import { friendlyAgo } from "@/lib/time";
import type { BuildReportSummary } from "@/types";

type Props = {
  runs: BuildReportSummary[];
  selectedRunId: string | null; // null = "show latest"
  onSelect: (runId: string | null) => void;
};

export default function RunSwitcher({
  runs,
  selectedRunId,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // setTimeout(0) so the click that OPENED the popover doesn't immediately
    // trigger the close handler. Same pattern as ExportMenu / FocusPopover.
    const id = setTimeout(() => {
      window.addEventListener("mousedown", onMouseDown);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (runs.length === 0) return null;

  const selected =
    selectedRunId === null
      ? runs[0]
      : runs.find((r) => r.id === selectedRunId);
  const isArchived =
    selectedRunId !== null && runs[0]?.id !== selectedRunId;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-w-[180px] items-center justify-between gap-2 rounded-[4px] bg-surface-container px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface transition-colors hover:bg-surface-container-high"
      >
        <span>
          {isArchived ? "Archived · " : "Latest · "}
          {selected ? friendlyAgo(selected.createdAt) : "—"}
        </span>
        <span aria-hidden>▾</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[320px] max-w-[calc(100vw-2rem)] rounded-[4px] bg-surface-container-lowest/90 ring-1 ring-outline-variant/20 backdrop-blur-md">
          <ul className="max-h-[320px] overflow-y-auto py-2">
            {runs.map((run, idx) => {
              const active =
                selectedRunId === run.id ||
                (selectedRunId === null && idx === 0);
              return (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(idx === 0 ? null : run.id);
                      setOpen(false);
                    }}
                    className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-container ${
                      active ? "bg-surface-container" : ""
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-[12px] font-medium text-on-surface">
                        {idx === 0 ? "Latest" : `Run ${runs.length - idx}`}
                      </span>
                      <StatusDot status={run.status} />
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-on-surface-variant">
                      <span>{friendlyAgo(run.createdAt)}</span>
                      <span>·</span>
                      <span>{run.sourceCount} sources</span>
                      <span>·</span>
                      <span>{run.themeCount} themes</span>
                      <span>·</span>
                      <span>{run.specCount} specs</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StatusDot({
  status,
}: {
  status: BuildReportSummary["status"];
}) {
  const color =
    status === "success"
      ? "bg-secondary"
      : status === "running" || status === "pending"
        ? "bg-on-surface-variant"
        : "bg-error";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color}`}
      aria-label={status}
    />
  );
}

