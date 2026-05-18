"use client";
// Demo Explore page: mirrors the authenticated Explore tab but calls apiFetch
// with { demo: true } to swap Bearer auth for X-Demo-Token. Write operations
// are blocked by the isDemo guard (demo mode is read-only at the middleware level).
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChatInput, type ChatInputHandle } from "@/components/chat/chat-input";
import { ConversationRail } from "@/components/chat/conversation-rail";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageList } from "@/components/chat/message-list";
import { RagSettingsMenu } from "@/components/rag-xray/rag-settings-menu";
import { XrayPanel } from "@/components/rag-xray/xray-panel";
import { SourceScopeMenu } from "@/components/sources/source-scope-menu";
import DemoProjectLayout from "@/components/demo/demo-project-layout";
import { apiFetch } from "@/lib/api";
import { useDemoMode } from "@/lib/demo-mode";
import { useRagSettings } from "@/lib/use-rag-settings";
import { useSourceScope } from "@/lib/use-source-scope";
import type { Conversation, ConversationDetail, Message, Source } from "@/types";

const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ?? "";
const DEMO_PROJECT_NAME = "Notion – App Reviews";
const MAX_CONVERSATIONS_PER_PROJECT = 10;

function sessionStorageKey(projectId: string): string {
  return `trawl:explore:${projectId}:conversationId`;
}

type MountStatus = "loading" | "ready" | "no-sources";

