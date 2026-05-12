"use client";

import { useEffect, useRef } from "react";

import type { BuildReportSpec, BuildTheme } from "@/types";

type Props = {
  spec: BuildReportSpec;
  theme: BuildTheme | null;
  projectId: string;
  onClose: () => void;
  onPromote: () => void;
  isPromoting: boolean;
};

export default function BuildSpecDetailModal({
  spec,
  theme,
  projectId,
  onClose,
  onPromote,
  isPromoting,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const c = spec.content;
  const problem = (c.problem as string | undefined) ?? "";
  const solution = (c.proposed_solution as string | undefined) ?? "";
  const stories = (c.user_stories as string[] | undefined) ?? [];
  const criteria = (c.acceptance_criteria as string[] | undefined) ?? [];
  const priority = String(c.priority ?? "medium").toUpperCase();
  const supportingRaw = (c.supporting_feedback_indices ?? []) as unknown[];
  const citations = Array.isArray(supportingRaw)
    ? supportingRaw.filter(
        (n): n is number =>
          typeof n === "number" && Number.isInteger(n) && n >= 1,
      )
    : [];

  const isPromoted = spec.promotedSpecId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-stretch">
      <button
        type="button"
        tabIndex={-1}
        onClick={onClose}
        aria-label="Close detail panel"
        className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="build-spec-modal-title"
        className="relative m-auto flex max-h-[90vh] w-[min(960px,calc(100vw-2rem))] flex-col rounded-[4px] bg-surface-container-lowest"
      >
        <header className="px-6 py-4 shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="order-2 min-w-0 flex-1 sm:order-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                Workspace / Spec · #{spec.id.slice(0, 4)}
              </p>
              <h2
                id="build-spec-modal-title"
                className="mt-2 text-[18px] font-semibold tracking-tight text-on-surface"
              >
                {spec.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                <span>B{spec.buildRank}</span>
                <span>· {priority}</span>
                {theme ? <span>· theme · {theme.name}</span> : null}
                <span>· {citations.length} citations</span>
              </div>
            </div>
            <div className="order-1 flex items-center justify-end gap-3 sm:order-2">
              {isPromoted ? (
                <a
                  href={`/project/${projectId}/specs`}
                  className="rounded-[4px] bg-surface-container px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary"
                >
                  ✓ View on Kanban
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onPromote}
                  disabled={isPromoting}
                  className="rounded-[4px] bg-on-surface px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-surface-container-lowest hover:bg-secondary disabled:opacity-60"
                >
                  {isPromoting ? "Adding…" : "+ Add to Kanban"}
                </button>
              )}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close spec detail"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[4px] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Section label="Problem" body={problem} />
          <Section label="Proposed Solution" body={solution} />
          <ListSection label="User Stories" items={stories} />
          <ListSection label="Acceptance Criteria" items={criteria} />
        </div>
      </div>
    </div>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  if (!body) return null;
  return (
    <section className="mb-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-on-surface">
        {body}
      </p>
    </section>
  );
}

function ListSection({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-[13px] leading-relaxed text-on-surface">
            • {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
