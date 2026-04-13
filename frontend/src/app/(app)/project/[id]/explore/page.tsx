"use client";

import { useState } from "react";

import { ChatInput } from "@/components/chat/chat-input";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageList } from "@/components/chat/message-list";
import { XrayPanel } from "@/components/rag-xray/xray-panel";
import type { Message, Transparency } from "@/types";

// ── Temporary mock data (removed in CP8 when real API is wired up) ──────────

const MOCK_TRANSPARENCY: Transparency = {
  query: "What do users complain about the most?",
  retrievedChunks: [
    {
      chunkId: "11111111-1111-1111-1111-111111111111",
      feedbackItemId: "aaaa0001-0000-0000-0000-000000000000",
      chunkTextPreview:
        "I can't log in after the latest update. The app just spins forever on the loading screen. Super frustrating.",
      similarityScore: 0.87,
      retrievalRank: 1,
      sourceType: "app_store",
      sourceName: "Duolingo",
    },
    {
      chunkId: "22222222-2222-2222-2222-222222222222",
      feedbackItemId: "aaaa0002-0000-0000-0000-000000000000",
      chunkTextPreview:
        "App crashes every time I try to open a lesson. Been like this for three days. Please fix.",
      similarityScore: 0.81,
      retrievalRank: 2,
      sourceType: "app_store",
      sourceName: "Duolingo",
    },
    {
      chunkId: "33333333-3333-3333-3333-333333333333",
      feedbackItemId: "aaaa0003-0000-0000-0000-000000000000",
      chunkTextPreview:
        "Why are there so many ads now? I'm paying for super and still seeing ads between lessons. Not okay.",
      similarityScore: 0.76,
      retrievalRank: 3,
      sourceType: "app_store",
      sourceName: "Duolingo",
    },
    {
      chunkId: "44444444-4444-4444-4444-444444444444",
      feedbackItemId: "aaaa0004-0000-0000-0000-000000000000",
      chunkTextPreview:
        "Customer support has been unreachable for a week. Opened a ticket, no response.",
      similarityScore: 0.72,
      retrievalRank: 4,
      sourceType: "app_store",
      sourceName: "Duolingo",
    },
  ],
  modelUsed: "claude-sonnet-4-20250514",
  topK: 8,
  threshold: 0.3,
  totalChunksSearched: 342,
  retrievalLatencyMs: 118,
  generationLatencyMs: 4240,
  inputTokens: 1820,
  outputTokens: 340,
};

const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-user-1",
    conversationId: "conv-1",
    role: "user",
    content: "What do users complain about the most?",
    sourceChunkIds: [],
    transparency: null,
    createdAt: "2026-04-13T19:30:00Z",
  },
  {
    id: "msg-assistant-1",
    conversationId: "conv-1",
    role: "assistant",
    content:
      "Users are most frustrated by login failures after recent updates [Feedback #1] and frequent app crashes when opening lessons [Feedback #2]. A separate but significant complaint is that paying subscribers are still seeing ads between lessons [Feedback #3]. Several users also mention unresponsive customer support [Feedback #4].",
    sourceChunkIds: [
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      "44444444-4444-4444-4444-444444444444",
    ],
    transparency: MOCK_TRANSPARENCY,
    createdAt: "2026-04-13T19:30:08Z",
  },
];

// ─────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [isPending, setIsPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [focusedChunkId, setFocusedChunkId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  // Show X-Ray for the most recent assistant message.
  const lastAssistantMessage =
    [...messages].reverse().find((m) => m.role === "assistant") ?? null;

  function handleSend(content: string) {
    // Mock: append user message, simulate 1.5s pending, append canned assistant reply
    const userMsg: Message = {
      id: `mock-user-${Date.now()}`,
      conversationId: "conv-1",
      role: "user",
      content,
      sourceChunkIds: [],
      transparency: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsPending(true);

    setTimeout(() => {
      const replyMsg: Message = {
        id: `mock-assistant-${Date.now()}`,
        conversationId: "conv-1",
        role: "assistant",
        content: `Mock response for "${content}". Real RAG response wires in CP8. Example citation [Feedback #1] and [Feedback #2].`,
        sourceChunkIds: MOCK_MESSAGES[1].sourceChunkIds.slice(0, 2),
        transparency: MOCK_TRANSPARENCY,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, replyMsg]);
      setIsPending(false);
    }, 1500);
  }

  function handleCitationClick(chunkId: string) {
    setFocusedChunkId(chunkId);
    setFocusTick((t) => t + 1);
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      {/* Dev harness toggle — removed in CP8 */}
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
        <span>dev harness (cp6)</span>
        <button
          type="button"
          onClick={() => {
            setShowEmpty((v) => !v);
            setMessages(showEmpty ? MOCK_MESSAGES : []);
          }}
          className="rounded-[4px] bg-surface-container-lowest px-2 py-1 hover:bg-surface-container-high"
        >
          {showEmpty ? "show mock messages" : "show empty state"}
        </button>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[2fr_1fr]">
        <div className="overflow-y-auto rounded-[4px] bg-surface-container-low p-6">
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
    </div>
  );
}
