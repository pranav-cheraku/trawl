"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput, type ChatInputHandle } from "@/components/chat/chat-input";
import { CitationLinkOverlay } from "@/components/chat/citation-link-overlay";
import { ConversationRail } from "@/components/chat/conversation-rail";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageList } from "@/components/chat/message-list";
import { XrayPanel } from "@/components/rag-xray/xray-panel";
import { SourceScopeMenu } from "@/components/sources/source-scope-menu";
import { CitationLinkProvider } from "@/lib/citation-link-context";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  listSources,
  sendMessage,
  updateConversation,
} from "@/lib/api";
import { useSourceScope } from "@/lib/use-source-scope";
import type { Conversation, Message, Source } from "@/types";

const MAX_CONVERSATIONS_PER_PROJECT = 10;

function sessionStorageKey(projectId: string): string {
  return `trawl:explore:${projectId}:conversationId`;
}

type MountStatus = "loading" | "ready" | "no-sources";

export default function ExplorePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [mountStatus, setMountStatus] = useState<MountStatus>("loading");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
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

  const sourceScope = useSourceScope(projectId, "explore");

  // Derived from `sources` state — computed early so callbacks can reference it.
  const readySources = sources.filter((s) => s.status === "ready");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPending, failedSend]);

  // If the viewport widens past lg while the mobile X-Ray sheet is open
  // (e.g. user rotates a tablet or resizes the dev window), auto-close it
  // so the desktop X-Ray pane is the single source of truth.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) setIsMobileSheetOpen(false);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Initial mount: fetch conversation list, restore saved conversation,
  // check sources readiness. The cancelled flag handles React Strict Mode's
  // intentional double-mount.
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      // Fetch the conversation list and sources in parallel. Sources drives the
      // corpus context strip and the no-sources gate; conversation list drives
      // the rail. Both are needed regardless of which branch we take below.
      const [convResult, sourcesResult] = await Promise.allSettled([
        listConversations(projectId),
        listSources(projectId),
      ]);
      if (cancelled) return;

      const convList: Conversation[] =
        convResult.status === "fulfilled" ? convResult.value : [];
      setConversations(convList);

      const fetchedSources =
        sourcesResult.status === "fulfilled" ? sourcesResult.value : [];
      setSources(fetchedSources);

      const savedId =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(sessionStorageKey(projectId))
          : null;

      // Try to restore the saved conversation only if it still exists
      // in the list (the user may have deleted it in another tab).
      if (savedId && convList.some((c) => c.id === savedId)) {
        try {
          const conversation = await getConversation(projectId, savedId);
          if (cancelled) return;
          setConversationId(conversation.id);
          setMessages(conversation.messages);
          setMountStatus("ready");
          return;
        } catch {
          // Conversation vanished server-side — clear and fall through.
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(sessionStorageKey(projectId));
          }
        }
      }

      // Decide mountStatus from the already-fetched sources.
      if (sourcesResult.status === "fulfilled") {
        const hasReady = fetchedSources.some((s) => s.status === "ready");
        setMountStatus(hasReady ? "ready" : "no-sources");
      } else {
        // Sources fetch failed — allow the user into the workspace rather than
        // locking them out.
        setMountStatus("ready");
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

      // Lazy-create the conversation on first send. Track this separately so
      // we only refetch the conversation list when an auto-title may have
      // been generated (i.e. on the very first message of a new lazy-created
      // conversation), rather than on every send.
      const isLazyCreating = !conversationId;
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
          sourceScope.activeIds(readySources),
        );
        setMessages((prev) => [...prev, assistant]);
        // New reply → auto-follow latest in the X-Ray panel.
        setSelectedMessageId(null);
        setFocusedChunkId(null);
        // Only refresh the conversation list when we just lazy-created — that's
        // the path where the backend may have auto-populated a title from the
        // first message. Subsequent sends don't change titles.
        if (isLazyCreating) {
          listConversations(projectId)
            .then(setConversations)
            .catch(() => {
              /* non-fatal */
            });
        }
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
    [conversationId, isPending, projectId, sourceScope, readySources],
  );

  const handleRetry = useCallback(() => {
    if (!failedSend) return;
    const { content, userBubbleId } = failedSend;
    handleSend(content, userBubbleId);
  }, [failedSend, handleSend]);

  const handleSelectConversation = useCallback(
    async (targetId: string) => {
      if (targetId === conversationId) return;
      setErrorMessage(null);
      setFailedSend(null);
      setSelectedMessageId(null);
      setFocusedChunkId(null);
      try {
        const conversation = await getConversation(projectId, targetId);
        setConversationId(conversation.id);
        setMessages(conversation.messages);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            sessionStorageKey(projectId),
            conversation.id,
          );
        }
      } catch {
        setErrorMessage("Couldn't load that conversation. Try again.");
      }
    },
    [conversationId, projectId],
  );

  const handleNewConversation = useCallback(
    async (title: string | null) => {
      if (conversations.length >= MAX_CONVERSATIONS_PER_PROJECT) return;
      setErrorMessage(null);
      setFailedSend(null);
      setSelectedMessageId(null);
      setFocusedChunkId(null);
      try {
        const newConv = await createConversation(projectId, title);
        setConversations((prev) => [newConv, ...prev]);
        setConversationId(newConv.id);
        setMessages([]);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            sessionStorageKey(projectId),
            newConv.id,
          );
        }
        // Focus the input so the user can start typing immediately.
        setTimeout(() => inputRef.current?.focus(), 0);
      } catch {
        setErrorMessage("Couldn't create a new chat. Please try again.");
      }
    },
    [conversations.length, projectId],
  );

  const handleDeleteConversation = useCallback(
    async (targetId: string) => {
      try {
        await deleteConversation(projectId, targetId);
        setConversations((prev) => prev.filter((c) => c.id !== targetId));
        // If we deleted the currently-open conversation, clear the view.
        if (targetId === conversationId) {
          setConversationId(null);
          setMessages([]);
          setSelectedMessageId(null);
          setFocusedChunkId(null);
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(sessionStorageKey(projectId));
          }
        }
      } catch {
        setErrorMessage("Couldn't delete that chat. Please try again.");
      }
    },
    [conversationId, projectId],
  );

  const handleRenameConversation = useCallback(
    async (targetId: string, title: string) => {
      // Optimistic update so the switcher updates immediately.
      setConversations((prev) =>
        prev.map((c) => (c.id === targetId ? { ...c, title } : c)),
      );
      try {
        await updateConversation(projectId, targetId, title);
      } catch {
        setErrorMessage("Couldn't rename the chat. Refresh to recover.");
        // Refetch to revert the optimistic change.
        listConversations(projectId)
          .then(setConversations)
          .catch(() => {
            /* non-fatal */
          });
      }
    },
    [projectId],
  );

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
    return (
      <NoSourcesState
        projectId={projectId}
        onSourcesReady={(refreshed) => {
          setSources(refreshed);
          setMountStatus("ready");
        }}
      />
    );
  }

  const reviewCount = sources.reduce(
    (acc, s) => acc + (s.recordCount ?? 0),
    0
  );

  return (
    <CitationLinkProvider>
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-3">
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

      {/* Corpus context strip — spans the full width of the workspace */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[4px] bg-surface-container-lowest px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[13px] font-medium text-on-surface">
              {reviewCount.toLocaleString()}
            </span>
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-on-surface-variant/60">
              Reviews Indexed
            </span>
          </div>
          {readySources.length > 0 && (
            <>
              <span aria-hidden className="h-4 w-px bg-on-surface/[0.08]" />
              <SourceScopeMenu
                sources={readySources}
                mutedIds={sourceScope.mutedIds}
                onToggle={sourceScope.toggle}
                onEnableAll={sourceScope.clear}
                ariaLabel="Active sources for this conversation"
              />
            </>
          )}
        </div>
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/60">
          Explore / Conversation
        </span>
      </div>

      {/* Tri-column workspace — lg: rail | chat | xray; <lg: stack */}
      <div className="grid flex-1 gap-3 overflow-hidden lg:grid-cols-[200px_1fr_380px] xl:grid-cols-[220px_1fr_440px]">
        {/* Conversation rail — desktop only */}
        <div className="hidden lg:block">
          <ConversationRail
            conversations={conversations}
            currentId={conversationId}
            maxConversations={MAX_CONVERSATIONS_PER_PROJECT}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
          />
        </div>

        {/* Chat column — contains messages + input */}
        <div className="flex flex-col overflow-hidden rounded-[4px] bg-surface-container-low">
          {/* Mobile: rail collapses into a horizontal scrollable chip row */}
          <div className="flex items-center gap-2 overflow-x-auto bg-surface-container-low px-3 py-2 shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)] lg:hidden">
            <button
              type="button"
              onClick={() => handleNewConversation(null)}
              disabled={
                conversations.length >= MAX_CONVERSATIONS_PER_PROJECT
              }
              className="flex-shrink-0 rounded-[4px] bg-on-surface px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-surface-container-lowest disabled:opacity-40"
            >
              + New
            </button>
            {conversations.map((c) => {
              const isActive = c.id === conversationId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectConversation(c.id)}
                  className={`flex-shrink-0 rounded-[4px] px-2 py-1 text-[11.5px] ${
                    isActive
                      ? "bg-surface-container-lowest font-semibold text-on-surface"
                      : "bg-transparent text-on-surface-variant"
                  }`}
                >
                  {c.title?.trim() || "New chat"}
                </button>
              );
            })}
          </div>

          {/* Scroll area */}
          <div className="flex-1 overflow-y-auto p-5">
            {messages.length === 0 && !isPending ? (
              <EmptyState onExampleClick={handleExampleClick} />
            ) : (
              <div className="flex flex-col gap-4">
                <MessageList
                  messages={messages}
                  isPending={isPending}
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

          {/* Input anchored inside the chat column */}
          <div className="bg-surface-container-lowest p-3 shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]">
            {sourceScope.activeIds(readySources).length === 0 ? (
              <div
                role="status"
                className="rounded-[4px] bg-surface-container-low px-3 py-3 text-[12.5px] text-on-surface-variant"
              >
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Scope empty —
                </span>{" "}
                activate at least one source above to ask a question.
              </div>
            ) : (
              <ChatInput
                ref={inputRef}
                onSend={handleSend}
                isPending={isPending}
                draft={draft}
                onDraftChange={setDraft}
              />
            )}
          </div>
        </div>

        {/* X-Ray panel — desktop only, wider than before */}
        <div className="hidden overflow-hidden lg:block">
          <XrayPanel
            variant="chat"
            projectId={projectId}
            selectedMessage={activeMessage}
            focusedChunkId={focusedChunkId}
            focusTick={focusTick}
          />
        </div>
      </div>

      {/* Mobile bottom sheet for X-Ray panel — unchanged */}
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
                variant="chat"
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
    <CitationLinkOverlay />
    </CitationLinkProvider>
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

interface NoSourcesStateProps {
  projectId: string;
  onSourcesReady: (sources: Source[]) => void;
}

function NoSourcesState({ projectId, onSourcesReady }: NoSourcesStateProps) {
  // Background poll so a user who lands here while a source is still ingesting
  // gets auto-recovered into the workspace once at least one source is ready.
  // No visible indicator — the recovery is silent (workspace just appears).
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const fetched = await listSources(projectId);
        if (fetched.some((s) => s.status === "ready")) {
          onSourcesReady(fetched);
        }
      } catch {
        // Network blips are non-fatal; keep polling.
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [projectId, onSourcesReady]);

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
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
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
