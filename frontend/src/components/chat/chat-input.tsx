"use client";

import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  isPending: boolean;
  placeholder?: string;
  draft?: string;
  onDraftChange?: (value: string) => void;
}

const MAX_CHARS = 2000;
const MAX_ROWS = 6;

/**
 * Textarea + submit button anchored at the bottom of the chat.
 *
 * Enter submits, Shift+Enter inserts a newline. Auto-resizes up to
 * MAX_ROWS. Disabled while a request is pending to prevent double-sends.
 *
 * Can operate either fully uncontrolled (own local draft state) or as
 * a controlled component when both `draft` and `onDraftChange` are
 * supplied — the latter is how EmptyState's example chips pre-fill.
 */
export function ChatInput({
  onSend,
  isPending,
  placeholder = "Ask a question about your feedback…",
  draft,
  onDraftChange,
}: ChatInputProps) {
  const isControlled = draft !== undefined && onDraftChange !== undefined;
  const [localDraft, setLocalDraft] = useState("");
  const value = isControlled ? draft : localDraft;
  const setValue = (next: string) => {
    if (isControlled) {
      onDraftChange!(next);
    } else {
      setLocalDraft(next);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize to content, clamped to MAX_ROWS
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20;
    const maxHeight = lineHeight * MAX_ROWS + 24;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const canSend = value.trim().length > 0 && !isPending;

  return (
    <div className="rounded-[4px] bg-surface-container-lowest p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isPending}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-2 text-[14px] leading-[20px] text-on-surface placeholder:text-on-surface-variant focus:outline-none disabled:opacity-60"
          style={{ maxHeight: `${20 * MAX_ROWS + 24}px` }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] bg-on-surface text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-on-surface"
        >
          {isPending ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.99v4.99" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          )}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-2">
        <div className="font-mono text-[10px] text-on-surface-variant">
          {isPending ? "Sending…" : "Enter to send · Shift+Enter for newline"}
        </div>
        <div className="font-mono text-[10px] text-on-surface-variant">
          {value.length}/{MAX_CHARS}
        </div>
      </div>
    </div>
  );
}
