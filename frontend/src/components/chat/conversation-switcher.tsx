"use client";

import { useEffect, useRef, useState } from "react";

import InlineConfirm from "@/components/ui/inline-confirm";
import type { Conversation } from "@/types";

interface ConversationSwitcherProps {
  conversations: Conversation[];
  currentId: string | null;
  maxConversations: number;
  onSelect: (conversationId: string) => void;
  onNew: (title: string | null) => void;
  onDelete: (conversationId: string) => void;
  onRename: (conversationId: string, title: string) => void;
}

function formatDate(iso: string): string {
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
  const d = new Date(normalized);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ConversationSwitcher({
  conversations,
  currentId,
  maxConversations,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ConversationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newChatDraft, setNewChatDraft] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newChatInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the rename input when it appears
  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  // Auto-focus the new-chat input when it appears
  useEffect(() => {
    if (isCreatingNew) {
      newChatInputRef.current?.focus();
    }
  }, [isCreatingNew]);

  // Reset transient dropdown states when the dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmingId(null);
      setRenamingId(null);
      setRenameDraft("");
      setIsCreatingNew(false);
      setNewChatDraft("");
    }
  }, [isOpen]);

  const count = conversations.length;
  const atLimit = count >= maxConversations;

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setConfirmingId(null);
        setRenamingId(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      // Don't close the dropdown on Escape while renaming — the input's
      // own onKeyDown handles Esc to cancel the rename.
      if (e.key === "Escape" && !renamingId) {
        setIsOpen(false);
        setConfirmingId(null);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, renamingId]);

  function startRename(conv: Conversation) {
    setRenamingId(conv.id);
    setRenameDraft(conv.title ?? "");
  }

  function commitRename(conversationId: string) {
    const trimmed = renameDraft.trim();
    if (trimmed) {
      onRename(conversationId, trimmed);
    }
    setRenamingId(null);
    setRenameDraft("");
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameDraft("");
  }

  function startCreateNew() {
    if (atLimit) return;
    setIsCreatingNew(true);
    setNewChatDraft("");
  }

  function commitCreateNew() {
    const trimmed = newChatDraft.trim();
    onNew(trimmed || null);
    setIsCreatingNew(false);
    setNewChatDraft("");
    setIsOpen(false);
  }

  function cancelCreateNew() {
    setIsCreatingNew(false);
    setNewChatDraft("");
  }

  const currentLabel = (() => {
    if (!currentId) return "New chat";
    const current = conversations.find((c) => c.id === currentId);
    return current?.title?.trim() || "New chat";
  })();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-[4px] bg-surface-container-lowest px-3 py-2 text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
      >
        <svg
          className="h-3.5 w-3.5 text-on-surface-variant"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 17.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
        <span className="max-w-[220px] truncate">{currentLabel}</span>
        <span className="font-mono text-[10px] text-on-surface-variant">
          {count}/{maxConversations}
        </span>
        <svg
          className={`h-3 w-3 text-on-surface-variant transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 w-80 rounded-[4px] bg-surface-container-lowest/95 backdrop-blur-[12px]"
        >
          <div className="px-4 pt-4 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
            Conversations
          </div>
          <div className="max-h-[320px] overflow-y-auto px-2 pb-2">
            {conversations.length === 0 ? (
              <div className="px-3 py-3 text-[12px] text-on-surface-variant">
                No conversations yet.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === currentId;
                const title = conv.title?.trim() || "New chat";
                const date = formatDate(conv.createdAt);

                // Delete-confirmation variant
                if (confirmingId === conv.id) {
                  return (
                    <div
                      key={conv.id}
                      className="rounded-[4px] bg-surface-container-low px-3 py-2"
                    >
                      <InlineConfirm
                        message="Delete this chat?"
                        onConfirm={() => {
                          onDelete(conv.id);
                          setConfirmingId(null);
                        }}
                        onCancel={() => setConfirmingId(null)}
                      />
                    </div>
                  );
                }

                // Rename variant
                if (renamingId === conv.id) {
                  return (
                    <div
                      key={conv.id}
                      className="rounded-[4px] bg-surface-container-low px-3 py-2"
                    >
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameDraft}
                        maxLength={255}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename(conv.id);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        onBlur={() => commitRename(conv.id)}
                        placeholder="Chat name"
                        className="w-full rounded-[4px] bg-surface-container-lowest px-2 py-1.5 text-[13px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/60"
                      />
                      <div className="mt-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface-variant">
                        <span>Enter to save · Esc to cancel</span>
                        <span>{renameDraft.length}/255</span>
                      </div>
                    </div>
                  );
                }

                // Default row
                return (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 rounded-[4px] px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-surface-container-high"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(conv.id);
                        setIsOpen(false);
                      }}
                      className="flex min-w-0 flex-1 flex-col text-left"
                    >
                      <span
                        className={`truncate text-[13px] ${
                          isActive
                            ? "font-semibold text-on-surface"
                            : "text-on-surface"
                        }`}
                      >
                        {title}
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        {date}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(conv);
                      }}
                      aria-label="Rename conversation"
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px] text-on-surface-variant opacity-40 transition-colors hover:bg-secondary/10 hover:text-secondary group-hover:opacity-100"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingId(conv.id);
                      }}
                      aria-label="Delete conversation"
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[4px] text-on-surface-variant opacity-40 transition-colors hover:bg-error/10 hover:text-error group-hover:opacity-100"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-2 pb-2 pt-1">
            {isCreatingNew ? (
              <div className="rounded-[4px] bg-surface-container-low p-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={newChatInputRef}
                    type="text"
                    value={newChatDraft}
                    maxLength={255}
                    placeholder="Name this chat (optional)"
                    onChange={(e) => setNewChatDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitCreateNew();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelCreateNew();
                      }
                    }}
                    className="flex-1 rounded-[4px] bg-surface-container-lowest px-2 py-1.5 text-[13px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/60"
                  />
                  <button
                    type="button"
                    onClick={commitCreateNew}
                    aria-label="Create chat"
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[4px] bg-on-surface text-white transition-colors hover:bg-secondary"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={cancelCreateNew}
                    aria-label="Cancel"
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[4px] text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-1.5 px-1 font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface-variant">
                  Leave blank to auto-name from your first message
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startCreateNew}
                disabled={atLimit}
                title={atLimit ? "Delete a chat to create a new one" : undefined}
                className="flex w-full items-center gap-2 rounded-[4px] bg-on-surface px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-on-surface-variant disabled:hover:bg-surface-container"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                {atLimit
                  ? `Max ${maxConversations} chats reached`
                  : "New chat"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
