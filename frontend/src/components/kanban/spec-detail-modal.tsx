"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  onClose: () => void;
  onSpecUpdated: (next: Spec) => void;
  onSpecDeleted: (specId: string) => void;
}

function formatTs(iso: string): string {
  // Backend returns naive UTC ISO strings; append Z so Date parses correctly.
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(normalized);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SpecDetailModal({
  spec,
  projectId,
  onClose,
  onSpecUpdated,
  onSpecDeleted,
}: SpecDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [specSources, setSpecSources] = useState<SpecSources | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [focusedChunkId, setFocusedChunkId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Move focus into the modal on mount so keyboard users can navigate.
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
  const saveField = useCallback(
    async (patch: Parameters<typeof updateSpec>[1]) => {
      try {
        const updated = await updateSpec(spec.id, patch);
        onSpecUpdated(updated);
        setEditError(null);
      } catch (err) {
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

  // Fix 4: type as Record<string, unknown> directly — union was dead weight.
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

  // Fix 3: filter to valid positive integers only.
  const indices = useMemo<number[]>(() => {
    const raw = content.supporting_feedback_indices;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1,
    );
  }, [content]);

  const chunkCount = specSources?.retrievedChunks?.length ?? 0;
  const typeLabel = spec.type === "feature_specs" ? "FEATURE" : "STORY";
  const shortId = spec.id.slice(0, 4).toUpperCase();

  const isFeature = spec.type === "feature_specs";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop — Fix 2: tabIndex={-1} keeps it out of the tab order. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close spec detail"
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]"
      />

      {/* Frame */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spec-modal-title"
        className="relative flex h-[90vh] w-[95vw] max-w-[1200px] flex-col overflow-hidden rounded-[4px] bg-surface-container-lowest"
      >
        {/* Header (spans both panes) */}
        <header className="flex flex-col gap-3 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface/70">
                <span>WORKSPACE / SPEC · #{shortId}</span>
                <span className="text-on-surface/40">·</span>
                <span className="text-on-surface">{typeLabel}</span>
              </div>
              <div id="spec-modal-title" className="mt-1.5">
                <EditableText
                  value={spec.title}
                  onSave={saveTitle}
                  maxLength={255}
                  ariaLabel="Edit spec title"
                  variant="title"
                />
              </div>
            </div>
            <div className="flex items-start gap-2">
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
                  className="rounded-[4px] px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-error transition-colors hover:bg-error/10"
                >
                  Delete
                </button>
              )}
              {/* Fix 1 + Fix 5: ref for initial focus; aria-label harmonized. */}
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

          {/* Pills row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <PriorityPills value={spec.priority} onChange={savePriority} />
            <StatusPills value={spec.status} onChange={saveStatus} />
          </div>

          {/* Citation chips + meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CitationChips
              indices={indices}
              onFocus={focusChunkAtIndex}
              maxIndex={chunkCount}
            />
            <span className="font-mono text-[10px] text-on-surface-variant/70">
              CREATED {formatTs(spec.createdAt)} · UPDATED{" "}
              {formatTs(spec.updatedAt)}
            </span>
          </div>

          {/* Edit error banner */}
          {editError ? (
            <div className="flex items-center justify-between gap-3 rounded-[4px] bg-error/10 px-3 py-2 text-[12px] text-error">
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
        </header>

        {/* Body grid */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_360px]">
          {/* Left pane — spec body */}
          <div className="min-h-0 overflow-y-auto px-5 pb-6">
            <div className="flex flex-col gap-5">
              {isFeature ? (
                <>
                  <Section label="PROBLEM">
                    <EditableTextArea
                      value={String(content.problem ?? "")}
                      onSave={(v) => saveContentField("problem", v)}
                      ariaLabel="Edit problem statement"
                      placeholder="Describe the problem"
                    />
                  </Section>
                  <Section label="PROPOSED SOLUTION">
                    <EditableTextArea
                      value={String(content.proposed_solution ?? "")}
                      onSave={(v) => saveContentField("proposed_solution", v)}
                      ariaLabel="Edit proposed solution"
                      placeholder="Describe the proposed solution"
                    />
                  </Section>
                  <Section label="USER STORIES">
                    <EditableList
                      items={
                        Array.isArray(content.user_stories)
                          ? (content.user_stories as string[])
                          : []
                      }
                      onSave={(v) => saveContentField("user_stories", v)}
                      addLabel="story"
                      itemAriaLabel="user story"
                    />
                  </Section>
                  <Section label="ACCEPTANCE CRITERIA">
                    <EditableList
                      items={
                        Array.isArray(content.acceptance_criteria)
                          ? (content.acceptance_criteria as string[])
                          : []
                      }
                      onSave={(v) =>
                        saveContentField("acceptance_criteria", v)
                      }
                      addLabel="criterion"
                      itemAriaLabel="acceptance criterion"
                    />
                  </Section>
                  <Section label="EFFORT ESTIMATE">
                    <EditableText
                      value={String(content.effort_estimate ?? "")}
                      onSave={(v) => saveContentField("effort_estimate", v)}
                      ariaLabel="Edit effort estimate"
                      placeholder="e.g. S, M, L, 2 sprints"
                      allowEmpty
                    />
                  </Section>
                </>
              ) : (
                <>
                  <Section label="THEME">
                    <EditableText
                      value={String(content.theme ?? "")}
                      onSave={(v) => saveContentField("theme", v)}
                      ariaLabel="Edit theme"
                      placeholder="Describe the theme"
                      allowEmpty
                    />
                  </Section>
                  <Section label="ACCEPTANCE CRITERIA">
                    <EditableList
                      items={
                        Array.isArray(content.acceptance_criteria)
                          ? (content.acceptance_criteria as string[])
                          : []
                      }
                      onSave={(v) =>
                        saveContentField("acceptance_criteria", v)
                      }
                      addLabel="criterion"
                      itemAriaLabel="acceptance criterion"
                    />
                  </Section>
                  <Section label="EFFORT ESTIMATE">
                    <EditableText
                      value={String(content.effort_estimate ?? "")}
                      onSave={(v) => saveContentField("effort_estimate", v)}
                      ariaLabel="Edit effort estimate"
                      placeholder="e.g. S, M, L, 2 sprints"
                      allowEmpty
                    />
                  </Section>
                </>
              )}
            </div>
          </div>

          {/* Right pane — X-Ray */}
          <div className="min-h-0 overflow-hidden">
            {sourcesError ? (
              <div className="flex h-full flex-col items-center justify-center rounded-[4px] bg-surface-container-low px-6 py-10 text-center">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                  RAG X-Ray
                </p>
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
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        {label}
      </div>
      {children}
    </section>
  );
}
