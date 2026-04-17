"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  generateSpecs,
  getTaskStatus,
  listSpecs,
} from "@/lib/api";
import type { Spec, SpecType, TaskStatus } from "@/types";
import KanbanBoard from "@/components/kanban/kanban-board";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 120_000;
const TERMINAL_STATUSES = new Set<TaskStatus["status"]>([
  "success",
  "failure",
]);

export default function SpecsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [specs, setSpecs] = useState<Spec[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<SpecType | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchSpecs = useCallback(async () => {
    if (!hasLoadedRef.current) setIsLoading(true);
    try {
      const data = await listSpecs(projectId);
      setSpecs(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load specs"
      );
      if (!hasLoadedRef.current) setSpecs([]);
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSpecs();
    return clearPoll;
  }, [fetchSpecs, clearPoll]);

  const pollTask = useCallback(
    (taskId: string, startedAt: number) => {
      clearPoll();
      pollTimerRef.current = setTimeout(async () => {
        try {
          const status = await getTaskStatus(taskId);
          if (TERMINAL_STATUSES.has(status.status)) {
            setGeneratingType(null);
            if (status.status === "failure") {
              setErrorMessage(status.error ?? "Generation failed.");
            } else {
              await fetchSpecs();
            }
            return;
          }
          if (Date.now() - startedAt > MAX_POLL_MS) {
            setGeneratingType(null);
            setErrorMessage(
              "Generation is taking longer than expected. Try again."
            );
            return;
          }
          pollTask(taskId, startedAt);
        } catch (err) {
          setGeneratingType(null);
          setErrorMessage(
            err instanceof Error ? err.message : "Task polling failed."
          );
        }
      }, POLL_INTERVAL_MS);
    },
    [clearPoll, fetchSpecs]
  );

  const handleGenerate = useCallback(
    async (type: SpecType) => {
      if (generatingType) return;
      setErrorMessage(null);
      setGeneratingType(type);
      try {
        const { taskId } = await generateSpecs(projectId, type);
        pollTask(taskId, Date.now());
      } catch (err) {
        setGeneratingType(null);
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to start generation."
        );
      }
    },
    [generatingType, projectId, pollTask]
  );

  const handleCardClick = useCallback((spec: Spec) => {
    // Detail modal lands on Day 26 — log for now so the click path is wired.
    if (process.env.NODE_ENV !== "production") {
      console.log("[specs] card clicked:", spec.id);
    }
  }, []);

  const hasSpecs = (specs?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header — architectural label + generation triggers */}
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-[4px] bg-surface-container-lowest px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-on-surface-variant/70">
            Workspace / Kanban
          </span>
          <h2 className="text-[17px] font-semibold leading-tight text-on-surface">
            Specs
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <GenerateButton
            label="Feature specs"
            onClick={() => handleGenerate("feature_specs")}
            isActive={generatingType === "feature_specs"}
            disabled={generatingType !== null}
          />
          <GenerateButton
            label="User stories"
            onClick={() => handleGenerate("user_stories")}
            isActive={generatingType === "user_stories"}
            disabled={generatingType !== null}
            variant="ghost"
          />
        </div>
      </header>

      {/* Error banner */}
      {errorMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-[4px] bg-error/10 px-4 py-3 text-[13px] text-error">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Generating indicator — thin strip */}
      {generatingType ? (
        <div className="flex items-center gap-3 rounded-[4px] bg-secondary/10 px-4 py-2.5 text-[12px] text-secondary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em]">
            Generating {generatingType === "feature_specs" ? "feature specs" : "user stories"}
          </span>
        </div>
      ) : null}

      {/* Body */}
      {isLoading ? (
        <BoardSkeleton />
      ) : hasSpecs ? (
        <KanbanBoard specs={specs ?? []} onCardClick={handleCardClick} />
      ) : (
        <EmptyState
          onGenerate={() => handleGenerate("feature_specs")}
          isGenerating={generatingType !== null}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

interface GenerateButtonProps {
  label: string;
  onClick: () => void;
  isActive: boolean;
  disabled: boolean;
  variant?: "primary" | "ghost";
}

function GenerateButton({
  label,
  onClick,
  isActive,
  disabled,
  variant = "primary",
}: GenerateButtonProps) {
  const base =
    "inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-on-surface text-surface-container-lowest hover:bg-secondary"
      : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-high";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
      <span>{isActive ? "Queued…" : label}</span>
    </button>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((col) => (
        <div
          key={col}
          className="flex flex-col rounded-[4px] bg-surface-container-low p-3"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="h-2.5 w-20 rounded-[2px] bg-surface-container animate-pulse" />
            <div className="h-4 w-6 rounded-[2px] bg-surface-container animate-pulse" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1].map((r) => (
              <div
                key={r}
                className="h-20 rounded-[4px] bg-surface-container-lowest animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-surface-container">
        <svg
          className="h-5 w-5 text-on-surface-variant"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z"
          />
        </svg>
      </div>
      <h2 className="mt-5 text-lg font-semibold text-on-surface">
        No specs yet
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-on-surface-variant">
        Generate a roadmap from your connected feedback. Every spec traces
        back to the exact chunks that informed it.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="mt-6 inline-flex items-center gap-1.5 rounded-[4px] bg-on-surface px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
          />
        </svg>
        <span>
          {isGenerating ? "Generating…" : "Generate feature specs"}
        </span>
      </button>
    </div>
  );
}
