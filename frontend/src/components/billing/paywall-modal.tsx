"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import { durations, easings } from "@/lib/motion";

export function PaywallModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    const onPaywall = (e: Event) => {
      const ce = e as CustomEvent<{ detail?: string }>;
      setDetail(ce.detail?.detail ?? "You're out of credits.");
      setOpen(true);
    };
    window.addEventListener("trawl:paywall", onPaywall);
    return () => window.removeEventListener("trawl:paywall", onPaywall);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: durations.fast } }}
          transition={{ duration: durations.normal, ease: easings.standard }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0, transition: { duration: durations.fast } }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[4px] bg-surface-container-lowest p-6 ring-1 ring-outline-variant/30"
          >
            <h2 className="text-lg font-semibold text-on-surface">Out of credits</h2>
            <p className="mt-2 text-sm text-on-surface-variant">{detail}</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Buy more credits to keep using AI features.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-[4px] border border-outline/30 px-3 py-1.5 text-sm text-on-surface transition-colors hover:bg-surface-container"
              >
                Not now
              </button>
              <Link
                href="/billing"
                onClick={() => setOpen(false)}
                className="rounded-[4px] bg-on-surface px-3 py-1.5 text-sm text-white transition-colors hover:bg-secondary"
              >
                Buy credits
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
