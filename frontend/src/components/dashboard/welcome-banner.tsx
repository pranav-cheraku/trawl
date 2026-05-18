"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useUserMe } from "@/lib/use-user-me";
import { parseUtcIso } from "@/lib/time";
import { durations, easings } from "@/lib/motion";

// Accounts created within this window count as "new" and see the banner once.
const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Credit costs mirror the require_credits() values on the backend endpoints.
const CREDIT_COSTS = [
  { label: "Chat", cost: 1 },
  { label: "Specs", cost: 5 },
  { label: "Build Next", cost: 10 },
];

function dismissKey(userId: string): string {
  return `trawl:welcome-dismissed:${userId}`;
}

export default function WelcomeBanner() {
  const { user } = useUserMe();
  const prefersReducedMotion = useReducedMotion();
  // Start hidden so the banner never flashes before the new-account check runs.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;
    const ageMs = Date.now() - parseUtcIso(user.createdAt).getTime();
    if (ageMs >= NEW_ACCOUNT_WINDOW_MS) {
      setDismissed(true);
      return;
    }
    setDismissed(localStorage.getItem(dismissKey(user.id)) === "1");
  }, [user]);

  function handleDismiss() {
    if (user) localStorage.setItem(dismissKey(user.id), "1");
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      {!dismissed && user ? (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -8, transition: { duration: durations.fast } }
          }
          transition={{ duration: durations.normal, ease: easings.standard }}
          className="mt-4 flex flex-col gap-4 rounded-[4px] bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[14px] text-on-surface">
              Welcome to Trawl. Your account starts with{" "}
              <span className="font-mono font-medium text-secondary-dim">
                25
              </span>{" "}
              free credits.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CREDIT_COSTS.map(({ label, cost }) => (
                <span
                  key={label}
                  className="rounded-[2px] bg-surface-container-highest px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant"
                >
                  {label}{" "}
                  <span className="text-on-surface">{cost}</span>
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 self-start rounded-[4px] border border-outline/30 px-4 py-2 text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-container sm:self-auto"
          >
            Got it
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
