"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { ChatMessage } from "@/components/chat/chat-message";
import { CitationBadge } from "@/components/chat/citation-badge";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  isPending: boolean;
  pendingChunkCount?: number;
  selectedMessageId?: string | null;
  onMessageSelect?: (messageId: string) => void;
  onCitationClick?: (chunkId: string, messageId: string) => void;
  streamingContent?: string | null;
  streamPhase?: "retrieving" | "generating" | null;
}

// Matches citation blocks in assistant prose — same pattern as chat-message.tsx
const CITATION_BLOCK_REGEX =
  /\[Feedback\s+#?\d+(?:\s*[-,]\s*#?\d+)*\]/g;

function renderStreamingContent(content: string): ReactNode[] {
  CITATION_BLOCK_REGEX.lastIndex = 0;
  const blocks = content.match(CITATION_BLOCK_REGEX) ?? [];
  const parts = content.split(CITATION_BLOCK_REGEX);
  const out: ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      out.push(<span key={`txt-${i}`}>{parts[i]}</span>);
    }
    if (i < blocks.length) {
      const nums = blocks[i].match(/\d+/g) ?? [];
      nums.forEach((n, j) => {
        out.push(
          <CitationBadge
            key={`cite-${i}-${j}`}
            index={Number(n)}
            chunk={undefined}
          />,
        );
      });
    }
  }
  return out;
}

export function MessageList({
  messages,
  isPending,
  pendingChunkCount,
  selectedMessageId,
  onMessageSelect,
  onCitationClick,
  streamingContent,
  streamPhase,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPending, streamingContent]);

  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          isSelected={selectedMessageId === msg.id}
          onSelect={msg.role === "assistant" ? onMessageSelect : undefined}
          onCitationClick={onCitationClick}
        />
      ))}
      {streamPhase === "retrieving" && (
        <PendingBubble chunkCount={pendingChunkCount} />
      )}
      {streamPhase === "generating" && streamingContent != null && (
        <StreamingBubble content={streamingContent} />
      )}
      {isPending && !streamPhase && (
        <PendingBubble chunkCount={pendingChunkCount} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function PendingBubble({ chunkCount }: { chunkCount?: number }) {
  const label =
    chunkCount && chunkCount > 0
      ? `Searching ${chunkCount} feedback chunks…`
      : "Searching your feedback…";
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-3 rounded-[4px] bg-surface-container-lowest px-5 py-4">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:300ms]" />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
          {label}
        </div>
      </div>
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-[4px] bg-surface-container-lowest px-5 py-4">
        <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          Trawl
        </div>
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-on-surface">
          {content ? renderStreamingContent(content) : null}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-secondary" />
        </div>
      </div>
    </div>
  );
}
