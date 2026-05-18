"use client";
// Computes a viewport-clamped fixed position for popovers >~120px wide.
// CSS absolute positioning falls off mobile viewports; this hook recomputes
// on window resize and capture-phase scroll so the popover stays on screen.

import { useEffect, useState, type RefObject } from "react";

export interface FloatingPosition {
  top: number;
  left: number;
  width: number;
}

interface UseFloatingPositionOptions {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement>;
  preferredWidth: number;
  gap?: number;
  margin?: number;
}

/**
 * Returns viewport-clamped fixed-position coordinates for a popover that
 * floats below a trigger. CSS absolute positioning falls off mobile viewports
 * when the trigger is near an edge; this hook keeps the popover within the
 * safe area. Recomputes on resize and capture-phase scroll.
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
