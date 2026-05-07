"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  generateSpecs,
  getProject,
  getTaskStatus,
  listSources,
  listSpecs,
  reorderSpecs,
} from "@/lib/api";
import type { Source, Spec, SpecStatus, SpecType, TaskStatus } from "@/types";
import { SourceScopeMenu } from "@/components/sources/source-scope-menu";
import { useSourceScope } from "@/lib/use-source-scope";
import { useSpecCascade } from "@/lib/use-spec-cascade";
import KanbanBoard from "@/components/kanban/kanban-board";
import SpecCard from "@/components/kanban/spec-card";
import SpecDetailModal from "@/components/kanban/spec-detail-modal";
import FilterBar, { type Filters } from "@/components/kanban/filter-bar";
import SplitGenerateButton from "@/components/kanban/split-generate-button";
import ExportMenu from "@/components/kanban/export-menu";
import WorkspaceHeader, {
  type WorkspaceStat,
} from "@/components/workspace/workspace-header";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 120_000;
const TERMINAL_STATUSES = new Set<TaskStatus["status"]>([
  "success",
  "failure",
]);

const STATUSES: SpecStatus[] = ["backlog", "planned", "in_progress", "done"];

function emptyBuckets(): Record<SpecStatus, Spec[]> {
  return { backlog: [], planned: [], in_progress: [], done: [] };
}

function compareSpecs(a: Spec, b: Spec): number {
  if (a.kanbanOrder !== b.kanbanOrder) return a.kanbanOrder - b.kanbanOrder;
  return a.createdAt.localeCompare(b.createdAt);
}

