"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";

// Mounted only on the landing page; momentum scroll feels wrong inside
// the app (Kanban, chat, etc). Lenis does not instantiate for reduced-motion users.
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    let lenisInstance: { raf: (time: number) => void; destroy: () => void } | null = null;
    let raf = 0;
    let cancelled = false;

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenisInstance = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
      });

      const tick = (time: number) => {
        lenisInstance?.raf(time);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenisInstance?.destroy();
    };
  }, [prefersReducedMotion]);

  return <>{children}</>;
}
