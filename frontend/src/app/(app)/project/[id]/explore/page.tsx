"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput, type ChatInputHandle } from "@/components/chat/chat-input";
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
  const [failedSend, setFailedSend] = useState<{
    content: string;
    userBubbleId: string;
    detail: string;
  } | null>(null);

  // Which assistant message the X-Ray panel is showing. null means auto-follow
  // the most recent assistant message.
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );

  // X-Ray focus plumbing
  const [focusedChunkId, setFocusedChunkId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Input imperative handle — lets us focus the textarea after chip click.
  const inputRef = useRef<ChatInputHandle>(null);

  // Ref at the very bottom of the chat column so auto-scroll can include
  // the FailedMessageBubble (which renders after MessageList's own bottom).
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPending, failedSend]);

  // Initial mount: try to restore a saved conversation, otherwise check sources.
  // The cancelled flag handles React Strict Mode's intentional double-mount:
  // the first effect's cleanup sets cancelled=true, the second effect runs
  // fresh with its own cancelled=false and wins the state update race.
  useEffect(() => {
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

  const handleCitationClick = useCallback(
    (chunkId: string, messageId: string) => {
      // Switch the X-Ray panel to the clicked message AND scroll to the
      // specific chunk inside it.
      setSelectedMessageId(messageId);
      setFocusedChunkId(chunkId);
      setFocusTick((t) => t + 1);
      setIsMobileSheetOpen(true);
    },
    [],
  );

  const handleMessageSelect = useCallback((messageId: string) => {
    // Plain bubble click: switch the X-Ray to that message. Clear any
    // pending scroll-to-chunk highlight since it was for a different message.
    setSelectedMessageId(messageId);
    setFocusedChunkId(null);
  }, []);

  const handleSend = useCallback(
    async (content: string, reuseBubbleId?: string) => {
      if (isPending) return;
      setErrorMessage(null);
      setFailedSend(null);

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

      // Optimistic user bubble — reuse the existing one on retry so the
      // failed bubble visually becomes the now-pending bubble.
      const bubbleId = reuseBubbleId ?? `temp-user-${Date.now()}`;
      if (!reuseBubbleId) {
        const optimisticUser: Message = {
          id: bubbleId,
          conversationId: activeConversationId,
          role: "user",
          content,
          sourceChunkIds: [],
          transparency: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticUser]);
      }
      setIsPending(true);

      try {
        const assistant = await sendMessage(
          projectId,
          activeConversationId,
          content,
        );
        setMessages((prev) => [...prev, assistant]);
        // New reply → auto-follow latest in the X-Ray panel.
        setSelectedMessageId(null);
        setFocusedChunkId(null);
      } catch (err) {
        // Keep the optimistic bubble on screen; show an inline retry UI.
        // Always log the raw error for devtools debugging.
        // eslint-disable-next-line no-console
        console.error("sendMessage failed:", err);

        const statusMatch =
          err instanceof Error
            ? err.message.match(/API error:\s*(\d+)/)
            : null;
        const status = statusMatch ? parseInt(statusMatch[1], 10) : null;

        let detail: string;
        if (status === 400) {
          detail =
            "Your feedback sources aren't ready yet. Check the Sources tab.";
        } else if (status === 504) {
          detail =
            "Claude took too long to respond. The model is busy — retry should work.";
        } else if (status === 500) {
          detail =
            "The server hit an error. If this keeps happening, check the backend logs and confirm ANTHROPIC_API_KEY is set.";
        } else if (status !== null) {
          detail = `The server returned ${status}. Try again.`;
        } else {
          detail =
            "Couldn't reach the backend. Is the API server running?";
        }

        setFailedSend({ content, userBubbleId: bubbleId, detail });
      } finally {
        setIsPending(false);
      }
    },
    [conversationId, isPending, projectId],
  );

  const handleRetry = useCallback(() => {
    if (!failedSend) return;
    const { content, userBubbleId } = failedSend;
    handleSend(content, userBubbleId);
  }, [failedSend, handleSend]);

  const handleExampleClick = useCallback((query: string) => {
    setDraft(query);
    // Focus the textarea so the user can just hit Enter.
    // Wait one tick so the controlled update has flushed.
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Panel reflects the explicitly-selected assistant message, or (if none
  // is selected) falls back to the most recent assistant reply.
  const activeMessage = (() => {
    if (selectedMessageId) {
      const found = messages.find((m) => m.id === selectedMessageId);
      if (found && found.role === "assistant") return found;
    }
    return [...messages].reverse().find((m) => m.role === "assistant") ?? null;
  })();

  if (mountStatus === "loading") {
    return (
      <div className="flex h-[calc(100vh-20rem)] items-center justify-center rounded-[4px] bg-surface-container-low">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
          Loading workspace…
        </div>
      </div>
    );
  }

  if (mountStatus === "no-sources") {
    return <NoSourcesState projectId={projectId} />;
  }

  return (
    <div className="flex h-[calc(100vh-20rem)] flex-col gap-4">
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-[4px] bg-error/10 px-4 py-3 text-[13px] text-error">
          <div className="flex items-center gap-2">
            <WarningIcon />
            <span>{errorMessage}</span>
          </div>
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
              <EmptyState onExampleClick={handleExampleClick} />
            ) : (
              <div className="flex flex-col gap-4">
                <MessageList
                  messages={messages}
                  isPending={isPending}
                  pendingChunkCount={8}
                  selectedMessageId={activeMessage?.id ?? null}
                  onMessageSelect={handleMessageSelect}
                  onCitationClick={handleCitationClick}
                />
                {failedSend && !isPending && (
                  <FailedMessageBubble
                    detail={failedSend.detail}
                    onRetry={handleRetry}
                  />
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </div>
        <div className="hidden overflow-hidden lg:block">
          <XrayPanel
            projectId={projectId}
            selectedMessage={activeMessage}
            focusedChunkId={focusedChunkId}
            focusTick={focusTick}
          />
        </div>
      </div>

      <ChatInput
        ref={inputRef}
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
                projectId={projectId}
                selectedMessage={activeMessage}
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

function WarningIcon() {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    </svg>
  );
}

interface FailedMessageBubbleProps {
  detail: string;
  onRetry: () => void;
}

function FailedMessageBubble({ detail, onRetry }: FailedMessageBubbleProps) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-3 rounded-[4px] bg-error/10 px-4 py-3">
        <div className="mt-0.5 text-error">
          <WarningIcon />
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[13px] leading-relaxed text-error">{detail}</div>
          <button
            type="button"
            onClick={onRetry}
            className="self-start rounded-[4px] bg-on-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function NoSourcesState({ projectId }: { projectId: string }) {
  return (
    <div className="flex h-[calc(100vh-20rem)] items-center justify-center rounded-[4px] bg-surface-container-low">
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
