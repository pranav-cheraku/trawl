"use client";

import { ChatMessage } from "@/components/chat/chat-message";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  isPending: boolean;
  selectedMessageId?: string | null;
  onMessageSelect?: (messageId: string) => void;
  onCitationClick?: (chunkId: string, messageId: string) => void;
}

export function MessageList({
  messages,
  isPending,
  selectedMessageId,
  onMessageSelect,
  onCitationClick,
}: MessageListProps) {
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
      {isPending && <PendingBubble />}
    </div>
  );
}

function PendingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-3 rounded-[4px] bg-surface-container-lowest px-5 py-4">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:300ms]" />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
          Searching your feedback…
        </div>
      </div>
    </div>
  );
}
