// frontend/src/components/landing/ask-demo-section.tsx
"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { ChunkGridDemo } from "@/components/landing/chunk-grid-demo";
import { ScrollCue } from "@/components/landing/scroll-cue";
import { durations, easings } from "@/lib/motion";

export function AskDemoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion || inView;

  return (
    <section
      id="ask"
      ref={ref}
      className="relative flex min-h-[90vh] scroll-mt-24 items-center bg-surface px-6 py-24 lg:px-12"
    >
      <div className="mx-auto grid w-full max-w-screen-2xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: durations.normal, ease: easings.standard }}
            className="font-mono text-xs uppercase tracking-[0.25em] text-secondary"
          >
            02 · ASK
          </motion.p>
          <motion.h2
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{
              duration: durations.slow,
              ease: easings.emphasis,
              delay: 0.1,
            }}
            className="mt-4 text-[2.5rem] font-bold leading-tight tracking-tight text-on-surface sm:text-[3.5rem] lg:text-[5rem]"
          >
            Ask, and see exactly{" "}
            <span className="text-secondary">where it&apos;s coming from.</span>
          </motion.h2>
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{
              duration: durations.normal,
              ease: easings.standard,
              delay: 0.25,
            }}
            className="mt-6 max-w-xl text-base text-on-surface-variant sm:text-lg"
          >
            Every answer is grounded in real reviews — with citations you can
            trace, scored by similarity, and ranked by relevance.
          </motion.p>
        </div>
        <div>
          <ChunkGridDemo />
        </div>
      </div>
      <ScrollCue nextId="build" />
    </section>
  );
}
