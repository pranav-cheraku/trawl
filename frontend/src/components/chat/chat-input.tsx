"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface ChatInputHandle {
  focus: () => void;
}

interface ChatInputProps {
  onSend: (content: string) => void;
  isPending: boolean;
  placeholder?: string;
  /** Controlled draft value. The parent owns the state so example-chip
   *  pre-fills (and any other programmatic updates) work cleanly. */
  draft: string;
  onDraftChange: (value: string) => void;
}

const MAX_CHARS = 2000;
const MAX_ROWS = 6;

/**
 * Textarea + submit button anchored at the bottom of the chat.
 *
 * Enter submits, Shift+Enter inserts a newline. Auto-resizes up to
 * MAX_ROWS. Disabled while a request is pending to prevent double-sends.
 *
 * Exposes an imperative `focus()` handle via forwardRef so callers can
 * focus the textarea after programmatically populating the draft (e.g.,
 * when an example chip is clicked).
 */
export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSend,
  isPending,
  placeholder = "Ask a question about your feedback…",
  draft,
  onDraftChange,
}: ChatInputProps, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  // Auto-resize to content, clamped to MAX_ROWS
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20;
    const maxHeight = lineHeight * MAX_ROWS + 24;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [draft]);

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed || isPending) return;
    onSend(trimmed);
    onDraftChange("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const canSend = draft.trim().length > 0 && !isPending;

  return (
    <div className="rounded-[4px] bg-surface-container-lowest p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value.slice(0, MAX_CHARS))}
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
      <div className="mt-1.5 flex items-center justify-between gap-3 px-2">
        <div className="font-mono text-[10px] text-on-surface-variant">
          {isPending ? (
            "Sending…"
          ) : (
            <>
              <span className="sm:hidden">Enter to send</span>
              <span className="hidden sm:inline">
                Enter to send · Shift+Enter for newline
              </span>
            </>
          )}
        </div>
        <div className="font-mono text-[10px] text-on-surface-variant">
          {draft.length}/{MAX_CHARS}
        </div>
      </div>
    </div>
  );
});
