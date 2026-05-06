// frontend/src/lib/motion.ts
import type { Transition } from "framer-motion";

/**
 * Shared motion tokens. Every animated component pulls from these — coherence
 * across pages comes from one vocabulary, not duplicated values.
 *
 * Spring tunings:
 *   bouncy  — playful overshoot (drag lifts, modal entrance)
 *   snappy  — minimal overshoot (chip toggle, status pill)
 *   gentle  — no overshoot (layout transitions)
 */
export const springs = {
  bouncy: {
    type: "spring",
    stiffness: 380,
    damping: 18,
    mass: 0.7,
  } as const satisfies Transition,
  snappy: {
    type: "spring",
    stiffness: 520,
    damping: 36,
    mass: 0.6,
  } as const satisfies Transition,
  gentle: {
    type: "spring",
    stiffness: 220,
    damping: 32,
    mass: 0.9,
  } as const satisfies Transition,
} as const;

/** Material-style cubic-bezier curves. */
export const easings = {
  /** [0.4, 0, 0.2, 1] — default for fades and translations. */
  standard: [0.4, 0, 0.2, 1],
  /** [0.2, 0, 0, 1] — entrance animations that should "settle". */
  emphasis: [0.2, 0, 0, 1],
} as const;

/** Canonical durations in seconds (framer-motion native unit). */
export const durations = {
  fast: 0.16,
  normal: 0.24,
  slow: 0.48,
} as const;

/** Canonical stagger gaps in seconds. */
export const staggers = {
  list: 0.06,
  cards: 0.08,
} as const;
