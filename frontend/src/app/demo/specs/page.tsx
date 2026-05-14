"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { apiFetch } from "@/lib/api";
import { useDemoMode } from "@/lib/demo-mode";
import { useSourceScope } from "@/lib/use-source-scope";
import { useSpecCascade } from "@/lib/use-spec-cascade";
import { SourceScopeMenu } from "@/components/sources/source-scope-menu";
import KanbanBoard from "@/components/kanban/kanban-board";
import SpecCard from "@/components/kanban/spec-card";
import SpecDetailModal from "@/components/kanban/spec-detail-modal";
import FilterBar, { type Filters } from "@/components/kanban/filter-bar";
import SplitGenerateButton from "@/components/kanban/split-generate-button";
import ExportMenu from "@/components/kanban/export-menu";
import WorkspaceHeader, {
  type WorkspaceStat,
} from "@/components/workspace/workspace-header";
import DemoProjectLayout from "@/components/demo/demo-project-layout";
import type { Source, Spec, SpecStatus } from "@/types";

const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ?? "";
const DEMO_PROJECT_NAME = "Notion – App Reviews";

const STATUSES: SpecStatus[] = ["backlog", "planned", "in_progress", "done"];

function emptyBuckets(): Record<SpecStatus, Spec[]> {
  return { backlog: [], planned: [], in_progress: [], done: [] };
}

function compareSpecs(a: Spec, b: Spec): number {
  if (a.kanbanOrder !== b.kanbanOrder) return a.kanbanOrder - b.kanbanOrder;
  return a.createdAt.localeCompare(b.createdAt);
}

