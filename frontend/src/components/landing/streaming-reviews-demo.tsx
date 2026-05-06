"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { springs, staggers } from "@/lib/motion";
import reviews from "../../../public/landing-fixtures/reviews.json";

/**
 * Connect-section demo: rows of reviews stream in vertically when the section
 * is half-visible. Each row enters from y+8 with opacity fade, 60ms stagger.
 * Re-entries replay the animation.
 */
export function StreamingReviewsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      ref={ref}
      className="rounded-[4px] bg-surface-container-lowest p-4"
      role="img"
      aria-label="Demo: 12 reviews streaming in vertically"
    >
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
        <span>iTunes RSS · poll</span>
        <span>500 records · indexed</span>
      </div>
      <div className="flex max-h-[420px] flex-col gap-1.5 overflow-hidden">
        {reviews.map((review, idx) => (
          <motion.div
            key={review.id}
            initial={
              prefersReducedMotion ? false : { opacity: 0, y: 8 }
            }
            animate={
              inView
                ? { opacity: 1, y: 0 }
                : prefersReducedMotion
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 8 }
            }
            transition={{
              ...springs.gentle,
              delay: inView ? idx * staggers.list : 0,
            }}
            className="rounded-[2px] bg-surface-container-low px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.1em] text-secondary">
                {"★".repeat(review.rating)}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {review.date}
              </span>
            </div>
            <div className="mt-1 line-clamp-1 text-on-surface">
              {review.snippet}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
