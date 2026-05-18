"use client";
// Landing hero section with the primary CTA. Renders "Start for free" (triggers
// Google sign-in) for logged-out visitors and "Go to dashboard" for signed-in users.

import Link from "next/link";
import type { Session } from "next-auth";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";

import { LiveInputDemo } from "@/components/landing/live-input-demo";
import { ScrollCue } from "@/components/landing/scroll-cue";
import { useMousePosition } from "@/lib/use-mouse-position";
import { durations, easings } from "@/lib/motion";

const PARALLAX_MAX_PX = 4;
const CTA_CLASSES =
  "inline-flex items-center gap-2 rounded-[4px] bg-on-surface px-6 py-3 text-sm font-semibold text-surface-container-lowest transition-colors hover:bg-secondary";

const SECTION_ANCHORS = [
  { id: "connect", num: "01", label: "CONNECT" },
  { id: "ask", num: "02", label: "ASK" },
  { id: "build", num: "03", label: "BUILD" },
] as const;

function scrollToAnchor(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface HeroSectionProps {
  session: Session | null;
}

export default function HeroSection({ session }: HeroSectionProps) {
  const { x, y } = useMousePosition();
  const prefersReducedMotion = useReducedMotion();

  const parallaxX = prefersReducedMotion ? 0 : x * PARALLAX_MAX_PX;
  const parallaxY = prefersReducedMotion ? 0 : y * PARALLAX_MAX_PX;

  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden bg-surface px-6 py-16 lg:px-12">
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

      <div className="mx-auto grid w-full max-w-screen-2xl items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-20">
        <div className="max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durations.slow,
              ease: easings.emphasis,
              delay: 0.1,
            }}
            className="text-[3rem] font-bold leading-[0.95] tracking-tight text-on-surface sm:text-[4.5rem] lg:text-[7rem]"
          >
            From 500 reviews
            <br />
            to a roadmap.
            <br />
            <span className="text-secondary">In minutes.</span>
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
            Type an app name and Trawl reads all of its reviews. You get back
            a prioritized roadmap, and every item on it traces to a real
            review.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durations.normal,
              ease: easings.standard,
              delay: 0.35,
            }}
            className="mt-6"
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
          {!session && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: durations.normal,
                ease: easings.standard,
                delay: 0.4,
              }}
              className="mt-3 text-[13px] text-on-surface-variant"
            >
              Start with <span className="font-mono text-on-surface">25</span>{" "}
              free credits. No card required.
            </motion.p>
          )}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durations.normal,
              ease: easings.standard,
              delay: 0.45,
            }}
            className="mt-5 font-mono text-[13px] uppercase tracking-[0.22em] text-secondary"
          >
            RAG · CITATIONS TRACED TO SOURCE · NO HALLUCINATION
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: durations.slow,
            ease: easings.emphasis,
            delay: 0.4,
          }}
          className="hidden lg:mr-16 lg:block"
        >
          <motion.nav
            aria-label="Jump to section"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: durations.normal,
              ease: easings.standard,
              delay: 0.6,
            }}
            className="mb-12 -mt-10"
          >
            <ul className="flex items-center justify-end gap-3">
              {SECTION_ANCHORS.map((anchor) => (
                <li key={anchor.id}>
                  <a
                    href={`#${anchor.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToAnchor(anchor.id);
                    }}
                    className="group inline-flex cursor-pointer items-baseline gap-2.5 rounded-[4px] px-3 py-2 transition-colors hover:bg-secondary/10"
                  >
                    <span className="font-mono text-[18px] font-semibold leading-none text-secondary underline decoration-secondary/30 decoration-[1.5px] underline-offset-[5px] transition-colors group-hover:text-secondary-dim group-hover:decoration-secondary-dim">
                      {anchor.num}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary transition-colors group-hover:text-secondary-dim">
                      {anchor.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.nav>

          <LiveInputDemo />
        </motion.div>
      </div>

      <ScrollCue nextId="connect" hideAfterScrollY={80} delay={0.9} />
    </section>
  );
}
