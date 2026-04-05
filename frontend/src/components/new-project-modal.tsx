"use client";

import { useState } from "react";
import { createProject } from "@/lib/api";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewProjectModal({
  isOpen,
  onClose,
  onCreated,
}: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function resetForm() {
    setName("");
    setDescription("");
    setError(null);
    setIsSubmitting(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create project. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleClose}
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-md border border-border bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-8 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-faint">
              Dashboard
            </p>
            <h2
              id="modal-title"
              className="mt-1 font-serif text-2xl text-ink"
            >
              New Project
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="ml-4 mt-0.5 text-ink-faint transition-colors hover:text-ink"
            aria-label="Close modal"
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
        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-6">
            {/* Name field */}
            <div className="space-y-2">
              <label
                htmlFor="project-name"
                className="block text-xs font-medium uppercase tracking-[0.2em] text-ink-faint"
              >
                Project Name <span className="text-teal">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Notion Mobile Reviews"
                className="w-full border border-border bg-paper px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                aria-required="true"
                disabled={isSubmitting}
              />
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <label
                htmlFor="project-description"
                className="block text-xs font-medium uppercase tracking-[0.2em] text-ink-faint"
              >
                Description{" "}
                <span className="normal-case tracking-normal text-ink-faint/60">
                  (optional)
                </span>
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What feedback are you analyzing?"
                rows={3}
                className="w-full resize-none border border-border bg-paper px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                disabled={isSubmitting}
              />
            </div>

            {/* Error message */}
            {error && (
              <p
                className="text-[13px] text-red-600"
                role="alert"
                aria-live="polite"
              >
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-8 py-5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border border-border px-5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-paper disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-ink-light disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 14 14"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M7 1v12M1 7h12" />
                  </svg>
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
