// frontend/src/components/landing/hero-section.tsx
"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";

import { CountUp } from "@/components/landing/count-up";
import { LiveInputDemo } from "@/components/landing/live-input-demo";
import { useMousePosition } from "@/lib/use-mouse-position";
import { durations, easings } from "@/lib/motion";

const PARALLAX_MAX_PX = 4;
const CTA_CLASSES =
  "inline-flex items-center gap-2 rounded-[4px] bg-on-surface px-6 py-3 text-sm font-semibold text-surface-container-lowest transition-colors hover:bg-secondary";

interface HeroSectionProps {
  session: Session | null;
}

export default function HeroSection({ session }: HeroSectionProps) {
  const { x, y } = useMousePosition();
  const prefersReducedMotion = useReducedMotion();

  const parallaxX = prefersReducedMotion ? 0 : x * PARALLAX_MAX_PX;
  const parallaxY = prefersReducedMotion ? 0 : y * PARALLAX_MAX_PX;

  return (
    <section className="relative isolate min-h-[90vh] overflow-hidden bg-surface px-6 py-16 lg:px-12">
      {/* Blueprint grid backdrop with capped parallax */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          x: parallaxX,
          y: parallaxY,
        }}
      />

      {/* Top-right live indexed badge */}
      <div className="absolute right-6 top-6 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant lg:block">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-secondary align-middle" />
        LIVE ·{" "}
        <CountUp
          to={8432}
          from={8000}
          duration={1200}
          format={(n) => n.toLocaleString()}
        />{" "}
        reviews indexed today
      </div>

      <div className="mx-auto grid max-w-screen-2xl items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-20">
        {/* Headline column */}
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.normal, ease: easings.standard }}
            className="font-mono text-xs uppercase tracking-[0.25em] text-secondary"
          >
            TRAWL · v1
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durations.slow,
              ease: easings.emphasis,
              delay: 0.1,
            }}
            className="mt-4 text-[3rem] font-bold leading-[0.95] tracking-tight text-on-surface sm:text-[4.5rem] lg:text-[7rem]"
          >
            From 500 reviews
            <br />
            to a roadmap.
            <br />
            <span className="text-secondary">In 60 seconds.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durations.normal,
              ease: easings.standard,
              delay: 0.25,
            }}
            className="mt-6 max-w-xl text-base text-on-surface-variant sm:text-lg"
          >
            Type an app name. Trawl pulls every review, clusters them into
            themes, and builds a prioritized product roadmap with citations
            you can trace.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durations.normal,
              ease: easings.standard,
              delay: 0.35,
            }}
            className="mt-10"
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
                Try it free
                <span aria-hidden>→</span>
              </button>
            )}
          </motion.div>
        </div>

        {/* Demo column */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: durations.slow,
            ease: easings.emphasis,
            delay: 0.4,
          }}
          className="hidden lg:block"
        >
          <LiveInputDemo />
        </motion.div>
      </div>
    </section>
  );
}
