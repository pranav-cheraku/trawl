"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Spec, SpecStatus } from "@/types";
import SortableSpecCard from "./sortable-spec-card";

interface Props {
  /** Column index, 1-indexed, rendered as "01 / BACKLOG" label. */
  index: number;
  status: SpecStatus;
  label: string;
  specs: Spec[];
  onCardClick?: (spec: Spec) => void;
  /** Optional footer / empty-state slot. */
  emptyState?: ReactNode;
}

export default function KanbanColumn({
  index,
  status,
  label,
  specs,
  onCardClick,
  emptyState,
}: Props) {
  const paddedIndex = String(index).padStart(2, "0");

  // The droppable id is "col:<status>" so handleDragEnd in the page can
  // distinguish "dropped on a column" from "dropped on a specific card".
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  return (
    <section
      className={`flex min-h-[280px] flex-col rounded-[4px] transition-colors ${
        isOver
          ? "bg-surface-container"
          : "bg-surface-container-low"
      }`}
    >
      {/* Header — architectural label + count badge */}
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/60">
            {paddedIndex}
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface">
            {label}
          </span>
        </div>
        <span className="rounded-[2px] bg-surface-container-highest px-1.5 py-0.5 font-mono text-[10px] font-medium text-on-surface-variant">
          {specs.length}
        </span>
      </header>

      {/* Card list — grows with content; natural page scroll handles overflow */}
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 px-2 pb-2">
        <SortableContext
          items={specs.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {specs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-6">
              {emptyState ?? (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/50">
                  Empty
                </p>
              )}
            </div>
          ) : (
            specs.map((spec) => (
              <SortableSpecCard
                key={spec.id}
                spec={spec}
                onClick={onCardClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
