"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CONNECTORS, type ConnectorEntry } from "@/lib/connector-registry";
import ConnectorTile from "@/components/sources/connector-tile";
import { springs, durations, easings } from "@/lib/motion";

interface AddSourceModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSourceCreated: () => void;
}

type Step = "pick" | "form";

export default function AddSourceModal({
  projectId,
  isOpen,
  onClose,
  onSourceCreated,
}: AddSourceModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [selected, setSelected] = useState<ConnectorEntry | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    setStep("pick");
    setSelected(null);
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);

    const t = setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("keydown", handleKey);
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  function handleTileClick(entry: ConnectorEntry) {
    setSelected(entry);
    setStep("form");
  }

  function handleBack() {
    setStep("pick");
    setSelected(null);
  }

  function handleSourceCreated() {
    onSourceCreated();
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40"
        >
          <motion.div
            initial={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
            }
            animate={{ opacity: 1, scale: 1 }}
            exit={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.15 }
                : { ...springs.bouncy }
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-source-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-[4px] bg-surface-container-lowest/85 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-[12px]"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-3">
              <div>
                {step === "form" ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant transition-colors hover:text-on-surface"
                    aria-label="Back to source picker"
                  >
                    <span aria-hidden>←</span> Workspace / New Source
                  </button>
                ) : (
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                    Workspace / New Source
                  </p>
                )}
                <h2
                  id="add-source-title"
                  className="mt-1 text-[18px] font-semibold leading-tight text-on-surface"
                >
                  {step === "pick"
                    ? "Connect a source"
                    : `Connect ${selected?.label}`}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="rounded-[4px] p-1 text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
                aria-label="Close add-source modal"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-6">
              <AnimatePresence mode="wait" initial={false}>
                {step === "pick" ? (
                  <motion.div
                    key="pick"
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 4 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -4 }
                    }
                    transition={{
                      duration: durations.fast,
                      ease: easings.standard,
                    }}
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                  >
                    {CONNECTORS.map((entry) => (
                      <ConnectorTile
                        key={entry.type}
                        entry={entry}
                        onClick={() => handleTileClick(entry)}
                      />
                    ))}
                  </motion.div>
                ) : selected ? (
                  <motion.div
                    key="form"
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 4 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -4 }
                    }
                    transition={{
                      duration: durations.fast,
                      ease: easings.standard,
                    }}
                  >
                    <selected.FormComponent
                      projectId={projectId}
                      onSourceCreated={handleSourceCreated}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
