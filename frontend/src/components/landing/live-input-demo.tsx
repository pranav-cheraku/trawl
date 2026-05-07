// frontend/src/components/landing/live-input-demo.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { springs, staggers } from "@/lib/motion";
import reviews from "../../../public/landing-fixtures/reviews.json";

const TYPED_STRING = "Spotify";
const TYPE_INTERVAL_MS = 80;
const REVIEWS_TO_SHOW = 5;
const LOOP_INTERVAL_MS = 12_000;

type Phase = "typing" | "streaming" | "settled" | "resetting";

/**
 * Hero's live demo: types "Spotify" character by character, then flies in five
 * stacked review cards from the right. Loops every 12 seconds, but pauses while
 * offscreen and runs once on initial mount.
 */
export function LiveInputDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [typed, setTyped] = useState(prefersReducedMotion ? TYPED_STRING : "");
  const [phase, setPhase] = useState<Phase>(
    prefersReducedMotion ? "settled" : "typing",
  );

  // Type the string character by character.
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (phase !== "typing") return;
    if (typed.length === TYPED_STRING.length) {
      setPhase("streaming");
      return;
    }
    const t = setTimeout(() => {
      setTyped(TYPED_STRING.slice(0, typed.length + 1));
    }, TYPE_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [typed, phase, prefersReducedMotion]);

  // After streaming ends, hold for a beat, then loop.
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (phase !== "streaming") return;
    const t = setTimeout(() => setPhase("settled"), 2_000);
    return () => clearTimeout(t);
  }, [phase, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (phase !== "settled") return;
    const t = setTimeout(() => setPhase("resetting"), LOOP_INTERVAL_MS - 4_000);
    return () => clearTimeout(t);
  }, [phase, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (phase !== "resetting") return;
    const t = setTimeout(() => {
      setTyped("");
      setPhase("typing");
    }, 600);
    return () => clearTimeout(t);
  }, [phase, prefersReducedMotion]);

  const showCards =
    phase === "streaming" || phase === "settled" || phase === "resetting";

  return (
    <div
      className="relative w-full max-w-xl"
      role="img"
      aria-label="Demo: typing an app name and streaming reviews"
    >
      <div className="rounded-[4px] bg-surface-container-lowest px-6 py-5 font-mono text-lg">
        <span className="text-on-surface-variant">app:</span>{" "}
        <span>{typed}</span>
        <motion.span
          className="ml-0.5 inline-block w-[3px] bg-on-surface align-middle"
          style={{ height: "1em" }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {reviews.slice(0, REVIEWS_TO_SHOW).map((review, idx) => (
          <motion.div
            key={review.id}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 80 }}
            animate={
              showCards
                ? { opacity: 1, x: 0 }
                : prefersReducedMotion
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: 80 }
            }
            transition={{
              ...springs.gentle,
              delay: showCards ? idx * staggers.list : 0,
            }}
            className="rounded-[4px] bg-surface-container-lowest px-5 py-3.5 text-sm"
            style={{ marginLeft: idx * 6 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                {"★".repeat(review.rating)}
                <span className="text-outline-variant">
                  {"★".repeat(5 - review.rating)}
                </span>
              </span>
              <span className="font-mono text-[11px] text-on-surface-variant">
                {review.date}
              </span>
            </div>
            <div className="mt-1.5 line-clamp-1 text-on-surface">
              {review.title}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
