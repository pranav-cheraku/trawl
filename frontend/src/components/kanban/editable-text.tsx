"use client";
// Single-line click-to-edit. Enter saves, Escape reverts. Re-throws errors from
// onSave so the parent can surface them via a banner while the primitive reverts.
import { useEffect, useRef, useState } from "react";

interface EditableTextProps {
  value: string;
  onSave: (next: string) => Promise<void>;
  maxLength?: number;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  variant?: "title" | "body";
  allowEmpty?: boolean;
}

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
    const isBody = variant !== "title";
    const bodyClasses = isBody
      ? "min-w-[72px] bg-surface-container hover:bg-surface-container-high"
      : "w-full hover:bg-surface-container-high";
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={ariaLabel}
        className={`rounded-[4px] px-2 py-1 -mx-2 text-left transition-colors ${bodyClasses} ${readClasses} ${className ?? ""}`}
      >
        {value || (
          <span className="text-on-surface-variant/70">
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
