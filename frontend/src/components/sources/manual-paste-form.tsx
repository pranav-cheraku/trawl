"use client";
// Manual paste connector form. Accepts free-form text (one item per line or
// a single block). Backend caps content at 100k characters.

import { useMemo, useState } from "react";
import { connectManualPaste } from "@/lib/api";
import type { ConnectorFormProps } from "@/lib/connector-registry";

function splitItems(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const paragraphs = trimmed
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;
  return trimmed
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ManualPasteForm({
  projectId,
  onSourceCreated,
}: ConnectorFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemCount = useMemo(() => splitItems(content).length, [content]);

  async function handleSubmit() {
    if (itemCount === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await connectManualPaste(projectId, {
        title: title.trim() || null,
        content,
      });
      onSourceCreated();
    } catch {
      setError("Failed to create source. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-[12px] text-on-surface-variant">
          Title{" "}
          <span className="text-on-surface-variant/60">(optional)</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q2 user interview notes"
          maxLength={255}
          className="w-full rounded-[4px] bg-surface-container-lowest px-3 py-2 text-[13px] text-on-surface outline outline-1 outline-outline-variant placeholder:text-on-surface-variant/60 focus:outline-secondary"
        />
      </div>

      <div>
        <label className="mb-1 block text-[12px] text-on-surface-variant">
          Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste feedback. Items split on blank lines."
          rows={12}
          maxLength={100000}
          aria-describedby="manual-paste-counter"
          className="w-full resize-y rounded-[4px] bg-surface-container-lowest px-3 py-2 font-mono text-[12px] text-on-surface outline outline-1 outline-outline-variant placeholder:text-on-surface-variant/60 focus:outline-secondary"
        />
        <p
          id="manual-paste-counter"
          aria-live="polite"
          className="mt-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant"
        >
          Detected {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || itemCount === 0}
        className="inline-flex items-center gap-2 self-start rounded-[4px] bg-on-surface px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-secondary disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "Create source"}
      </button>

      {error && (
        <p className="text-[12px] text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
