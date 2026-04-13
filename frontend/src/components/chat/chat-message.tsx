"use client";

import type { ReactNode } from "react";

import { CitationBadge } from "@/components/chat/citation-badge";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (chunkId: string) => void;
}

const CITATION_REGEX = /\[Feedback #(\d+)\]/g;

/**
 * Parse assistant prose into text segments and inline citation badges.
 *
 * Splits content on the `[Feedback #N]` token. Each N is a 1-indexed
 * position into the *full* retrieved-chunks list on the message's
 * transparency blob — NOT into sourceChunkIds (which is a compressed
 * list of only the chunks Claude reported as supporting the answer).
 */
function renderAssistantContent(
  content: string,
  message: Message,
  onCitationClick?: (chunkId: string) => void,
): ReactNode[] {
  const retrievedChunks = message.transparency?.retrievedChunks ?? [];
  // Split keeps delimiters when the regex has a capture group.
  const parts = content.split(/(\[Feedback #\d+\])/g);

  return parts.map((part, i) => {
    const match = part.match(/^\[Feedback #(\d+)\]$/);
    if (match) {
      const idx = Number(match[1]);
      const chunk = retrievedChunks[idx - 1];
      return (
        <CitationBadge
          key={`cite-${i}-${idx}`}
          index={idx}
          chunk={chunk}
          onClick={onCitationClick}
        />
      );
    }
    return <span key={`txt-${i}`}>{part}</span>;
  });
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  // Reset lastIndex so repeated regex use stays deterministic
  CITATION_REGEX.lastIndex = 0;

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[4px] bg-surface-container px-4 py-3 text-[14px] leading-relaxed text-on-surface">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-[4px] bg-surface-container-lowest px-5 py-4">
        <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          Trawl
        </div>
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-on-surface">
          {renderAssistantContent(message.content, message, onCitationClick)}
        </div>
      </div>
    </div>
  );
}
