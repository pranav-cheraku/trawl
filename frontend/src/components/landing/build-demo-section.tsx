"use client";
// Landing "Build" section: static illustration of the Kanban board output
// from a Build Next run. Scroll-triggered entrance animation.

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { MiniKanbanDemo } from "@/components/landing/mini-kanban-demo";
import { ScrollCue } from "@/components/landing/scroll-cue";
import { durations, easings } from "@/lib/motion";

export function BuildDemoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion || inView;

  return (
    <section
      id="build"
      ref={ref}
      className="relative flex min-h-[90vh] scroll-mt-24 items-center bg-surface-container-lowest px-6 py-24 lg:px-12"
    >
      <div className="mx-auto w-full max-w-screen-2xl">
        <div>
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: durations.normal, ease: easings.standard }}
            className="font-mono text-xs uppercase tracking-[0.25em] text-secondary"
          >
            03 · BUILD
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
            And then it{" "}
            <span className="text-secondary">builds the roadmap.</span>
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
            Specs come grouped by theme and prioritized, ready to drag
            straight into your sprint. Each one links back to the reviews that
            asked for it.
          </motion.p>
        </div>

        <div className="mt-12">
          <MiniKanbanDemo />
        </div>
      </div>
      <ScrollCue nextId="cta" />
    </section>
  );
}
