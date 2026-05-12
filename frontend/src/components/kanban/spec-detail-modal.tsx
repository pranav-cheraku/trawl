"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { durations, easings, springs } from "@/lib/motion";

import EditableText from "@/components/kanban/editable-text";
import EditableTextArea from "@/components/kanban/editable-textarea";
import EditableList from "@/components/kanban/editable-list";
import PriorityPills from "@/components/kanban/priority-pills";
import StatusPills from "@/components/kanban/status-pills";
import CitationChips from "@/components/kanban/citation-chips";
import { XrayPanel } from "@/components/rag-xray/xray-panel";
import InlineConfirm from "@/components/ui/inline-confirm";
import { deleteSpec, getSpecSources, updateSpec } from "@/lib/api";
import type {
  Spec,
  SpecPriority,
  SpecSources,
  SpecStatus,
} from "@/types";

interface SpecDetailModalProps {
  spec: Spec;
  projectId: string;
  originRect?: DOMRect | null;
  onClose: () => void;
  onSpecUpdated: (next: Spec) => void;
  onSpecDeleted: (specId: string) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SpecDetailModal({
  spec,
  projectId,
  originRect,
  onClose,
  onSpecUpdated,
  onSpecDeleted,
}: SpecDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const fromTransform = useMemo(() => {
    if (!originRect || prefersReducedMotion) return null;
    if (typeof window === "undefined") return null;
    const targetCenterX = window.innerWidth / 2;
    const targetCenterY = window.innerHeight / 2;
    const fromCenterX = originRect.left + originRect.width / 2;
    const fromCenterY = originRect.top + originRect.height / 2;
    const modalWidth = Math.min(window.innerWidth * 0.95, 1100);
    const modalHeight = window.innerHeight * 0.9;
    const cardScaleX = originRect.width / modalWidth;
    const cardScaleY = originRect.height / modalHeight;
    return {
      x: fromCenterX - targetCenterX,
      y: fromCenterY - targetCenterY,
      scaleX: cardScaleX,
      scaleY: cardScaleY,
    };
  }, [originRect, prefersReducedMotion]);

  const [specSources, setSpecSources] = useState<SpecSources | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [focusedChunkId, setFocusedChunkId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Move focus to the close button on mount so keyboard users can navigate.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Fetch spec sources.
  useEffect(() => {
    let cancelled = false;
    setSpecSources(null);
    setSourcesError(null);
    getSpecSources(spec.id)
      .then((s) => {
        if (!cancelled) setSpecSources(s);
      })
      .catch(() => {
        if (!cancelled)
          setSourcesError("Couldn't load sources for this spec.");
      });
    return () => {
      cancelled = true;
    };
  }, [spec.id]);

  const focusChunkAtIndex = useCallback(
    (idx: number) => {
      const chunks = specSources?.retrievedChunks ?? [];
      const chunk = chunks[idx - 1];
      if (!chunk) return;
      setFocusedChunkId(chunk.chunkId);
      setFocusTick((n) => n + 1);
    },
    [specSources],
  );

  // ── Save helpers ────────────────────────────────────────────────────
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const saveField = useCallback(
    async (patch: Parameters<typeof updateSpec>[1]) => {
      setSaveState("saving");
      try {
        const updated = await updateSpec(spec.id, patch);
        onSpecUpdated(updated);
        setEditError(null);
        setSaveState("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
      } catch (err) {
        setSaveState("error");
        setEditError(
          err instanceof Error ? err.message : "Failed to save change.",
        );
        throw err;
      }
    },
    [spec.id, onSpecUpdated],
  );

  const saveTitle = useCallback(
    (next: string) => saveField({ title: next }),
    [saveField],
  );
  const savePriority = useCallback(
    (next: SpecPriority) => saveField({ priority: next }),
    [saveField],
  );
  const saveStatus = useCallback(
    (next: SpecStatus) => saveField({ status: next }),
    [saveField],
  );

  const content = useMemo<Record<string, unknown>>(
    () => (spec.content ?? {}) as Record<string, unknown>,
    [spec.content],
  );

  const saveContentField = useCallback(
    async (key: string, value: unknown) => {
      const nextContent = { ...content, [key]: value };
      await saveField({ content: nextContent });
    },
    [content, saveField],
  );

  // ── Delete ──────────────────────────────────────────────────────────
  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteSpec(spec.id);
      onSpecDeleted(spec.id);
      onClose();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to delete spec.",
      );
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  }

  // Filter to valid positive integers only.
  const indices = useMemo<number[]>(() => {
    const raw = content.supporting_feedback_indices;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1,
    );
  }, [content]);

