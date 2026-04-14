"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/chat-input";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageList } from "@/components/chat/message-list";
import { XrayPanel } from "@/components/rag-xray/xray-panel";
import {
  createConversation,
  getConversation,
  listSources,
  sendMessage,
} from "@/lib/api";
import type { Message } from "@/types";

function sessionStorageKey(projectId: string): string {
  return `trawl:explore:${projectId}:conversationId`;
}

type MountStatus = "loading" | "ready" | "no-sources";

export default function ExplorePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [mountStatus, setMountStatus] = useState<MountStatus>("loading");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // X-Ray focus plumbing
  const [focusedChunkId, setFocusedChunkId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Avoid double-initializing in React strict mode dev re-mounts.
  const hasInitializedRef = useRef(false);

  // Initial mount: try to restore a saved conversation, otherwise check sources.
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    let cancelled = false;

    async function initialize() {
      const savedId =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(sessionStorageKey(projectId))
          : null;

      if (savedId) {
        try {
          const conversation = await getConversation(projectId, savedId);
          if (cancelled) return;
          setConversationId(conversation.id);
          setMessages(conversation.messages);
          setMountStatus("ready");
          return;
        } catch {
          // Saved conversation is gone — clear and fall through.
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(sessionStorageKey(projectId));
          }
        }
      }

      try {
        const sources = await listSources(projectId);
        if (cancelled) return;
        const hasReady = sources.some((s) => s.status === "ready");
        setMountStatus(hasReady ? "ready" : "no-sources");
      } catch {
        if (!cancelled) setMountStatus("ready");
      }
    }

    initialize();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleCitationClick = useCallback((chunkId: string) => {
    setFocusedChunkId(chunkId);
    setFocusTick((t) => t + 1);
    setIsMobileSheetOpen(true);
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (isPending) return;
      setErrorMessage(null);

      // Lazy-create the conversation on first send.
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        try {
          const newConversation = await createConversation(projectId);
          activeConversationId = newConversation.id;
          setConversationId(newConversation.id);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              sessionStorageKey(projectId),
              newConversation.id,
            );
          }
        } catch {
          setErrorMessage(
            "Couldn't start a conversation. Please try again.",
          );
          return;
        }
      }

      // Optimistic user bubble
      const optimisticId = `temp-user-${Date.now()}`;
      const optimisticUser: Message = {
        id: optimisticId,
        conversationId: activeConversationId,
        role: "user",
        content,
        sourceChunkIds: [],
        transparency: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);
      setIsPending(true);

      try {
        const assistant = await sendMessage(
          projectId,
          activeConversationId,
          content,
        );
        setMessages((prev) => [...prev, assistant]);
      } catch (err) {
        // Remove the optimistic bubble on failure so the user can retry.
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        const detail =
          err instanceof Error && err.message.includes("400")
            ? "Your feedback sources aren't ready yet. Check the Sources tab."
            : "Something went wrong. Please try again.";
        setErrorMessage(detail);
      } finally {
        setIsPending(false);
      }
    },
    [conversationId, isPending, projectId],
  );

  // Panel always reflects the most recent assistant message.
  const lastAssistantMessage =
    [...messages].reverse().find((m) => m.role === "assistant") ?? null;

  if (mountStatus === "loading") {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-[4px] bg-surface-container-low">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
          Loading conversation…
        </div>
      </div>
    );
  }

  if (mountStatus === "no-sources") {
    return <NoSourcesState projectId={projectId} />;
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      {errorMessage && (
        <div className="flex items-center justify-between rounded-[4px] bg-error/10 px-4 py-3 text-[13px] text-error">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-error hover:opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col overflow-hidden rounded-[4px] bg-surface-container-low">
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 && !isPending ? (
              <EmptyState onExampleClick={(q) => setDraft(q)} />
            ) : (
              <MessageList
                messages={messages}
                isPending={isPending}
                pendingChunkCount={8}
                onCitationClick={handleCitationClick}
              />
            )}
          </div>
        </div>
        <div className="hidden overflow-hidden lg:block">
          <XrayPanel
            selectedMessage={lastAssistantMessage}
            focusedChunkId={focusedChunkId}
            focusTick={focusTick}
          />
        </div>
      </div>

      <ChatInput
        onSend={handleSend}
        isPending={isPending}
        draft={draft}
        onDraftChange={setDraft}
      />

      {/* Mobile bottom sheet for X-Ray panel */}
      {isMobileSheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close RAG X-Ray panel"
            onClick={() => setIsMobileSheetOpen(false)}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] rounded-t-[4px] bg-surface-container-low">
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-surface-container-high" />
            </div>
            <div className="flex items-center justify-between px-4 pt-2 pb-1">
              <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                RAG X-Ray
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              <XrayPanel
                selectedMessage={lastAssistantMessage}
                focusedChunkId={focusedChunkId}
                focusTick={focusTick}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoSourcesState({ projectId }: { projectId: string }) {
  return (
    <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-[4px] bg-surface-container-low">
      <div className="flex max-w-md flex-col items-center px-8 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-surface-container">
          <svg
            className="h-5 w-5 text-on-surface-variant"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0 6 6m3 12c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z"
            />
          </svg>
        </div>
        <h2 className="mt-5 text-lg font-bold text-on-surface">
          No feedback to search yet
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-on-surface-variant">
          Connect an App Store app or upload a CSV on the Sources tab, then come
          back here to start asking questions.
        </p>
        <Link
          href={`/project/${projectId}/sources`}
          className="mt-6 rounded-[4px] bg-on-surface px-4 py-2 text-[13px] text-white transition-colors hover:bg-secondary"
        >
          Go to Sources tab
        </Link>
      </div>
    </div>
  );
}