export default function DemoSpecsPage() {
  const isDemo = useDemoMode();
  const projectId = DEMO_PROJECT_ID;

  const [specs, setSpecs] = useState<Spec[] | null>(null);
  const specIds = useMemo(() => (specs ?? []).map((s) => s.id), [specs]);
  const cascadeIds = useSpecCascade(specIds);
  const [selectedSpec, setSelectedSpec] = useState<Spec | null>(null);
  const [modalOriginRect, setModalOriginRect] = useState<DOMRect | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const sourceScope = useSourceScope(projectId, "specs");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    type: null,
    status: null,
    priority: null,
  });

  const hasLoadedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const within = pointerWithin(args);
    if (within.length > 0) return within;
    const intersecting = rectIntersection(args);
    if (intersecting.length > 0) return intersecting;
    return closestCorners(args);
  }, []);

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
  const isScopeEmpty = readySources.length > 0 && activeIds.length === 0;

  const statsForHeader = useMemo<WorkspaceStat[]>(() => {
    const list = specs ?? [];
    const critHigh = list.filter(
      (s) => s.priority === "critical" || s.priority === "high",
    ).length;
    const done = list.filter((s) => s.status === "done").length;
    return [
      { value: list.length.toString(), key: "Total Specs" },
      { value: critHigh.toString(), key: "Critical + High" },
      { value: done.toString(), key: "Done" },
    ];
  }, [specs]);

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

  const activeSpec = useMemo(
    () =>
      activeId ? (specs ?? []).find((s) => s.id === activeId) ?? null : null,
    [activeId, specs],
  );
  const dragActive = activeSpec !== null;

  const fetchSpecs = useCallback(async () => {
    if (!hasLoadedRef.current) setIsLoading(true);
    try {
      const data = await apiFetch<Spec[]>(
        `/api/projects/${projectId}/specs`,
        { demo: isDemo },
      );
      setSpecs(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load specs",
      );
      if (!hasLoadedRef.current) setSpecs([]);
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, [projectId, isDemo]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    fetchSpecs();
    apiFetch<Source[]>(`/api/projects/${projectId}/sources`, { demo: isDemo })
      .then((data) => {
        if (!cancelled) setSources(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [fetchSpecs, projectId, isDemo]);

  const handleCardClick = useCallback((spec: Spec, originRect?: DOMRect) => {
    setSelectedSpec(spec);
    setModalOriginRect(originRect ?? null);
  }, []);

  const handleSpecUpdated = useCallback((updated: Spec) => {
    setSpecs((prev) =>
      prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev,
    );
    setSelectedSpec((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const handleSpecDeleted = useCallback((specId: string) => {
    setSpecs((prev) => (prev ? prev.filter((s) => s.id !== specId) : prev));
    setSelectedSpec((prev) => (prev?.id === specId ? null : prev));
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // DnD is disabled in demo mode — no reorder calls go out
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      if (isFilterActive || isDemo) return;
      const { active, over } = event;
      if (!over) return;

      const activeSpecId = String(active.id);
      const overId = String(over.id);

      const currentSpecs = specs ?? [];
      const activeSpecItem = currentSpecs.find((s) => s.id === activeSpecId);
      if (!activeSpecItem) return;
      const sourceStatus = activeSpecItem.status;

      let destStatus: SpecStatus;
      let destIndex: number;

      if (overId.startsWith("col:")) {
        destStatus = overId.slice(4) as SpecStatus;
        destIndex = grouped[destStatus].length;
        if (
          sourceStatus === destStatus &&
          grouped[sourceStatus].at(-1)?.id === activeSpecId
        ) {
          return;
        }
      } else {
        const overSpec = currentSpecs.find((s) => s.id === overId);
        if (!overSpec) return;
        destStatus = overSpec.status;
        destIndex = grouped[destStatus].findIndex((s) => s.id === overId);
        if (destIndex === -1) destIndex = grouped[destStatus].length;
      }

      const snapshot = [...currentSpecs];

      let newSpecs: Spec[];

      if (sourceStatus === destStatus) {
        const colSpecs = [...grouped[sourceStatus]];
        const fromIdx = colSpecs.findIndex((s) => s.id === activeSpecId);
        if (fromIdx === -1 || fromIdx === destIndex) return;
        const reordered = arrayMove(colSpecs, fromIdx, destIndex);
        const updated = reordered.map((s, i) => ({ ...s, kanbanOrder: i }));
        newSpecs = currentSpecs.map((s) => {
          const found = updated.find((u) => u.id === s.id);
          return found ?? s;
        });
      } else {
        const srcColSpecs = grouped[sourceStatus].filter(
          (s) => s.id !== activeSpecId,
        );
        const dstColSpecs = [...grouped[destStatus]];
        const clampedIdx = Math.min(destIndex, dstColSpecs.length);
        dstColSpecs.splice(clampedIdx, 0, { ...activeSpecItem, status: destStatus });
        const srcUpdated = srcColSpecs.map((s, i) => ({ ...s, kanbanOrder: i }));
        const dstUpdated = dstColSpecs.map((s, i) => ({ ...s, kanbanOrder: i }));
        const changedMap = new Map<string, Spec>();
        for (const s of [...srcUpdated, ...dstUpdated]) changedMap.set(s.id, s);
        newSpecs = currentSpecs.map((s) => changedMap.get(s.id) ?? s);
      }

      const specsBefore = new Map(currentSpecs.map((s) => [s.id, s]));
      const diff = newSpecs
        .filter((s) => {
          const before = specsBefore.get(s.id);
          return (
            before &&
            (before.kanbanOrder !== s.kanbanOrder ||
              before.status !== s.status)
          );
        })
        .map((s) => ({
          id: s.id,
          kanbanOrder: s.kanbanOrder,
          status: s.status,
        }));

      if (diff.length === 0) return;

      setSpecs(newSpecs);

      try {
        await apiFetch<void>("/api/specs/reorder", {
          method: "PATCH",
          body: JSON.stringify({ updates: diff }),
          demo: isDemo,
        });
      } catch {
        setSpecs(snapshot);
        setErrorMessage("Failed to save reorder. Your change was reverted.");
      }
    },
    [specs, grouped, isFilterActive, isDemo],
  );

  const hasSpecs = (specs?.length ?? 0) > 0;

  if (!projectId) {
    return (
      <DemoProjectLayout projectName={DEMO_PROJECT_NAME}>
        <div className="p-6 text-center text-on-surface-variant">
          Demo not configured.
        </div>
      </DemoProjectLayout>
    );
  }

  return (
    <DemoProjectLayout projectName={DEMO_PROJECT_NAME}>
      <>
        <div className="flex flex-col gap-4">
          <WorkspaceHeader
            label="Workspace / Kanban"
            title="Specs"
            stats={hasSpecs ? statsForHeader : undefined}
            right={
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
                <SplitGenerateButton
                  label="Feature specs"
                  type="feature_specs"
                  variant="primary"
                  isActive={false}
                  disabled={true}
                  onGenerate={() => {}}
                  onFocusGenerate={() => {}}
                />
                <SplitGenerateButton
                  label="User stories"
                  type="user_stories"
                  variant="ghost"
                  isActive={false}
                  disabled={true}
                  onGenerate={() => {}}
                  onFocusGenerate={() => {}}
                />
              </div>
            }
          />

          {errorMessage ? (
            <div className="flex items-center justify-between gap-3 rounded-[4px] bg-error/10 px-4 py-3 text-[13px] text-error">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] hover:underline"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {/* Scope strip */}
          <div className="flex flex-col gap-2 rounded-[4px] bg-surface-container-lowest px-4 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div className="flex items-center gap-3">
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
                  : `Using ${activeIds.length} of ${readySources.length} source${readySources.length === 1 ? "" : "s"}`}
              </span>
            ) : null}
          </div>

          {/* Filter bar */}
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
                    projectName={DEMO_PROJECT_NAME}
                  />
                ) : null
              }
            />
          ) : null}

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

          {/* Kanban board */}
          {isLoading ? (
            <BoardSkeleton />
          ) : hasSpecs ? (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
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
            <EmptyDemoState />
          )}
        </div>

        {/* Spec detail modal */}
        <AnimatePresence>
          {selectedSpec ? (
            <SpecDetailModal
              spec={selectedSpec}
              projectId={projectId}
              originRect={modalOriginRect}
              onClose={() => {
                setSelectedSpec(null);
                setModalOriginRect(null);
              }}
              onSpecUpdated={handleSpecUpdated}
              onSpecDeleted={handleSpecDeleted}
            />
          ) : null}
        </AnimatePresence>
      </>
    </DemoProjectLayout>
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
            <div className="h-2.5 w-20 animate-pulse rounded-[2px] bg-surface-container" />
            <div className="h-4 w-6 animate-pulse rounded-[2px] bg-surface-container" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1].map((r) => (
              <div
                key={r}
                className="h-20 animate-pulse rounded-[4px] bg-surface-container-lowest"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyDemoState() {
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
        Demo specs not yet seeded
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-on-surface-variant">
        The demo project is still being set up. Check back shortly.
      </p>
    </div>
  );
}

