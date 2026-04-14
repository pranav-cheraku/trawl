"use client";

import type { ReactNode } from "react";

import { CitationBadge } from "@/components/chat/citation-badge";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
  isSelected?: boolean;
  onSelect?: (messageId: string) => void;
  onCitationClick?: (chunkId: string, messageId: string) => void;
}

// Matches any bracketed feedback citation block, including multi-citation
// forms Claude sometimes produces:
//   [Feedback #1]
//   [Feedback #1, #2]
//   [Feedback #1, 2, 3]
//   [Feedback #2-5]          (range)
//   [Feedback 1]             (no hash)
const CITATION_BLOCK_REGEX =
  /\[Feedback\s+#?\d+(?:\s*[-,]\s*#?\d+)*\]/g;

/**
 * Extract the numeric chunk indices referenced by a single citation block.
 * Handles comma-separated, range notation, and hash-prefixed forms.
 */
function extractIndices(block: string): number[] {
  // Range notation like "#2-5" expands to [2, 3, 4, 5].
  const rangeMatch = block.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const out: number[] = [];
    for (let i = lo; i <= hi; i++) out.push(i);
    return out;
  }
  // Otherwise collect every run of digits in the block.
  const nums = block.match(/\d+/g) ?? [];
  return nums.map(Number);
}

/**
 * Parse assistant prose into text segments and inline citation badges.
 *
 * Each N is a 1-indexed position into the *full* retrieved-chunks list on the
 * message's transparency blob — NOT into sourceChunkIds (which is a
 * compressed list of only the chunks Claude reported as supporting).
 */
function renderAssistantContent(
  content: string,
  message: Message,
  onBadgeClick?: (chunkId: string) => void,
): ReactNode[] {
  const retrievedChunks = message.transparency?.retrievedChunks ?? [];
  // Reset lastIndex on the shared regex before every parse to avoid
  // stateful surprises across renders.
  CITATION_BLOCK_REGEX.lastIndex = 0;

  const blocks = content.match(CITATION_BLOCK_REGEX) ?? [];
  const parts = content.split(CITATION_BLOCK_REGEX);
  const out: ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      out.push(<span key={`txt-${i}`}>{parts[i]}</span>);
    }
    if (i < blocks.length) {
      const indices = extractIndices(blocks[i]);
      indices.forEach((idx, j) => {
        const chunk = retrievedChunks[idx - 1];
        out.push(
          <CitationBadge
            key={`cite-${i}-${j}-${idx}`}
            index={idx}
            chunk={chunk}
            onClick={onBadgeClick}
          />,
        );
      });
    }
  }
  return out;
}

export function ChatMessage({
  message,
  isSelected = false,
  onSelect,
  onCitationClick,
}: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[4px] bg-surface-container px-4 py-3 text-[14px] leading-relaxed text-on-surface">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant bubble — clickable to select as the X-Ray focus message.
  // Pre-binds message.id into the badge click callback so CitationBadge
  // keeps its simple (chunkId) => void signature.
  const handleBadgeClick = onCitationClick
    ? (chunkId: string) => onCitationClick(chunkId, message.id)
    : undefined;

  const isInteractive = Boolean(onSelect);

  function handleBubbleClick() {
    onSelect?.(message.id);
  }

  function handleBubbleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!isInteractive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(message.id);
    }
  }

  return (
    <div className="flex justify-start">
      <div
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? handleBubbleClick : undefined}
        onKeyDown={isInteractive ? handleBubbleKeyDown : undefined}
        aria-pressed={isInteractive ? isSelected : undefined}
        className={`max-w-[85%] rounded-[4px] bg-surface-container-lowest px-5 py-4 transition-colors ${
          isInteractive
            ? "cursor-pointer hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
            : ""
        } ${
          isSelected ? "ring-2 ring-secondary" : ""
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          <span>Trawl</span>
          {isSelected && (
            <span className="text-secondary">Showing in X-Ray</span>
          )}
        </div>
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-on-surface">
          {renderAssistantContent(message.content, message, handleBadgeClick)}
        </div>
      </div>
    </div>
  );
}
