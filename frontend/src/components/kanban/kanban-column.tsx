"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, useReducedMotion } from "framer-motion";

import { durations, easings } from "@/lib/motion";
import type { Spec, SpecStatus } from "@/types";

import SortableSpecCard from "./sortable-spec-card";

interface Props {
  index: number;
  status: SpecStatus;
  label: string;
  specs: Spec[];
  onCardClick?: (spec: Spec) => void;
  emptyState?: ReactNode;
  totalCount?: number;
  isFilterActive?: boolean;
  /** True when ANY card on the board is currently being dragged. Drives the
   *  "+" hint in empty columns and brightens the column body for legibility. */
  dragActive?: boolean;
}

export default function KanbanColumn({
  index,
  status,
  label,
  specs,
  onCardClick,
  emptyState,
  totalCount,
  isFilterActive,
  dragActive,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const paddedIndex = String(index).padStart(2, "0");
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  const isHiddenByFilter =
    specs.length === 0 &&
    typeof totalCount === "number" &&
    totalCount > 0;

  // Body background:
  //   - default: surface-container-low
  //   - hovered by drag: brighter surface-container
  //   - hidden by filter: dim
  const bodyBg = isOver
    ? "bg-surface-container"
    : "bg-surface-container-low";

  return (
    <section
      className={`relative flex min-h-[280px] flex-col rounded-[4px] transition-colors ${bodyBg}${
        isHiddenByFilter ? " opacity-40" : ""
      }`}
    >
      {/* Drop-zone top accent line — draws in left-to-right when isOver flips true */}
      {isOver && !prefersReducedMotion ? (
        <motion.div
          aria-hidden
          className="absolute left-1 right-1 top-0 h-[1px] origin-left bg-secondary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: durations.normal, ease: easings.standard }}
        />
      ) : isOver ? (
        <div
          aria-hidden
          className="absolute left-1 right-1 top-0 h-[1px] bg-secondary"
        />
      ) : null}

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
          <span className="font-mono font-medium text-on-surface">
            {specs.length}
          </span>
          {typeof totalCount === "number" && totalCount !== specs.length ? (
            <span className="ml-1 font-normal text-on-surface-variant/70">
              / {totalCount}
            </span>
          ) : null}
        </span>
      </header>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 px-2 pb-2">
        <SortableContext
          items={specs.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {specs.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-6">
              {isHiddenByFilter ? (
                <div className="px-2 py-3 text-center font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/70">
                  · {totalCount} hidden ·
                </div>
              ) : dragActive ? (
                <div className="flex h-full w-full items-center justify-center rounded-[2px] px-2 py-3 text-center font-mono text-[14px] font-light text-on-surface-variant/50">
                  +
                </div>
              ) : (
                emptyState ?? (
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/50">
                    Empty
                  </p>
                )
              )}
            </div>
          ) : (
            specs.map((spec) => (
              <SortableSpecCard
                key={spec.id}
                spec={spec}
                onClick={onCardClick}
                disabled={isFilterActive}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
