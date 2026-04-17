"use client";

import { useMemo } from "react";
import type { Spec, SpecStatus } from "@/types";
import KanbanColumn from "./kanban-column";

interface Props {
  specs: Spec[];
  onCardClick?: (spec: Spec) => void;
}

const COLUMNS: { status: SpecStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "planned", label: "Planned" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

function compareSpecs(a: Spec, b: Spec): number {
  if (a.kanbanOrder !== b.kanbanOrder) return a.kanbanOrder - b.kanbanOrder;
  return a.createdAt.localeCompare(b.createdAt);
}

export default function KanbanBoard({ specs, onCardClick }: Props) {
  const grouped = useMemo(() => {
    const buckets: Record<SpecStatus, Spec[]> = {
      backlog: [],
      planned: [],
      in_progress: [],
      done: [],
    };
    for (const spec of specs) {
      const bucket = buckets[spec.status as SpecStatus];
      if (bucket) bucket.push(spec);
      else buckets.backlog.push(spec);
    }
    for (const key of Object.keys(buckets) as SpecStatus[]) {
      buckets[key].sort(compareSpecs);
    }
    return buckets;
  }, [specs]);

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
        />
      ))}
    </div>
  );
}
