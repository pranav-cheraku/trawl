"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { CountUp } from "@/components/landing/count-up";
import { springs, staggers } from "@/lib/motion";
import metadata from "../../../public/landing-fixtures/metadata.json";
import specs from "../../../public/landing-fixtures/specs.json";

const COLUMNS = [
  { key: "backlog", label: "BACKLOG" },
  { key: "planned", label: "PLANNED" },
  { key: "in_progress", label: "IN PROGRESS" },
  { key: "done", label: "DONE" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-error",
  high: "bg-secondary",
  medium: "bg-secondary/60",
  low: "bg-outline-variant",
};

const PRIORITY_FILL: Record<string, string> = {
  critical: "100%",
  high: "75%",
  medium: "50%",
  low: "25%",
};

export function MiniKanbanDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const prefersReducedMotion = useReducedMotion();

  return (
    <div ref={ref} className="rounded-[4px] bg-surface-container-lowest p-4">
      <div className="grid grid-cols-4 gap-2">
        {COLUMNS.map((col) => {
          const colSpecs = specs.filter((s) => s.status === col.key);
          return (
            <div key={col.key} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
                <span>{col.label}</span>
                <span>{colSpecs.length}</span>
              </div>
              <div className="flex min-h-[200px] flex-col gap-1.5 rounded-[2px] bg-surface-container-low p-1.5">
                {colSpecs.map((spec) => {
                  const overallIdx = specs.findIndex((s) => s.id === spec.id);
                  return (
                    <motion.div
                      key={spec.id}
                      initial={
                        prefersReducedMotion
                          ? false
                          : { opacity: 0, y: 12, scale: 0.96 }
                      }
                      animate={
                        inView
                          ? { opacity: 1, y: 0, scale: 1 }
                          : prefersReducedMotion
                          ? { opacity: 1, y: 0, scale: 1 }
                          : { opacity: 0, y: 12, scale: 0.96 }
                      }
                      transition={{
                        ...springs.bouncy,
                        delay: inView ? overallIdx * staggers.cards : 0,
                      }}
                      className="rounded-[2px] bg-surface-container-lowest p-2 text-[10px]"
                    >
                      <div
                        className={`mb-1 h-0.5 rounded-full ${PRIORITY_COLORS[spec.priority] ?? PRIORITY_COLORS.low}`}
                        style={{ width: PRIORITY_FILL[spec.priority] }}
                      />
                      <div className="line-clamp-2 leading-tight text-on-surface">
                        {spec.title}
                      </div>
                      <div className="mt-1 font-mono text-[9px] text-on-surface-variant">
                        F#{spec.citationCount}
                      </div>
                    </motion.div>
                  );
                })}
                {col.key === "done" && colSpecs.length === 0 && (
                  <div className="flex h-full items-center justify-center text-center font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60">
                    this column
                    <br />
                    is yours to fill
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end gap-6 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
        <span>
          <CountUp to={metadata.specCount} duration={1200} /> specs
        </span>
        <span>
          <CountUp to={metadata.citationCount} duration={1200} /> citations
        </span>
        <span>
          <CountUp to={metadata.themeCount} duration={1200} /> themes
        </span>
      </div>
    </div>
  );
}
