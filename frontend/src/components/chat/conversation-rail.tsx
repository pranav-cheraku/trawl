"use client";

import { useEffect, useRef, useState } from "react";

import { motion, useReducedMotion } from "framer-motion";

import InlineConfirm from "@/components/ui/inline-confirm";
import { durations, easings, springs, staggers } from "@/lib/motion";
import { friendlyAgo } from "@/lib/time";
import type { Conversation } from "@/types";

interface ConversationRailProps {
  conversations: Conversation[];
  currentId: string | null;
  maxConversations: number;
  onSelect: (conversationId: string) => void;
  onNew: (title: string | null) => void;
  onDelete: (conversationId: string) => void;
  onRename: (conversationId: string, title: string) => void;
}

export function ConversationRail({
  conversations,
  currentId,
  maxConversations,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ConversationRailProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newChatDraft, setNewChatDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newChatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (isCreatingNew) {
      newChatInputRef.current?.focus();
    }
  }, [isCreatingNew]);

  const prefersReducedMotion = useReducedMotion();

  const atLimit = conversations.length >= maxConversations;

  function startRename(conv: Conversation) {
    setRenamingId(conv.id);
    setRenameDraft(conv.title ?? "");
  }
  function commitRename(conversationId: string) {
    const trimmed = renameDraft.trim();
    if (trimmed) onRename(conversationId, trimmed);
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
  }
  function cancelCreateNew() {
    setIsCreatingNew(false);
    setNewChatDraft("");
  }

  return (
    <aside className="flex h-full flex-col gap-1 overflow-y-auto rounded-[4px] bg-surface-container-low p-3">
      {/* Header: count + New button */}
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          Chats · {conversations.length}/{maxConversations}
        </span>
        <button
          type="button"
          onClick={startCreateNew}
          disabled={atLimit || isCreatingNew}
          title={atLimit ? "Delete a chat to create a new one" : "New chat"}
          className="inline-flex items-center gap-1 rounded-[4px] bg-on-surface px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            className="h-2.5 w-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New
        </button>
      </div>

      {/* New-chat inline input */}
      {isCreatingNew && (
        <div className="rounded-[4px] bg-surface-container-lowest p-2">
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
            onBlur={() => {
              // Commit-on-blur with empty string is OK (auto-name).
              if (isCreatingNew) commitCreateNew();
            }}
            className="w-full rounded-[4px] bg-surface-container-low px-2 py-1.5 text-[12.5px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/60"
          />
          <div className="mt-1 px-1 font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface-variant">
            Enter to create · Esc to cancel
          </div>
        </div>
      )}

      {/* Empty state */}
      {conversations.length === 0 && !isCreatingNew && (
        <div className="px-1 pt-1 text-[12px] text-on-surface-variant">
          No conversations yet. Click <span className="font-mono">New</span> to start.
        </div>
      )}

      {/* List */}
      <motion.div layout className="flex flex-col gap-1">
        {conversations.map((conv, idx) => {
          const isActive = conv.id === currentId;
          const title = conv.title?.trim() || "New chat";

          if (confirmingId === conv.id) {
            return (
              <motion.div
                key={conv.id}
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: durations.normal,
                  ease: easings.standard,
                  delay: Math.min(idx * staggers.list, 0.4),
                }}
                className="rounded-[4px] bg-surface-container-lowest px-3 py-2"
              >
                <InlineConfirm
                  message="Delete this chat?"
                  onConfirm={() => {
                    onDelete(conv.id);
                    setConfirmingId(null);
                  }}
                  onCancel={() => setConfirmingId(null)}
                />
              </motion.div>
            );
          }

          if (renamingId === conv.id) {
            return (
              <motion.div
                key={conv.id}
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: durations.normal,
                  ease: easings.standard,
                  delay: Math.min(idx * staggers.list, 0.4),
                }}
                className="rounded-[4px] bg-surface-container-lowest px-2 py-1.5"
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
                  className="w-full rounded-[4px] bg-surface-container-low px-2 py-1.5 text-[12.5px] text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/60"
                />
                <div className="mt-0.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface-variant">
                  <span>Enter to save · Esc to cancel</span>
                  <span>{renameDraft.length}/255</span>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={conv.id}
              layout
              initial={prefersReducedMotion ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: durations.normal,
                ease: easings.standard,
                delay: Math.min(idx * staggers.list, 0.4),
              }}
              className="group relative rounded-[4px] px-2.5 py-2 hover:bg-surface-container-lowest"
            >
              {isActive ? (
                prefersReducedMotion ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-[2px] bg-surface-container-lowest"
                  />
                ) : (
                  <motion.span
                    aria-hidden
                    layoutId="rail-active"
                    className="absolute inset-0 -z-10 rounded-[2px] bg-surface-container-lowest"
                    transition={{ ...springs.snappy }}
                  />
                )
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(conv.id)}
                className="relative flex w-full min-w-0 flex-col items-start pr-12 text-left"
              >
                <span
                  className={`flex w-full min-w-0 items-center gap-1.5 text-[12.5px] leading-tight ${
                    isActive
                      ? "font-semibold text-on-surface"
                      : "text-on-surface"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                </span>
                <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/70">
                  {friendlyAgo(conv.createdAt)}
                </span>
              </button>

              {/* Hover actions */}
              <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(conv);
                  }}
                  aria-label="Rename conversation"
                  className="relative flex h-6 w-6 items-center justify-center rounded-[4px] text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
                >
                  <svg
                    className="h-3 w-3"
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
                  className="relative flex h-6 w-6 items-center justify-center rounded-[4px] text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                >
                  <svg
                    className="h-3 w-3"
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
            </motion.div>
          );
        })}
      </motion.div>
    </aside>
  );
}
