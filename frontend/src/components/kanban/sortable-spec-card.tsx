"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";

import { springs } from "@/lib/motion";
import type { Spec } from "@/types";

import SpecCard from "./spec-card";

interface Props {
  spec: Spec;
  onClick?: (spec: Spec) => void;
  disabled?: boolean;
}

const TILT_DEGREES = 1.5;
const TILT_SCALE_MAX_PX = 80; // tilt is at full ±TILT_DEGREES once vertical drag delta exceeds this

export default function SortableSpecCard({ spec, onClick, disabled }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spec.id, disabled });

  // Compute tilt from vertical drag delta.
  // -y means dragging up — tilt forward (negative degrees).
  const dy = transform?.y ?? 0;
  const tiltDeg = isDragging
    ? -Math.max(-1, Math.min(1, dy / TILT_SCALE_MAX_PX)) * TILT_DEGREES
    : 0;

  // Compose transform: dnd-kit's translate + our visual lift + scale + tilt.
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

  return (
    <motion.div
      ref={setNodeRef}
      layout
      transition={{ ...springs.gentle }}
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
