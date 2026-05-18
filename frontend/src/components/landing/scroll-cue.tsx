"use client";
// Animated scroll-down chevron below the hero. Fades out once the user scrolls
// past the hero section.

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { durations, easings } from "@/lib/motion";

interface ScrollCueProps {
  nextId: string;
  hideAfterScrollY?: number;
  delay?: number;
}

function scrollToAnchor(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ScrollCue({
  nextId,
  hideAfterScrollY,
  delay = 0.5,
}: ScrollCueProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (hideAfterScrollY === undefined) return;
    const onScroll = () => setHidden(window.scrollY > hideAfterScrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hideAfterScrollY]);

  return (
    <motion.button
      type="button"
      onClick={() => scrollToAnchor(nextId)}
      aria-label="Scroll to next section"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: hidden ? 0 : 1, y: 0 }}
      transition={{
        duration: durations.normal,
        ease: easings.standard,
        delay: prefersReducedMotion ? 0 : delay,
      }}
      style={{ pointerEvents: hidden ? "none" : "auto" }}
      className="group absolute inset-x-0 bottom-6 mx-auto flex w-max flex-col items-center gap-1.5"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface-variant transition-colors group-hover:text-secondary">
        SCROLL
      </span>
      <motion.span
        aria-hidden
        animate={prefersReducedMotion ? undefined : { y: [0, 4, 0] }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
        }
        className="text-[14px] leading-none text-on-surface-variant transition-colors group-hover:text-secondary"
      >
        ↓
      </motion.span>
    </motion.button>
  );
}
