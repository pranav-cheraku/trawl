"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteSource, getSource, listSources } from "@/lib/api";
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
  // Backend stores naive UTC timestamps — append "Z" if missing so the browser
  // parses them as UTC and renders in the user's local timezone.
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
  let classes: string;
  switch (status) {
    case "ready":
      classes = "bg-[#10B981]/10 text-[#10B981]";
      break;
    case "error":
      classes = "bg-error/10 text-error";
      break;
    default:
      classes = "bg-secondary/10 text-secondary animate-pulse";
  }
  return (
    <span
      className={`inline-block rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${classes}`}
    >
      {status}
    </span>
  );
}

function SourceTypeIcon({ sourceType }: { sourceType: string }) {
  if (sourceType === "app_store") {
    return (
      <svg
        className="h-4 w-4 text-on-surface-variant"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4 text-on-surface-variant"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

export default function SourceList({ projectId, refreshKey }: Props) {
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

  // Fetch on mount + refreshKey. Only show the skeleton on the very first
  // load — subsequent refreshes (after adding a source) refetch in the
  // background so the list doesn't flash.
  useEffect(() => {
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    fetchSources();
  }, [fetchSources, refreshKey]);

  // Keep sourcesRef in sync
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  // Poll for non-terminal sources
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

  // Compute display names with duplicate suffixes. Numbering follows addition
  // order (oldest = 1), and suffixes only appear when the same app or filename
  // has been added more than once.
  const displayNames = useMemo(() => {
    const sorted = [...sources].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );

    // Count totals per (type, key) so we can tell whether a suffix is needed.
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
      const index = (seen.get(k) ?? 0) + 1;
      seen.set(k, index);
      const total = totals.get(k) ?? 1;
      const suffix = total > 1 ? ` (${index})` : "";

      if (s.sourceType === "app_store") {
        const label = s.appStoreName ?? `#${s.appStoreId}`;
        result.set(s.id, `App Store - ${label}${suffix}`);
      } else {
        const label = s.filename ?? "CSV Upload";
        result.set(s.id, `${label}${suffix}`);
      }
    }
    return result;
  }, [sources]);

  function getSourceName(source: Source): string {
    return displayNames.get(source.id) ?? "";
  }

  if (isLoading && sources.length === 0) {
    return (
      <div className="rounded-[4px] bg-surface-container-lowest p-6">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          Sources
        </span>
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-[4px] bg-surface-container-low"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[4px] bg-surface-container-lowest p-6">
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        Sources
      </span>

      {errorMessage && (
        <div
          className="mt-4 flex items-start justify-between gap-3 rounded-[4px] bg-error/10 px-4 py-3"
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
        <p className="mt-4 text-[13px] text-on-surface-variant">
          No sources connected yet. Use the connectors above to add feedback.
        </p>
      ) : (
        <div className="mt-4">
          {sources.map((source) => (
            <div key={source.id}>
              {/* Source row */}
              <div
                className={`flex cursor-pointer items-center gap-3 rounded-[4px] px-3 py-2.5 transition-colors hover:bg-surface-container-high ${
                  expandedId === source.id ? "bg-surface-container-low" : ""
                }`}
                onClick={() =>
                  setExpandedId(expandedId === source.id ? null : source.id)
                }
              >
                <SourceTypeIcon sourceType={source.sourceType} />

                {/* Name */}
                <span className="min-w-0 flex-1 truncate text-[13px] text-on-surface">
                  {getSourceName(source)}
                </span>

                {confirmDeleteId === source.id ? (
                  /* Confirmation — takes over the right side for breathing room */
                  <InlineConfirm
                    message="Delete this source?"
                    onConfirm={() => handleDelete(source.id)}
                    onCancel={() => setConfirmDeleteId(null)}
                    isSubmitting={deletingId === source.id}
                  />
                ) : (
                  <>
                    {/* Record count */}
                    <span className="font-mono text-[11px] text-on-surface-variant">
                      {source.recordCount.toLocaleString()} records
                    </span>

                    {/* Status badge */}
                    <StatusBadge status={source.status} />

                    {/* Date */}
                    <span className="hidden font-mono text-[10px] text-on-surface-variant sm:inline">
                      {formatDate(source.createdAt)}
                    </span>

                    {/* Delete */}
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

                    {/* Expand chevron */}
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
                  </>
                )}
              </div>

              {/* Expanded feedback items */}
              {expandedId === source.id && source.status === "ready" && (
                <div className="ml-7 rounded-[4px] bg-surface-container">
                  <FeedbackItemPanel
                    projectId={projectId}
                    sourceId={source.id}
                  />
                </div>
              )}
              {expandedId === source.id && source.status !== "ready" && (
                <div className="ml-7 px-4 py-3">
                  <p className="text-[12px] text-on-surface-variant">
                    {source.status === "error"
                      ? "Ingestion failed for this source."
                      : "Still processing... items will appear when ready."}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
