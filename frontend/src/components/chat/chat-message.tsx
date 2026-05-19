"use client";
// Renders a single chat message. User messages are plain text; assistant messages
// go through a two-pass Markdown pipeline:
//   1. Replace [Feedback #N] blocks with ⟦CITE_N⟧ sentinel markers (Mathematical
//      White Square Brackets so they can't collide with prose or markdown syntax).
//   2. Pass the modified string to ReactMarkdown with a custom remark plugin
//      (remarkSplitCitations) that splits text nodes on those sentinels and emits
//      "citation-slot" HAST nodes. The citation-slot component override renders
//      CitationBadge(s) inline in the markdown output.
import { motion, useReducedMotion } from "framer-motion";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { visit, SKIP } from "unist-util-visit";
import type { Node, Parent } from "unist";

import { CitationBadge } from "@/components/chat/citation-badge";
import { durations, easings } from "@/lib/motion";
import type { Message } from "@/types";

// Matches any bracketed feedback citation block, including multi-citation
// forms Claude sometimes produces:
//   [Feedback #1]
//   [Feedback #1, #2]
//   [Feedback #1, 2, 3]
//   [Feedback #2-5]          (range)
//   [Feedback 1]             (no hash)
const CITATION_BLOCK_REGEX =
  /\[Feedback\s+#?\d+(?:\s*[-,]\s*#?\d+)*\]/g;

function extractIndices(block: string): number[] {
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
  const nums = block.match(/\d+/g) ?? [];
  return nums.map(Number);
}

// Sentinel surrounding a citation slot in the pre-markdown text. Uses
// "Mathematical White Square Brackets" so it can't collide with normal prose
// or with markdown punctuation.
const CITE_OPEN = "⟦CITE_";
const CITE_CLOSE = "⟧";
const CITE_REGEX = /⟦CITE_(\d+)⟧/g;

// Model output occasionally uses the Unicode bullet "•" inline instead of
// real markdown list syntax. Those render as literal text with soft-break
// newlines collapsed to spaces. Rewrite each leading "•" to "- " so
// react-markdown produces a proper <ul>.
const BULLET_REGEX = /(^|[ \t\n])•[ \t]+/g;
function normalizeBullets(text: string): string {
  return text.replace(BULLET_REGEX, (_m, prefix) =>
    prefix === "" || prefix === "\n" ? `${prefix}- ` : "\n- ",
  );
}

interface TextNode extends Node {
  type: "text";
  value: string;
}

interface CitationHastNode extends Node {
  type: "citationSlot";
  data: {
    hName: "citation-slot";
    hProperties: { dataMarkerIdx: string };
  };
  children: [];
}

// Remark plugin: replaces CITE_N sentinels in text nodes with citation-slot
// HAST nodes so react-markdown can render CitationBadge inline.
function remarkSplitCitations() {
  return (tree: Node) => {
    visit(tree, "text", (node, index, parent) => {
      const textNode = node as TextNode;
      if (typeof textNode.value !== "string") return;
      if (!parent || index == null) return;
      const value = textNode.value;
      if (!value.includes(CITE_OPEN)) return;

      const newNodes: Node[] = [];
      let lastIndex = 0;
      const matches = Array.from(value.matchAll(CITE_REGEX));
      for (const match of matches) {
        const start = match.index ?? 0;
        const before = value.slice(lastIndex, start);
        if (before) {
          const t: TextNode = { type: "text", value: before };
          newNodes.push(t);
        }
        const slot: CitationHastNode = {
          type: "citationSlot",
          data: {
            hName: "citation-slot",
            hProperties: { dataMarkerIdx: match[1] },
          },
          children: [],
        };
        newNodes.push(slot);
        lastIndex = start + match[0].length;
      }
      const tail = value.slice(lastIndex);
      if (tail) {
        const t: TextNode = { type: "text", value: tail };
        newNodes.push(t);
      }
      (parent as Parent).children.splice(index, 1, ...newNodes);
      return [SKIP, index + newNodes.length];
    });
  };
}

function buildComponents(
  citations: number[][],
  retrievedChunks: NonNullable<Message["transparency"]>["retrievedChunks"] | [],
  onBadgeClick?: (chunkId: string) => void,
): Components {
  // Custom element name → renders CitationBadge(s) for that slot.
  // The cast below is required because TS's HTMLElementType union doesn't
  // include arbitrary custom element names; react-markdown looks up the tag
  // string at runtime regardless.
  const citationSlot = ({
    "data-marker-idx": dataMarkerIdx,
  }: {
    "data-marker-idx"?: string;
  }) => {
    const markerIdx = Number(dataMarkerIdx ?? "-1");
    const indices = citations[markerIdx] ?? [];
    return (
      <>
        {indices.map((idx, j) => {
          const chunk = retrievedChunks[idx - 1];
          return (
            <CitationBadge
              key={`cite-${markerIdx}-${j}-${idx}`}
              index={idx}
              chunk={chunk}
              onClick={onBadgeClick}
            />
          );
        })}
      </>
    );
  };

  const components: Components = {
    p: ({ children }) => (
      <p className="mb-3 last:mb-0">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
    ),
    li: ({ children }) => <li>{children}</li>,
    strong: ({ children }) => (
      <strong className="font-semibold text-on-surface">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    h1: ({ children }) => (
      <h2 className="mb-2 mt-1 text-[15px] font-semibold text-on-surface">
        {children}
      </h2>
    ),
    h2: ({ children }) => (
      <h3 className="mb-2 mt-1 text-[14.5px] font-semibold text-on-surface">
        {children}
      </h3>
    ),
    h3: ({ children }) => (
      <h4 className="mb-2 mt-1 text-[14px] font-semibold text-on-surface">
        {children}
      </h4>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-secondary underline underline-offset-2 hover:text-secondary-dim"
      >
        {children}
      </a>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.startsWith("language-");
      if (isBlock) {
        return (
          <code className="font-mono text-[12.5px] text-on-surface">
            {children}
          </code>
        );
      }
      return (
        <code className="rounded-[4px] bg-surface-container px-1 py-0.5 font-mono text-[12.5px] text-on-surface">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mb-3 overflow-x-auto rounded-[4px] bg-surface-container px-3 py-2 last:mb-0">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mb-3 border-l-2 border-on-surface/20 pl-3 italic text-on-surface-variant last:mb-0">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-3 border-on-surface/10" />,
  };
  // Register the custom citation-slot element after constructing the typed
  // map. TS's Components type doesn't allow arbitrary tag names; react-markdown
  // looks the tag up at runtime regardless.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (components as Record<string, any>)["citation-slot"] = citationSlot;
  return components;
}

interface ChatMessageProps {
  message: Message;
  isSelected?: boolean;
  onSelect?: (messageId: string) => void;
  onCitationClick?: (chunkId: string, messageId: string) => void;
}

export function ChatMessage({
  message,
  isSelected = false,
  onSelect,
  onCitationClick,
}: ChatMessageProps) {
  const prefersReducedMotion = useReducedMotion();

  if (message.role === "user") {
    return (
      <motion.div
        className="flex justify-end"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: durations.normal, ease: easings.standard }}
      >
        <div className="max-w-[80%] whitespace-pre-wrap rounded-[4px] bg-surface-container px-4 py-3 text-[14px] leading-relaxed text-on-surface">
          {message.content}
        </div>
      </motion.div>
    );
  }

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

  // Replace citation blocks in the raw content with sentinel markers and
  // accumulate the per-marker index list in a side table. The remark plugin
  // re-splits text nodes on those sentinels at render time. Bullet
  // normalization runs first so any "• cite" sequences are restructured into
  // list items before the sentinel substitution.
  const citations: number[][] = [];
  CITATION_BLOCK_REGEX.lastIndex = 0;
  const markdownContent = normalizeBullets(message.content).replace(
    CITATION_BLOCK_REGEX,
    (block) => {
      const indices = extractIndices(block);
      const idx = citations.push(indices) - 1;
      return `${CITE_OPEN}${idx}${CITE_CLOSE}`;
    },
  );
  const retrievedChunks = message.transparency?.retrievedChunks ?? [];
  const components = buildComponents(
    citations,
    retrievedChunks,
    handleBadgeClick,
  );

  return (
    <motion.div
      className="flex justify-start"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.normal, ease: easings.standard }}
    >
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
        } ${isSelected ? "ring-2 ring-secondary" : ""}`}
      >
        <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          <span>Trawl</span>
          {isSelected && (
            <span className="text-secondary">Showing in X-Ray</span>
          )}
        </div>
        <div className="text-[14px] leading-relaxed text-on-surface">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkSplitCitations]}
            components={components}
          >
            {markdownContent}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
