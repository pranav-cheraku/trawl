"use client";

interface EmptyStateProps {
  onExampleClick: (query: string) => void;
}

const EXAMPLE_QUERIES = [
  "What do users complain about the most?",
  "What features do users love?",
  "Why are people leaving 1-star reviews?",
  "What's causing the most frustration?",
];

export function EmptyState({ onExampleClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-surface-container">
        <svg
          className="h-5 w-5 text-on-surface-variant"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      </div>
      <h2 className="mt-5 text-lg font-bold text-on-surface">
        Ask your feedback corpus anything
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-on-surface-variant">
        Every answer is cited back to the specific reviews that support it.
      </p>
      <div className="mt-8 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        Try an example
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUERIES.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onExampleClick(query)}
            className="rounded-[4px] bg-surface-container-lowest px-3 py-2 text-[12px] text-on-surface transition-colors hover:bg-surface-container-high"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
