"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface EditableTextAreaProps {
  value: string;
  onSave: (next: string) => Promise<void>;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  /** Optional row hint; the textarea autosizes past this. */
  minRows?: number;
}

/**
 * Multi-line click-to-edit with autosize. Save on blur or Cmd/Ctrl+Enter.
 * Esc reverts. Empty string is allowed (unlike EditableText which treats
 * empty as a cancel) — list rows want to let users clear them.
 */
export default function EditableTextArea({
  value,
  onSave,
  placeholder,
  ariaLabel,
  className,
  minRows = 2,
}: EditableTextAreaProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el || !isEditing) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, isEditing]);

  useEffect(() => {
    if (isEditing) {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [isEditing]);

  async function commit() {
    const next = draft;
    if (next === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(next);
      setIsEditing(false);
    } catch {
      setDraft(value);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={ariaLabel}
        className={`block w-full whitespace-pre-wrap rounded-[4px] px-2 py-1.5 -mx-2 text-left text-[14px] leading-relaxed text-on-surface transition-colors hover:bg-surface-container-high ${className ?? ""}`}
      >
        {value || (
          <span className="text-on-surface/60">
            {placeholder ?? "Click to edit"}
          </span>
        )}
      </button>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        }
      }}
      placeholder={placeholder}
      disabled={isSaving}
      rows={minRows}
      aria-label={ariaLabel}
      className={`block w-full resize-none rounded-[4px] bg-surface-container-lowest px-2 py-1.5 -mx-2 text-[14px] leading-relaxed text-on-surface outline-none ring-[2px] ring-secondary/10 border border-secondary focus:ring-[2px] focus:ring-secondary/10 disabled:opacity-60 ${className ?? ""}`}
    />
  );
}
