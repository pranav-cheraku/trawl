"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Spec } from "@/types";
import SpecCard from "./spec-card";

interface Props {
  spec: Spec;
  onClick?: (spec: Spec) => void;
  disabled?: boolean;
}

export default function SortableSpecCard({ spec, onClick, disabled }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spec.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Raise z-index while dragging so the ghost floats above siblings.
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      // Suppress pointer-events on the wrapper while dragging so the inner
      // button's onClick doesn't fire at drag-end.
      className={disabled ? undefined : isDragging ? "cursor-grabbing" : "cursor-grab"}
    >
      <SpecCard spec={spec} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}
