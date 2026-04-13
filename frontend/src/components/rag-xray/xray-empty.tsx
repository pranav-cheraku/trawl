"use client";

export function XrayEmpty() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-surface-container">
        <svg
          className="h-4 w-4 text-on-surface-variant"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <div className="mt-4 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        RAG X-Ray
      </div>
      <p className="mt-3 max-w-[220px] text-[12px] leading-relaxed text-on-surface-variant">
        Ask a question to see which feedback chunks grounded the answer, with
        similarity scores and source attribution.
      </p>
    </div>
  );
}
