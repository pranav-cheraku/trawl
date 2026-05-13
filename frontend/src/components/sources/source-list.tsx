"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { deleteSource, getSource, listSources } from "@/lib/api";
import { durations, easings, staggers } from "@/lib/motion";
import {
  getSourceTypeIcon,
  getSourceTypeLabel,
  getSourceDedupeKey,
  getSourceBaseName,
} from "@/lib/source-display";
import type { Source } from "@/types";
import InlineConfirm from "@/components/ui/inline-confirm";
import FeedbackItemPanel from "./feedback-item-panel";

interface Props {
  projectId: string;
  refreshKey: number;
}

const TERMINAL_STATUSES = new Set(["ready", "error"]);
const POLL_INTERVAL = 3000;

function formatDate(iso: string): string {
  // Backend writes naive UTC. Append "Z" so the browser treats it as UTC.
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  return new Date(normalized).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  let dotClass: string;
  let textClass: string;
  let pulse = false;
  switch (status) {
    case "ready":
      dotClass = "bg-[#10B981]";
      textClass = "text-on-surface";
      break;
    case "error":
      dotClass = "bg-error";
      textClass = "text-error";
      break;
    default:
      dotClass = "bg-secondary";
      textClass = "text-secondary";
      pulse = true;
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${dotClass} ${pulse ? "animate-pulse" : ""}`}
      />
      <span className={textClass}>{status}</span>
    </span>
  );
}


export default function SourceList({ projectId, refreshKey }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sourcesRef = useRef<Source[]>([]);
  const hasLoadedRef = useRef(false);

  const fetchSources = useCallback(async () => {
    try {
      const data = await listSources(projectId);
      setSources(data);
      sourcesRef.current = data;
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load sources."
      );
    } finally {
      setIsLoading(false);
      hasLoadedRef.current = true;
    }
  }, [projectId]);

  // Only show the skeleton on the first load; subsequent refreshes run in
  // the background so the list doesn't flash.
  useEffect(() => {
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    fetchSources();
  }, [fetchSources, refreshKey]);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const pendingSources = sourcesRef.current.filter(
        (s) => !TERMINAL_STATUSES.has(s.status)
      );
      if (pendingSources.length === 0) {
        return;
      }

      const updates = await Promise.all(
        pendingSources.map((s) =>
          getSource(projectId, s.id).catch(() => null)
        )
      );

      setSources((prev) =>
        prev.map((s) => {
          const updated = updates.find((u) => u?.id === s.id);
          return updated ?? s;
        })
      );
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [projectId, refreshKey]);

  const handleDelete = useCallback(
    async (sourceId: string) => {
      setDeletingId(sourceId);
      setErrorMessage(null);
      try {
        await deleteSource(projectId, sourceId);
        setSources((prev) => prev.filter((s) => s.id !== sourceId));
        if (expandedId === sourceId) setExpandedId(null);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to delete source."
        );
      } finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
      }
    },
    [projectId, expandedId]
  );

  const displayNames = useMemo(() => {
    const sorted = [...sources].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );

    const totals = new Map<string, number>();
    for (const s of sorted) {
      const k = getSourceDedupeKey(s);
      totals.set(k, (totals.get(k) ?? 0) + 1);
    }

    const seen = new Map<string, number>();
    const result = new Map<string, string>();
    for (const s of sorted) {
      const k = getSourceDedupeKey(s);
      const index = (seen.get(k) ?? 0) + 1;
      seen.set(k, index);
      const total = totals.get(k) ?? 1;
      const suffix = total > 1 ? ` (${index})` : "";
      result.set(s.id, `${getSourceBaseName(s)}${suffix}`);
    }
    return result;
  }, [sources]);

  function getSourceName(source: Source): string {
    return displayNames.get(source.id) ?? "";
  }

  if (isLoading && sources.length === 0) {
    return (
      <div className="rounded-[4px] bg-surface-container-lowest p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
            Connected Sources
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-11 animate-pulse rounded-[4px] bg-surface-container-low"
            />
          ))}
        </div>
      </div>
    );
  }

  // Added column is 138px. "May 10, 2026, 10:43 AM" in JetBrains Mono is ~134px,
  // just enough slack to avoid a 1-char clip at the longest expected date.
  const columnTemplate =
    "grid-cols-[28px_minmax(0,1.6fr)_86px_70px_80px_138px_72px]";

  return (
    <div className="rounded-[4px] bg-surface-container-lowest p-4">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          Connected Sources · {sources.length}
        </span>
        {sources.some((s) => !TERMINAL_STATUSES.has(s.status)) ? (
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/60">
            <motion.span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-secondary"
              animate={prefersReducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
              transition={prefersReducedMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            Polling
          </span>
        ) : null}
      </div>

      {errorMessage && (
        <div
          className="mt-3 flex items-start justify-between gap-3 rounded-[4px] bg-error/10 px-4 py-3"
          role="alert"
        >
          <p className="text-[12px] text-error">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-mono text-[10px] uppercase tracking-wider text-error/70 hover:text-error"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {sources.length === 0 ? (
        <p className="mt-4 px-1 text-[13px] text-on-surface-variant">
          No sources connected yet. Click &ldquo;Add Source&rdquo; to connect feedback.
        </p>
      ) : (
        <>
          {/* Table layout (md+) */}
          <div className="hidden md:block">
            <div className="mt-3 overflow-hidden rounded-[4px]">
              {/* "Source" header spans the icon + name columns (col-span-2).
                  "Delete" is right-aligned to align with the trash icon. */}
              <div
                className={`grid ${columnTemplate} items-center gap-3 bg-surface-container-low px-3 py-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.15em] text-on-surface-variant/70`}
              >
                <span className="col-span-2">Source</span>
                <span>Type</span>
                <span>Records</span>
                <span>Status</span>
                <span>Added</span>
                <span className="pr-5 text-right">Delete</span>
              </div>

              {sources.map((source, idx) => {
                const cumulativeDelay = Math.min(idx * staggers.list, 0.8);
                return (
                <motion.div
                  key={source.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: durations.normal,
                    ease: easings.standard,
                    delay: cumulativeDelay,
                  }}
                >
                  <div
                    className={`grid ${columnTemplate} cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-container-low ${
                      expandedId === source.id ? "bg-surface-container-low" : ""
                    } ${
                      idx !== sources.length - 1
                        ? "shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)]"
                        : ""
                    }`}
                    onClick={() =>
                      setExpandedId(expandedId === source.id ? null : source.id)
                    }
                  >
                    <div className="flex items-center justify-center">
                      {getSourceTypeIcon(source.sourceType)}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[13px] text-on-surface">
                        {getSourceName(source)}
                      </div>
                    </div>

                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                      {getSourceTypeLabel(source.sourceType)}
                    </span>

                    <span className="font-mono text-[12px] text-on-surface">
                      {source.recordCount.toLocaleString()}
                    </span>

                    {confirmDeleteId === source.id ? (
                      <div className="col-span-3">
                        <InlineConfirm
                          message="Delete this source?"
                          onConfirm={() => handleDelete(source.id)}
                          onCancel={() => setConfirmDeleteId(null)}
                          isSubmitting={deletingId === source.id}
                        />
                      </div>
                    ) : (
                      <>
                        <StatusBadge status={source.status} />

                        <span className="font-mono text-[10px] text-on-surface-variant">
                          {formatDate(source.createdAt)}
                        </span>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(source.id);
                            }}
                            className="rounded-[4px] p-1 text-on-surface-variant opacity-40 transition-opacity hover:text-error hover:opacity-100"
                            title="Delete source"
                            aria-label="Delete source"
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
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                              />
                            </svg>
                          </button>
                          <svg
                            className={`h-3.5 w-3.5 text-on-surface-variant transition-transform ${
                              expandedId === source.id ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m19.5 8.25-7.5 7.5-7.5-7.5"
                            />
                          </svg>
                        </div>
                      </>
                    )}
                  </div>

                  {expandedId === source.id && source.status === "ready" && (
                    <div className="bg-surface-container px-3 py-2">
                      <FeedbackItemPanel
                        projectId={projectId}
                        sourceId={source.id}
                      />
                    </div>
                  )}
                  {expandedId === source.id && source.status !== "ready" && (
                    <div className="bg-surface-container px-3 py-2">
                      <p className="text-[12px] text-on-surface-variant">
                        {source.status === "error"
                          ? "Ingestion failed for this source."
                          : "Still processing... items will appear when ready."}
                      </p>
                    </div>
                  )}
                </motion.div>
                );
              })}
            </div>
          </div>

          {/* Card layout (mobile) */}
          <div className="mt-3 flex flex-col gap-2 md:hidden">
            {sources.map((source, idx) => {
              const cumulativeDelay = Math.min(idx * staggers.list, 0.8);
              return (
              <motion.div
                key={source.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: durations.normal,
                  ease: easings.standard,
                  delay: cumulativeDelay,
                }}
                className={`flex flex-col rounded-[4px] transition-colors ${
                  expandedId === source.id
                    ? "bg-surface-container-low"
                    : "bg-surface-container-low hover:bg-surface-container-low"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expandedId === source.id ? null : source.id)
                  }
                  className="flex items-start gap-3 px-3 py-2.5 text-left"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getSourceTypeIcon(source.sourceType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 truncate text-[13px] text-on-surface">
                        {getSourceName(source)}
                      </div>
                      <svg
                        className={`mt-1 h-3 w-3 flex-shrink-0 text-on-surface-variant transition-transform ${
                          expandedId === source.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m19.5 8.25-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                        {getSourceTypeLabel(source.sourceType)}
                      </span>
                      <span className="font-mono text-[11px] text-on-surface">
                        {source.recordCount.toLocaleString()} records
                      </span>
                      <StatusBadge status={source.status} />
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        {formatDate(source.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>

                {confirmDeleteId === source.id ? (
                  <div className="px-3 pb-2.5">
                    <InlineConfirm
                      message="Delete this source?"
                      onConfirm={() => handleDelete(source.id)}
                      onCancel={() => setConfirmDeleteId(null)}
                      isSubmitting={deletingId === source.id}
                    />
                  </div>
                ) : (
                  <div className="flex justify-end px-3 pb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(source.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-[4px] px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-on-surface-variant opacity-60 transition-opacity hover:text-error hover:opacity-100"
                      aria-label="Delete source"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}

                {expandedId === source.id && source.status === "ready" && (
                  <div className="bg-surface-container px-3 py-2">
                    <FeedbackItemPanel
                      projectId={projectId}
                      sourceId={source.id}
                    />
                  </div>
                )}
                {expandedId === source.id && source.status !== "ready" && (
                  <div className="bg-surface-container px-3 py-2">
                    <p className="text-[12px] text-on-surface-variant">
                      {source.status === "error"
                        ? "Ingestion failed for this source."
                        : "Still processing... items will appear when ready."}
                    </p>
                  </div>
                )}
              </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
