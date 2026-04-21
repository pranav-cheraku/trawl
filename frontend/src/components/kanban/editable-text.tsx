"use client";

import { useEffect, useRef, useState } from "react";

interface EditableTextProps {
  value: string;
  onSave: (next: string) => Promise<void>;
  maxLength?: number;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  /** Visual variant — title renders larger than body. */
  variant?: "title" | "body";
  /** When true, saving an empty string is allowed. Default false. */
  allowEmpty?: boolean;
}

/**
 * Single-line click-to-edit. Save on blur or Enter. Esc reverts.
 * Renders as a button in read mode, input in edit mode. Autofocus on enter.
 */
export default function EditableText({
  value,
  onSave,
  maxLength,
  placeholder,
  ariaLabel,
  className,
  variant = "body",
  allowEmpty = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  async function commit() {
    const next = draft.trim();
    if (next === value.trim()) {
      setDraft(value);
      setIsEditing(false);
      return;
    }
    if (next.length === 0 && !allowEmpty) {
      setDraft(value);
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
      // Parent surfaces the error via its own banner.
    } finally {
      setIsSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setIsEditing(false);
  }

  const readClasses =
    variant === "title"
      ? "text-[17px] font-semibold leading-tight text-on-surface"
      : "text-[14px] leading-relaxed text-on-surface";

  const editClasses =
    variant === "title"
      ? "text-[17px] font-semibold leading-tight"
      : "text-[14px] leading-relaxed";

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={ariaLabel}
        className={`w-full rounded-[4px] px-2 py-1 -mx-2 text-left transition-colors hover:bg-surface-container-high ${readClasses} ${className ?? ""}`}
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
    <div className={`relative ${className ?? ""}`}>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          } else if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={isSaving}
        className={`w-full rounded-[4px] bg-surface-container-lowest px-2 py-1 -mx-2 text-on-surface outline-none ring-[2px] ring-secondary/10 border border-secondary focus:ring-[2px] focus:ring-secondary/10 disabled:opacity-60 ${editClasses}`}
      />
      {maxLength ? (
        <span className="absolute right-0 -bottom-4 font-mono text-[10px] text-on-surface/60">
          {draft.length}/{maxLength}
        </span>
      ) : null}
    </div>
  );
}