export default function DemoExplorePage() {
  const isDemo = useDemoMode();
  const projectId = DEMO_PROJECT_ID;

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
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [focusedChunkId, setFocusedChunkId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const inputRef = useRef<ChatInputHandle>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const sourceScope = useSourceScope(projectId, "explore");
  const rag = useRagSettings(projectId);

  const readySources = useMemo(
    () => sources.filter((s) => s.status === "ready"),
    [sources],
  );

  const activeSourceIds = useMemo(
    () => sourceScope.activeIds(readySources),
    [sourceScope, readySources],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPending, failedSend]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) setIsMobileSheetOpen(false);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileSheetOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMobileSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileSheetOpen]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function initialize() {
      const [convResult, sourcesResult] = await Promise.allSettled([
        apiFetch<Conversation[]>(`/api/projects/${projectId}/conversations`, { demo: isDemo }),
        apiFetch<Source[]>(`/api/projects/${projectId}/sources`, { demo: isDemo }),
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

      if (savedId && convList.some((c) => c.id === savedId)) {
        try {
          const conversation = await apiFetch<ConversationDetail>(
            `/api/projects/${projectId}/conversations/${savedId}`,
            { demo: isDemo },
          );
          if (cancelled) return;
          setConversationId(conversation.id);
          setMessages(conversation.messages);
          setMountStatus("ready");
          return;
        } catch {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(sessionStorageKey(projectId));
          }
        }
      }

      if (sourcesResult.status === "fulfilled") {
        const hasReady = fetchedSources.some((s) => s.status === "ready");
        setMountStatus(hasReady ? "ready" : "no-sources");
      } else {
        setMountStatus("ready");
      }
    }

    initialize();
    return () => {
      cancelled = true;
    };
  }, [projectId, isDemo]);

  const handleCitationClick = useCallback(
    (chunkId: string, messageId: string) => {
      setSelectedMessageId(messageId);
      setFocusedChunkId(chunkId);
      setFocusTick((t) => t + 1);
      setIsMobileSheetOpen(true);
    },
    [],
  );

  const handleMessageSelect = useCallback((messageId: string) => {
    setSelectedMessageId(messageId);
    setFocusedChunkId(null);
  }, []);

  const handleSend = useCallback(
    async (content: string, reuseBubbleId?: string) => {
      if (isPending || isDemo) return;
      setErrorMessage(null);
      setFailedSend(null);

      const isLazyCreating = !conversationId;
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        try {
          const newConversation = await apiFetch<Conversation>(
            `/api/projects/${projectId}/conversations`,
            { method: "POST", body: JSON.stringify({}), demo: isDemo },
          );
          activeConversationId = newConversation.id;
          setConversationId(newConversation.id);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              sessionStorageKey(projectId),
              newConversation.id,
            );
          }
        } catch {
          setErrorMessage("Couldn't start a conversation. Please try again.");
          return;
        }
      }

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
        const body: {
          content: string;
          sourceIds?: string[];
          topK?: number;
          threshold?: number;
        } = { content };
        if (activeSourceIds !== undefined) body.sourceIds = activeSourceIds;
        if (rag.settings.topK !== undefined) body.topK = rag.settings.topK;
        if (rag.settings.threshold !== undefined)
          body.threshold = rag.settings.threshold;

        const assistant = await apiFetch<Message>(
          `/api/projects/${projectId}/conversations/${activeConversationId}/messages`,
          { method: "POST", body: JSON.stringify(body), demo: isDemo },
        );
        setMessages((prev) => [...prev, assistant]);
        setSelectedMessageId(null);
        setFocusedChunkId(null);
        if (isLazyCreating) {
          apiFetch<Conversation[]>(
            `/api/projects/${projectId}/conversations`,
            { demo: isDemo },
          )
            .then(setConversations)
            .catch(() => {});
        }
      } catch (err) {
        const statusMatch =
          err instanceof Error
            ? err.message.match(/API error:\s*(\d+)/)
            : null;
        const status = statusMatch ? parseInt(statusMatch[1], 10) : null;

        let detail: string;
        if (status === 400) {
          detail = "Your feedback sources aren't ready yet. Check the Sources tab.";
        } else if (status === 504) {
          detail = "The model took too long to respond. Retry should work.";
        } else if (status === 500) {
          detail = "The server hit an error. If this keeps happening, check the backend logs.";
        } else if (status !== null) {
          detail = `The server returned ${status}. Try again.`;
        } else {
          detail = "Couldn't reach the backend. Is the API server running?";
        }

        setFailedSend({ content, userBubbleId: bubbleId, detail });
      } finally {
        setIsPending(false);
      }
    },
    [conversationId, isPending, isDemo, projectId, activeSourceIds, rag.settings],
  );

  const handleRetry = useCallback(() => {
    if (!failedSend) return;
    handleSend(failedSend.content, failedSend.userBubbleId);
  }, [failedSend, handleSend]);

  const handleSelectConversation = useCallback(
    async (targetId: string) => {
      if (targetId === conversationId) return;
      setErrorMessage(null);
      setFailedSend(null);
      setSelectedMessageId(null);
      setFocusedChunkId(null);
      try {
        const conversation = await apiFetch<ConversationDetail>(
          `/api/projects/${projectId}/conversations/${targetId}`,
          { demo: isDemo },
        );
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
    [conversationId, projectId, isDemo],
  );

  const handleNewConversation = useCallback(
    async (title: string | null) => {
      if (isDemo) return;
      if (conversations.length >= MAX_CONVERSATIONS_PER_PROJECT) return;
      setErrorMessage(null);
      setFailedSend(null);
      setSelectedMessageId(null);
      setFocusedChunkId(null);
      try {
        const newConv = await apiFetch<Conversation>(
          `/api/projects/${projectId}/conversations`,
          { method: "POST", body: JSON.stringify({ title }), demo: isDemo },
        );
        setConversations((prev) => [newConv, ...prev]);
        setConversationId(newConv.id);
        setMessages([]);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(sessionStorageKey(projectId), newConv.id);
        }
        setTimeout(() => inputRef.current?.focus(), 0);
      } catch {
        setErrorMessage("Couldn't create a new chat. Please try again.");
      }
    },
    [conversations.length, projectId, isDemo],
  );

  const handleDeleteConversation = useCallback(
    async (targetId: string) => {
      if (isDemo) return;
      try {
        await apiFetch<void>(
          `/api/projects/${projectId}/conversations/${targetId}`,
          { method: "DELETE", demo: isDemo },
        );
        setConversations((prev) => prev.filter((c) => c.id !== targetId));
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
    [conversationId, projectId, isDemo],
  );

  const handleRenameConversation = useCallback(
    async (targetId: string, title: string) => {
      if (isDemo) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === targetId ? { ...c, title } : c)),
      );
      try {
        await apiFetch<Conversation>(
          `/api/projects/${projectId}/conversations/${targetId}`,
          { method: "PATCH", body: JSON.stringify({ title }), demo: isDemo },
        );
      } catch {
        setErrorMessage("Couldn't rename the chat. Refresh to recover.");
        apiFetch<Conversation[]>(
          `/api/projects/${projectId}/conversations`,
          { demo: isDemo },
        )
          .then(setConversations)
          .catch(() => {});
      }
    },
    [projectId, isDemo],
  );

  const handleExampleClick = useCallback((query: string) => {
    setDraft(query);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const activeMessage = (() => {
    if (selectedMessageId) {
      const found = messages.find((m) => m.id === selectedMessageId);
      if (found && found.role === "assistant") return found;
    }
    return [...messages].reverse().find((m) => m.role === "assistant") ?? null;
  })();

  if (!projectId) {
    return (
      <DemoProjectLayout projectName={DEMO_PROJECT_NAME}>
        <div className="p-6 text-center text-on-surface-variant">
          Demo not configured.
        </div>
      </DemoProjectLayout>
    );
  }

  if (mountStatus === "loading") {
    return (
      <DemoProjectLayout projectName={DEMO_PROJECT_NAME}>
        <div className="flex h-[calc(100vh-16rem)] items-center justify-center rounded-[4px] bg-surface-container-low">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
            Loading workspace…
          </div>
        </div>
      </DemoProjectLayout>
    );
  }

  if (mountStatus === "no-sources") {
    return (
      <DemoProjectLayout projectName={DEMO_PROJECT_NAME}>
        <div className="flex h-[calc(100vh-16rem)] items-center justify-center rounded-[4px] bg-surface-container-low">
          <div className="flex max-w-md flex-col items-center px-8 py-16 text-center">
            <h2 className="text-lg font-bold text-on-surface">
              Demo data not yet seeded
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-on-surface-variant">
              The demo project is still being set up. Check back shortly.
            </p>
            <Link
              href="/demo/sources"
              className="mt-6 rounded-[4px] bg-on-surface px-4 py-2 text-[13px] text-white transition-colors hover:bg-secondary"
            >
              View Sources tab
            </Link>
          </div>
        </div>
      </DemoProjectLayout>
    );
  }

  const reviewCount = readySources.reduce(
    (acc, s) => acc + (s.recordCount ?? 0),
    0,
  );

  return (
    <DemoProjectLayout projectName={DEMO_PROJECT_NAME}>
      <div className="flex h-[calc(100vh-16rem)] flex-col gap-3">
        {errorMessage && (
          <div className="flex items-center justify-between gap-3 rounded-[4px] bg-error/10 px-4 py-3 text-[13px] text-error">
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

        {/* Corpus context strip */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[4px] bg-surface-container-lowest px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
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
            <span aria-hidden className="h-4 w-px bg-on-surface/[0.08]" />
            <RagSettingsMenu
              settings={rag.settings}
              onTopKChange={rag.setTopK}
              onThresholdChange={rag.setThreshold}
              onReset={rag.reset}
            />
          </div>
          <span className="hidden font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/60 sm:inline">
            Explore / Conversation
          </span>
        </div>

        {/* Workspace columns */}
        <div className="grid flex-1 gap-3 overflow-hidden lg:grid-cols-[200px_1fr_380px] xl:grid-cols-[220px_1fr_440px]">
          {/* Sidebar */}
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

          <div className="flex flex-col overflow-hidden rounded-[4px] bg-surface-container-low">
            <div className="flex items-center gap-2 overflow-x-auto bg-surface-container-low px-3 py-2 shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)] lg:hidden">
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
                    <div className="flex justify-start">
                      <div className="flex max-w-[85%] items-start gap-3 rounded-[4px] bg-error/10 px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <div className="text-[13px] leading-relaxed text-error">
                            {failedSend.detail}
                          </div>
                          <button
                            type="button"
                            onClick={handleRetry}
                            className="self-start rounded-[4px] bg-on-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-secondary"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="bg-surface-container-lowest p-3 shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]">
              {activeSourceIds.length === 0 ? (
                <div
                  role="status"
                  className="rounded-[4px] bg-surface-container-low px-3 py-3 text-[12.5px] text-on-surface-variant"
                >
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Scope empty:
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

          {/* X-Ray panel */}
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

        {/* Mobile sheet */}
        {isMobileSheetOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close RAG X-Ray panel"
              onClick={() => setIsMobileSheetOpen(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px]"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[75vh] rounded-t-[4px] bg-surface-container-low">
              <div className="relative flex items-center justify-center px-4 pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-surface-container-high" />
                <button
                  type="button"
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="absolute right-3 top-2 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface"
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
    </DemoProjectLayout>
  );
}
