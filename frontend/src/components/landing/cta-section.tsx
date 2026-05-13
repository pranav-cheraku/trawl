"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Session } from "next-auth";
import { signIn } from "next-auth/react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { durations, easings } from "@/lib/motion";

const CTA_CLASSES =
  "inline-flex items-center gap-2 rounded-[4px] bg-on-surface px-8 py-4 text-base font-semibold text-surface-container-lowest transition-colors hover:bg-secondary";

interface CtaSectionProps {
  session: Session | null;
}

export function CtaSection({ session }: CtaSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion || inView;

  return (
    <section
      id="cta"
      ref={ref}
      className="relative flex min-h-[80vh] scroll-mt-24 items-center justify-center bg-surface px-6 py-32 lg:px-12"
    >
      <div className="mx-auto max-w-4xl text-center">
        <motion.h2
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: durations.slow, ease: easings.emphasis }}
          className="text-[3rem] font-bold leading-tight tracking-tight text-on-surface sm:text-[4.5rem] lg:text-[6rem]"
        >
          Stop reading reviews.
          <br />
          <span className="text-secondary">Start shipping.</span>
        </motion.h2>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{
            duration: durations.normal,
            ease: easings.standard,
            delay: 0.2,
          }}
          className="mt-12"
        >
          {session ? (
            <Link href="/dashboard" className={CTA_CLASSES}>
              Open dashboard
              <span aria-hidden>→</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className={CTA_CLASSES}
            >
              Try Trawl free
              <span aria-hidden>→</span>
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
}
