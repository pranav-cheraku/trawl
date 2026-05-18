"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createProject } from "@/lib/api";
import { springs } from "@/lib/motion";

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewProjectModal({
  onClose,
  onCreated,
}: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleClose}
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={prefersReducedMotion ? { duration: 0.15 } : { ...springs.bouncy }}
        className="relative w-full max-w-md rounded-[4px] bg-surface-container-lowest/85 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-[12px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-6 pb-4">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Dashboard
            </p>
            <h2
              id="modal-title"
              className="mt-1 text-2xl font-bold text-on-surface"
            >
              New Project
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-6 top-6 text-on-surface-variant transition-colors hover:text-on-surface"
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

        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="p-8 pt-4 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="project-name"
                  className="block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant"
                >
                  Project Name <span className="text-secondary">*</span>
                </label>
                <span className="font-mono text-[10px] text-on-surface-variant/60">
                  {name.length}/255
                </span>
              </div>
              <input
                id="project-name"
                type="text"
                required
                maxLength={255}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Notion Mobile Reviews"
                className="w-full rounded-[4px] border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-[14px] text-on-surface placeholder:font-mono placeholder:text-sm placeholder:text-on-surface-variant/50 focus:border-secondary focus:outline-none focus:ring-[2px] focus:ring-secondary/10"
                aria-required="true"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="project-description"
                className="block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant"
              >
                Description{" "}
                <span className="normal-case tracking-normal text-on-surface-variant/60">
                  (optional)
                </span>
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What feedback are you analyzing?"
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-[4px] border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-[14px] text-on-surface placeholder:font-mono placeholder:text-sm placeholder:text-on-surface-variant/50 focus:border-secondary focus:outline-none focus:ring-[2px] focus:ring-secondary/10"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <p
                className="text-[13px] text-error"
                role="alert"
                aria-live="polite"
              >
                {error}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 px-8 py-5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-[4px] border border-outline/30 px-5 py-2.5 text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 rounded-[4px] bg-on-surface px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-secondary disabled:opacity-50"
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
      </motion.div>
    </div>
  );
}
