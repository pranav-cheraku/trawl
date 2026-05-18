"use client";
// Thin presenter for the Kanban board. Receives pre-bucketed specs per status
// and renders four KanbanColumns. DnD context lives in the parent page.
import type { Spec, SpecStatus } from "@/types";
import KanbanColumn from "./kanban-column";

interface Props {
  grouped: Record<SpecStatus, Spec[]>;
  onCardClick?: (spec: Spec, originRect?: DOMRect) => void;
  totalsByStatus?: Record<SpecStatus, number>;
  isFilterActive?: boolean;
  dragActive?: boolean;
  cascadeIds?: Set<string>;
}

const COLUMNS: { status: SpecStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "planned", label: "Planned" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

export default function KanbanBoard({
  grouped,
  onCardClick,
  totalsByStatus,
  isFilterActive,
  dragActive,
  cascadeIds,
}: Props) {
  return (
    <div
      className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
      role="list"
      aria-label="Kanban board"
    >
      {COLUMNS.map(({ status, label }, idx) => (
        <KanbanColumn
          key={status}
          index={idx + 1}
          status={status}
          label={label}
          specs={grouped[status]}
          onCardClick={onCardClick}
          totalCount={totalsByStatus?.[status]}
          isFilterActive={isFilterActive}
          dragActive={dragActive}
          cascadeIds={cascadeIds}
        />
      ))}
    </div>
  );
}
