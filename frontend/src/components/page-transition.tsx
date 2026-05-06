// frontend/src/components/page-transition.tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { durations, easings } from "@/lib/motion";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps app-route children with a cross-fade + small y-shift on path change.
 * Replaces the legacy `html.page-exit` opacity hack.
 *
 * Reduced-motion users: receive children unwrapped (zero animation).
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: durations.normal, ease: easings.standard }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
