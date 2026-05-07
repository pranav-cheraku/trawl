// frontend/src/components/kanban/sortable-spec-card.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";

import { springs, staggers } from "@/lib/motion";
import type { Spec } from "@/types";

import SpecCard from "./spec-card";

interface Props {
  spec: Spec;
  onClick?: (spec: Spec, originRect?: DOMRect) => void;
  disabled?: boolean;
  /** When set (a non-negative integer), the card animates in with a staggered
   *  delay computed as `cascadeFromIndex * staggers.cards` seconds. Used by
   *  the parent to flag newly-generated specs (post `generateSpecs` poll). */
  cascadeFromIndex?: number;
}

const TILT_DEGREES = 1.5;
const TILT_SCALE_MAX_PX = 80;

export default function SortableSpecCard({
  spec,
  onClick,
  disabled,
  cascadeFromIndex,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spec.id, disabled });

  const dy = transform?.y ?? 0;
  const tiltDeg = isDragging
    ? -Math.max(-1, Math.min(1, dy / TILT_SCALE_MAX_PX)) * TILT_DEGREES
    : 0;

  const dndTransform = CSS.Transform.toString(transform);
  const visualTransform =
    isDragging && !prefersReducedMotion
      ? `translateY(-4px) scale(1.02) rotate(${tiltDeg}deg)`
      : "";
  const composedTransform = [dndTransform, visualTransform]
    .filter(Boolean)
    .join(" ");

  const style: React.CSSProperties = {
    transform: composedTransform || undefined,
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" : undefined,
    transformOrigin: "center center",
  };

  const isCascading = typeof cascadeFromIndex === "number";
  const cascadeDelay = isCascading
    ? (cascadeFromIndex ?? 0) * staggers.cards
    : 0;

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={
        prefersReducedMotion
          ? false
          : isCascading
          ? { opacity: 0, y: 12, scale: 0.96 }
          : undefined
      }
      animate={
        isCascading
          ? { opacity: 1, y: 0, scale: 1 }
          : undefined
      }
      transition={
        isCascading
          ? { ...springs.bouncy, delay: cascadeDelay }
          : { ...springs.gentle }
      }
      style={style}
      {...attributes}
      {...listeners}
      className={
        disabled ? undefined : isDragging ? "cursor-grabbing" : "cursor-grab"
      }
    >
      <SpecCard spec={spec} onClick={onClick} isDragging={isDragging} />
    </motion.div>
  );
}
