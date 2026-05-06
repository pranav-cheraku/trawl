"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  /** Final value to count up to. */
  to: number;
  /** Starting value. Defaults to 0. */
  from?: number;
  /** Duration in milliseconds. Defaults to 800. */
  duration?: number;
  /** Optional delay before counting begins, in ms. */
  delay?: number;
  /** Format the rendered value (e.g. add commas). Defaults to `String`. */
  format?: (value: number) => string;
  /** Class for the rendering span. */
  className?: string;
}

/**
 * Animates a number from `from` to `to` when scrolled into view, with an
 * ease-out cubic curve over `duration` ms. Reduced-motion users jump straight
 * to the final value. Designed for integer counters — the rendered value is
 * rounded each frame; `format` is applied to the rounded integer.
 */
export function CountUp({
  to,
  from = 0,
  duration = 800,
  delay = 0,
  format = String,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      setValue(to);
      return;
    }

    let frame = 0;
    let start: number | null = null;

    const step = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start - delay;
      if (elapsed < 0) {
        frame = requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic for a natural settle
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setValue(to);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, prefersReducedMotion, from, to, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {format(Math.round(value))}
    </span>
  );
}
