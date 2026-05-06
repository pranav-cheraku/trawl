// frontend/src/lib/use-mouse-position.ts
"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the pointer position relative to the viewport, in [-1, 1] range
 * on each axis. Center is 0,0. Returns 0,0 when the cursor leaves the window.
 *
 * Used for subtle parallax effects — multiply by a small pixel value (≤ 4px)
 * before applying to a transform.
 */
export function useMousePosition() {
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setPosition({ x, y });
    };
    const onLeave = () => setPosition({ x: 0, y: 0 });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return position;
}
