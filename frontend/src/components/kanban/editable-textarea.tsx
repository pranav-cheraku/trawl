"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface EditableTextAreaProps {
  value: string;
  onSave: (next: string) => Promise<void>;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  minRows?: number;
}

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
        className={`group/edit relative block w-full whitespace-pre-wrap rounded-[4px] bg-surface-container/40 px-3 py-2 text-left text-[14px] leading-relaxed text-on-surface transition-colors hover:bg-surface-container-high ${className ?? ""}`}
      >
        {value || (
          <span className="text-on-surface-variant/70">
            {placeholder ?? "Click to edit"}
          </span>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-2 hidden opacity-60 group-hover/edit:inline-flex"
        >
          <svg
            className="h-3.5 w-3.5 text-on-surface-variant"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487 18.549 2.799a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          // The Save/Cancel buttons use onMouseDown to act before blur fires.
          // If relatedTarget carries data-editor-action, skip the blur-save.
          const next = e.relatedTarget as HTMLElement | null;
          if (next?.dataset?.editorAction) return;
          commit();
        }}
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
        className="block w-full resize-none rounded-t-[4px] bg-surface-container-lowest px-3 py-2 text-[14px] leading-relaxed text-on-surface outline-none ring-[2px] ring-secondary/10 border border-secondary border-b-0 focus:ring-[2px] focus:ring-secondary/10 disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-3 rounded-b-[4px] border border-t-0 border-secondary bg-surface-container-lowest px-2.5 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/70">
          ⌘+↵ Save · Esc Cancel
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-editor-action="cancel"
            onMouseDown={(e) => {
              e.preventDefault();
              cancel();
            }}
            disabled={isSaving}
            className="rounded-[2px] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            data-editor-action="save"
            onMouseDown={(e) => {
              e.preventDefault();
              commit();
            }}
            disabled={isSaving}
            className="rounded-[2px] bg-on-surface px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