  const chunkCount = specSources?.retrievedChunks?.length ?? 0;
  const typeLabel = spec.type === "feature_specs" ? "Feature" : "Story";
  const shortId = spec.id.slice(0, 4).toUpperCase();
  const isFeature = spec.type === "feature_specs";

  const userStories = Array.isArray(content.user_stories)
    ? (content.user_stories as string[])
    : [];
  const acceptanceCriteria = Array.isArray(content.acceptance_criteria)
    ? (content.acceptance_criteria as string[])
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close spec detail"
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]"
      />

      {/* Frame */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spec-modal-title"
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : fromTransform
            ? { ...fromTransform, opacity: 0 }
            : { opacity: 0, scale: 0.96 }
        }
        animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
        exit={
          prefersReducedMotion
            ? { opacity: 0, transition: { duration: durations.fast } }
            : fromTransform
            ? {
                ...fromTransform,
                opacity: 0,
                transition: { duration: durations.fast, ease: easings.standard },
              }
            : {
                opacity: 0,
                scale: 0.96,
                transition: { duration: durations.fast, ease: easings.standard },
              }
        }
        transition={prefersReducedMotion ? { duration: 0.15 } : { ...springs.bouncy }}
        className="relative flex h-[90vh] w-[95vw] max-w-[1100px] flex-col overflow-hidden rounded-[4px] bg-surface-container-lowest"
      >
        {/* ── Compact header ──────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-3 px-5 py-3 shadow-[inset_0_-1px_0_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/70">
            <span>Workspace / Spec</span>
            <span className="text-on-surface-variant/40">·</span>
            <span className="text-on-surface">#{shortId}</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close spec detail"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
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
        </header>

        {/* ── Body (content + inspector) ─────────────────────────── */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_340px]">
          {/* Left — content */}
          <div className="min-h-0 overflow-y-auto px-6 pt-6 pb-8">
            <div className="mx-auto max-w-[680px]">
              {/* Type chip */}
              <div className="mb-2">
                <span className="inline-flex rounded-[2px] bg-surface-container px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                  {typeLabel}
                </span>
              </div>
              <div id="spec-modal-title" className="group/title relative">
                <EditableText
                  value={spec.title}
                  onSave={saveTitle}
                  maxLength={255}
                  ariaLabel="Edit spec title"
                  variant="title"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 opacity-60 group-hover/title:inline-flex"
                >
                  <svg
                    className="h-4 w-4 text-on-surface-variant"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487 18.549 2.799a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                    />
                  </svg>
                </span>
              </div>

              {/* Edit error banner */}
              {editError ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-[4px] bg-error/10 px-3 py-2 text-[12px] text-error">
                  <span>{editError}</span>
                  <button
                    type="button"
                    onClick={() => setEditError(null)}
                    className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}

              {/* Sections */}
              <div className="mt-7 flex flex-col gap-7">
                {isFeature ? (
                  <>
                    <Section title="Problem">
                      <EditableTextArea
                        value={String(content.problem ?? "")}
                        onSave={(v) => saveContentField("problem", v)}
                        ariaLabel="Edit problem statement"
                        placeholder="Describe the problem"
                      />
                    </Section>
                    <Section title="Proposed solution">
                      <EditableTextArea
                        value={String(content.proposed_solution ?? "")}
                        onSave={(v) => saveContentField("proposed_solution", v)}
                        ariaLabel="Edit proposed solution"
                        placeholder="Describe the proposed solution"
                      />
                    </Section>
                    <Section
                      title="User stories"
                      count={userStories.length}
                    >
                      <EditableList
                        items={userStories}
                        onSave={(v) => saveContentField("user_stories", v)}
                        addLabel="story"
                        itemAriaLabel="user story"
                      />
                    </Section>
                    <Section
                      title="Acceptance criteria"
                      count={acceptanceCriteria.length}
                    >
                      <EditableList
                        items={acceptanceCriteria}
                        onSave={(v) =>
                          saveContentField("acceptance_criteria", v)
                        }
                        addLabel="criterion"
                        itemAriaLabel="acceptance criterion"
                      />
                    </Section>
                  </>
                ) : (
                  <>
                    <Section title="Theme">
                      <EditableText
                        value={String(content.theme ?? "")}
                        onSave={(v) => saveContentField("theme", v)}
                        ariaLabel="Edit theme"
                        placeholder="Describe the theme"
                        allowEmpty
                      />
                    </Section>
                    <Section
                      title="Acceptance criteria"
                      count={acceptanceCriteria.length}
                    >
                      <EditableList
                        items={acceptanceCriteria}
                        onSave={(v) =>
                          saveContentField("acceptance_criteria", v)
                        }
                        addLabel="criterion"
                        itemAriaLabel="acceptance criterion"
                      />
                    </Section>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right — inspector */}
          <aside
            className="flex min-h-0 flex-col overflow-hidden bg-surface-container-low shadow-[inset_1px_0_0_rgba(15,23,42,0.06)]"
            aria-label="Spec inspector"
          >
            {/* Properties panel */}
            <div className="flex-shrink-0 px-5 pt-4 pb-4 shadow-[inset_0_-1px_0_rgba(15,23,42,0.06)]">
              <PanelHeader>Properties</PanelHeader>
              <dl className="mt-2.5 flex flex-col">
                {/* Short value: compact row (label left, value right) */}
                <RowField label="Type">
                  <span className="text-[12px] font-medium text-on-surface">
                    {typeLabel}
                  </span>
                </RowField>
                <RowField label="Citations">
                  <div className="min-w-0 truncate">
                    <CitationChips
                      indices={indices}
                      onFocus={focusChunkAtIndex}
                      maxIndex={chunkCount}
                      hideLabel
                    />
                  </div>
                </RowField>
                {/* Stacked: pill rows need full width to avoid wrap */}
                <StackField label="Priority">
                  <PriorityPills value={spec.priority} onChange={savePriority} />
                </StackField>
                <StackField label="Status" last>
                  <StatusPills value={spec.status} onChange={saveStatus} />
                </StackField>
              </dl>
              {/* Timeline footer — compact 2 lines */}
              <div className="mt-3 flex flex-col gap-0.5">
                <TimelineLine kind="Created" iso={spec.createdAt} />
                <TimelineLine kind="Updated" iso={spec.updatedAt} />
              </div>
            </div>

            {/* Sources panel — RAG X-Ray */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {sourcesError ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                  <PanelHeader>Sources</PanelHeader>
                  <p className="mt-3 text-[13px] text-on-surface-variant">
                    {sourcesError}
                  </p>
                </div>
              ) : (
                <XrayPanel
                  variant="spec"
                  projectId={projectId}
                  specSources={specSources}
                  focusedChunkId={focusedChunkId}
                  focusTick={focusTick}
                />
              )}
            </div>
          </aside>
        </div>

        {/* ── Footer action bar ──────────────────────────────────── */}
        <footer className="flex items-center justify-between gap-3 px-5 py-3 shadow-[inset_0_1px_0_rgba(15,23,42,0.06)]">
          <div className="flex items-center">
            {confirmingDelete ? (
              <InlineConfirm
                message="Delete this spec?"
                onConfirm={handleDelete}
                onCancel={() => setConfirmingDelete(false)}
                isSubmitting={isDeleting}
              />
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-error transition-colors hover:bg-error/10"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
                <span>Delete spec</span>
              </button>
            )}
          </div>
          <SaveIndicator state={saveState} />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-[4px] bg-on-surface px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-surface-container-lowest transition-colors hover:bg-secondary"
          >
            Close
          </button>
        </footer>
      </motion.div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[14px] font-semibold leading-none text-on-surface">
          {title}
        </h3>
        {typeof count === "number" ? (
          <span className="font-mono text-[10px] font-medium text-on-surface-variant/70">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/80">
      {children}
    </h3>
  );
}

/** Compact label/value row: label left (mono uppercase), value right. Use
 *  for fields whose value comfortably fits inline with the label. */
function RowField({
  label,
  children,
  last = false,
  title,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
  title?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 ${
        last ? "" : "shadow-[inset_0_-1px_0_rgba(15,23,42,0.05)]"
      }`}
    >
      <dt
        title={title}
        className={`font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/60 ${
          title ? "cursor-help" : ""
        }`}
      >
        {label}
      </dt>
      <dd className="flex min-w-0 justify-end text-right">{children}</dd>
    </div>
  );
}

/** Stacked label/value row: label on top, content below (full-width). Use
 *  for pill rows where the value won't fit inline with a label. */
function StackField({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 py-1.5 ${
        last ? "" : "shadow-[inset_0_-1px_0_rgba(15,23,42,0.05)]"
      }`}
    >
      <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/60">
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** "Created · 12 minutes ago" style — friendlier than ISO timestamps in a
 *  side rail. Title attribute keeps the precise timestamp on hover. */
function TimelineLine({ kind, iso }: { kind: "Created" | "Updated"; iso: string }) {
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(normalized);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  const friendly = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-[52px] font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/60">
        {kind}
      </span>
      <span
        className="text-[12px] text-on-surface-variant"
        title={normalized}
      >
        {friendly}
      </span>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return <div className="h-4" aria-hidden />;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-50" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
        </span>
        Saving
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant">
        <svg
          className="h-3 w-3 text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 12.75 6 6 9-13.5"
          />
        </svg>
        Saved
      </span>
    );
  }
  // error
  return (
    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-error">
      Save failed
    </span>
  );
}