export default function SpecsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [specs, setSpecs] = useState<Spec[] | null>(null);
  const specIds = useMemo(() => (specs ?? []).map((s) => s.id), [specs]);
  const cascadeIds = useSpecCascade(specIds);
  const [selectedSpec, setSelectedSpec] = useState<Spec | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const sourceScope = useSourceScope(projectId, "specs");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<SpecType | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    type: null,
    status: null,
    priority: null,
  });
  const [projectName, setProjectName] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  // ── DnD sensors ───────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Filter + derived values ────────────────────────────────────────
  const filteredSpecs = useMemo(() => {
    if (!specs) return null;
    return specs.filter((s) => {
      if (filters.type && s.type !== filters.type) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.priority && s.priority !== filters.priority) return false;
      return true;
    });
  }, [specs, filters]);

  const totalsByStatus = useMemo<Record<SpecStatus, number>>(() => {
    const totals: Record<SpecStatus, number> = {
      backlog: 0,
      planned: 0,
      in_progress: 0,
      done: 0,
    };
    for (const s of specs ?? []) {
      const key = s.status as SpecStatus;
      if (key in totals) totals[key] += 1;
    }
    return totals;
  }, [specs]);

  const isFilterActive =
    filters.type !== null ||
    filters.status !== null ||
    filters.priority !== null;

  const readySources = useMemo(
    () => sources.filter((s) => s.status === "ready"),
    [sources],
  );
  const activeIds = useMemo(
    () => sourceScope.activeIds(readySources),
    [sourceScope, readySources],
  );
  const isScopeEmpty =
    readySources.length > 0 && activeIds.length === 0;

  const statsForHeader = useMemo<WorkspaceStat[]>(() => {
    const list = specs ?? [];
    const critHigh = list.filter(
      (s) => s.priority === "critical" || s.priority === "high"
    ).length;
    const done = list.filter((s) => s.status === "done").length;
    return [
      { value: list.length.toString(), key: "Total Specs" },
      { value: critHigh.toString(), key: "Critical + High" },
      { value: done.toString(), key: "Done" },
    ];
  }, [specs]);

  // ── Group specs into columns ───────────────────────────────────────
  const grouped = useMemo<Record<SpecStatus, Spec[]>>(() => {
    const buckets = emptyBuckets();
    for (const spec of filteredSpecs ?? []) {
      const bucket = buckets[spec.status as SpecStatus];
      if (bucket) bucket.push(spec);
      else buckets.backlog.push(spec);
    }
    for (const key of STATUSES) {
      buckets[key].sort(compareSpecs);
    }
    return buckets;
  }, [filteredSpecs]);

  // ── Active spec for DragOverlay ────────────────────────────────────
  const activeSpec = useMemo(
    () => (activeId ? (specs ?? []).find((s) => s.id === activeId) ?? null : null),
    [activeId, specs]
  );
  const dragActive = activeSpec !== null;

  // ── Data fetching ──────────────────────────────────────────────────
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
    let cancelled = false;
    // Project name + sources are both best-effort; failures fall back gracefully.
    getProject(projectId)
      .then((p) => {
        if (!cancelled) setProjectName(p.name);
      })
      .catch(() => {
        /* swallow — fall back to UUID prefix when exporting */
      });
    listSources(projectId)
      .then((data) => {
        if (!cancelled) setSources(data);
      })
      .catch(() => {
        /* non-fatal — scope strip will show "no ready sources yet" */
      });
    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [fetchSpecs, clearPoll, projectId]);

  // ── Task polling ───────────────────────────────────────────────────
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
    async (type: SpecType, focus?: string) => {
      if (generatingType) return;
      setErrorMessage(null);
      setGeneratingType(type);
      // Focused generation: clear filters so the new specs are guaranteed
      // to be visible on the board once the task resolves.
      if (focus) {
        setFilters({ type: null, status: null, priority: null });
      }
      try {
        const { taskId } = await generateSpecs(projectId, type, focus, activeIds);
        pollTask(taskId, Date.now());
      } catch (err) {
        setGeneratingType(null);
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to start generation."
        );
      }
    },
    [generatingType, projectId, pollTask, activeIds]
  );

  const handleCardClick = useCallback((spec: Spec) => {
    setSelectedSpec(spec);
  }, []);

  const handleSpecUpdated = useCallback((updated: Spec) => {
    setSpecs((prev) =>
      prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev,
    );
    // Keep the modal's spec in sync so the next edit is built on fresh state.
    setSelectedSpec((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const handleSpecDeleted = useCallback((specId: string) => {
    setSpecs((prev) => (prev ? prev.filter((s) => s.id !== specId) : prev));
    setSelectedSpec((prev) => (prev?.id === specId ? null : prev));
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      if (isFilterActive) return;
      const { active, over } = event;
      if (!over) return;

      const activeSpecId = String(active.id);
      const overId = String(over.id);

      // Find source spec and its current status.
      const currentSpecs = specs ?? [];
      const activeSpec = currentSpecs.find((s) => s.id === activeSpecId);
      if (!activeSpec) return;
      const sourceStatus = activeSpec.status;

      // Resolve destination status and target index.
      let destStatus: SpecStatus;
      let destIndex: number;

      if (overId.startsWith("col:")) {
        // Dropped directly on a column droppable — append to end.
        destStatus = overId.slice(4) as SpecStatus;
        destIndex = grouped[destStatus].length;
        // If we're moving within the same column to the end, skip if nothing changed.
        if (
          sourceStatus === destStatus &&
          grouped[sourceStatus].at(-1)?.id === activeSpecId
        ) {
          return;
        }
      } else {
        // Dropped on another card — find that card.
        const overSpec = currentSpecs.find((s) => s.id === overId);
        if (!overSpec) return;
        destStatus = overSpec.status;
        destIndex = grouped[destStatus].findIndex((s) => s.id === overId);
        if (destIndex === -1) destIndex = grouped[destStatus].length;
      }

      // ── Build new flat spec list ─────────────────────────────────────
      // Snapshot for rollback.
      const snapshot = [...currentSpecs];

      let newSpecs: Spec[];

      if (sourceStatus === destStatus) {
        // Within-column: arrayMove on that column's spec list.
        const colSpecs = [...grouped[sourceStatus]];
        const fromIdx = colSpecs.findIndex((s) => s.id === activeSpecId);
        if (fromIdx === -1 || fromIdx === destIndex) return;
        const reordered = arrayMove(colSpecs, fromIdx, destIndex);

        // Reassign dense kanbanOrder.
        const updated = reordered.map((s, i) => ({ ...s, kanbanOrder: i }));

        // Splice updated column back into flat list.
        newSpecs = currentSpecs.map((s) => {
          const found = updated.find((u) => u.id === s.id);
          return found ?? s;
        });
      } else {
        // Cross-column: remove from source, insert at dest.
        const srcColSpecs = grouped[sourceStatus].filter(
          (s) => s.id !== activeSpecId
        );
        const dstColSpecs = [...grouped[destStatus]];
        const clampedIdx = Math.min(destIndex, dstColSpecs.length);
        dstColSpecs.splice(clampedIdx, 0, { ...activeSpec, status: destStatus });

        // Dense kanbanOrder for both affected columns.
        const srcUpdated = srcColSpecs.map((s, i) => ({ ...s, kanbanOrder: i }));
        const dstUpdated = dstColSpecs.map((s, i) => ({ ...s, kanbanOrder: i }));
        const changedMap = new Map<string, Spec>();
        for (const s of [...srcUpdated, ...dstUpdated]) changedMap.set(s.id, s);

        newSpecs = currentSpecs.map((s) => changedMap.get(s.id) ?? s);
      }

      // ── Compute diff (only items whose kanbanOrder or status changed) ─
      const specsBefore = new Map(currentSpecs.map((s) => [s.id, s]));
      const diff = newSpecs.filter((s) => {
        const before = specsBefore.get(s.id);
        return (
          before &&
          (before.kanbanOrder !== s.kanbanOrder || before.status !== s.status)
        );
      }).map((s) => ({ id: s.id, kanbanOrder: s.kanbanOrder, status: s.status }));

      if (diff.length === 0) return;

      // ── Optimistic update, then persist ───────────────────────────────
      setSpecs(newSpecs);

      try {
        await reorderSpecs(diff);
      } catch {
        // Rollback on error.
        setSpecs(snapshot);
        setErrorMessage("Failed to save reorder. Your change was reverted.");
      }
    },
    [specs, grouped, isFilterActive]
  );

  const hasSpecs = (specs?.length ?? 0) > 0;

  return (
    <>
    <div className="flex flex-col gap-4">
      <WorkspaceHeader
        label="Workspace / Kanban"
        title="Specs"
        stats={hasSpecs ? statsForHeader : undefined}
        right={
          <div className="flex items-center gap-2">
            <SplitGenerateButton
              label="Feature specs"
              type="feature_specs"
              variant="primary"
              isActive={generatingType === "feature_specs"}
              disabled={generatingType !== null || isScopeEmpty}
              onGenerate={(t) => handleGenerate(t)}
              onFocusGenerate={(t, focus) => handleGenerate(t, focus)}
            />
            <SplitGenerateButton
              label="User stories"
              type="user_stories"
              variant="ghost"
              isActive={generatingType === "user_stories"}
              disabled={generatingType !== null || isScopeEmpty}
              onGenerate={(t) => handleGenerate(t)}
              onFocusGenerate={(t, focus) => handleGenerate(t, focus)}
            />
          </div>
        }
      />

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

      {/* Source scope strip — controls which sources future generations use */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-surface-container-lowest px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/70">
            Scope
          </span>
          <SourceScopeMenu
            sources={readySources}
            mutedIds={sourceScope.mutedIds}
            onToggle={sourceScope.toggle}
            onEnableAll={sourceScope.clear}
            ariaLabel="Source scope for spec generation"
          />
        </div>
        {readySources.length > 0 ? (
          <span
            className={
              isScopeEmpty
                ? "font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-error"
                : "font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant/70"
            }
          >
            {isScopeEmpty
              ? "Activate at least one source to generate"
              : `Generation will use ${activeIds.length} of ${readySources.length} source${readySources.length === 1 ? "" : "s"}`}
          </span>
        ) : null}
      </div>

      {/* Filter bar — only when specs exist */}
      {hasSpecs ? (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          filteredCount={filteredSpecs?.length ?? 0}
          totalCount={specs?.length ?? 0}
          right={
            filteredSpecs ? (
              <ExportMenu
                specs={filteredSpecs}
                projectName={projectName ?? projectId.slice(0, 8)}
              />
            ) : null
          }
        />
      ) : null}

      {/* No-match banner */}
      {isFilterActive && filteredSpecs?.length === 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-[4px] bg-surface-container-low px-4 py-3 text-[13px] text-on-surface-variant">
          <span>No specs match the current filter.</span>
          <button
            type="button"
            onClick={() =>
              setFilters({ type: null, status: null, priority: null })
            }
            className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface hover:underline"
          >
            Clear filters
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
            Generating{" "}
            {generatingType === "feature_specs" ? "feature specs" : "user stories"}
          </span>
        </div>
      ) : null}

      {/* Body */}
      {isLoading ? (
        <BoardSkeleton />
      ) : hasSpecs ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <KanbanBoard
            grouped={grouped}
            totalsByStatus={totalsByStatus}
            isFilterActive={isFilterActive}
            dragActive={dragActive}
            onCardClick={handleCardClick}
            cascadeIds={cascadeIds}
          />
          <DragOverlay>
            {activeSpec ? (
              <SpecCard spec={activeSpec} isDragging={false} />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <EmptyState
          onGenerate={() => handleGenerate("feature_specs")}
          isGenerating={generatingType !== null}
        />
      )}
    </div>
    {selectedSpec ? (
      <SpecDetailModal
        spec={selectedSpec}
        projectId={projectId}
        onClose={() => setSelectedSpec(null)}
        onSpecUpdated={handleSpecUpdated}
        onSpecDeleted={handleSpecDeleted}
      />
    ) : null}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────

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
