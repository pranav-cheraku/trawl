"use client";

import { useEffect, useState, type RefObject } from "react";

export interface FloatingPosition {
  top: number;
  left: number;
  width: number;
}

interface UseFloatingPositionOptions {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement>;
  /** Preferred popover width in px. Will be reduced if the viewport is too
   *  narrow, never exceeded. */
  preferredWidth: number;
  /** Vertical gap between the trigger's bottom edge and the popover top. */
  gap?: number;
  /** Horizontal viewport margin to keep around the popover. */
  margin?: number;
}

/**
 * Compute viewport-anchored fixed-positioning coordinates for a popover that
 * floats below a trigger button. Clamps the left coordinate so the popover
 * never overflows past the left or right viewport edge — critical on mobile
 * where the trigger is often nowhere near the viewport edge.
 *
 * Recomputes on resize and scroll while the popover is open; returns null
 * while closed.
 */
export function useFloatingPosition({
  isOpen,
  triggerRef,
  preferredWidth,
  gap = 6,
  margin = 16,
}: UseFloatingPositionOptions): FloatingPosition | null {
  const [position, setPosition] = useState<FloatingPosition | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    function compute() {
      const trigger = triggerRef.current;
      if (!trigger || typeof window === "undefined") return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(preferredWidth, window.innerWidth - margin * 2);
      const maxLeft = window.innerWidth - width - margin;
      const left = Math.max(margin, Math.min(rect.left, maxLeft));
      const top = rect.bottom + gap;
      setPosition({ top, left, width });
    }
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [isOpen, triggerRef, preferredWidth, gap, margin]);

  return position;
}
