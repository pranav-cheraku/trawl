"use client";

interface CitationChipsProps {
  indices: number[];
  /** Called with the 1-based chunk index the user clicked. */
  onFocus: (idx: number) => void;
  /** Max retrieved chunk count — used to disable out-of-range chips. */
  maxIndex: number;
  /** When true, hides the inline "CITES" label. Use when the surrounding
   *  context (e.g. a property row) already labels the row. */
  hideLabel?: boolean;
}

/**
 * Renders a row of F#N chips matching the `supporting_feedback_indices`
 * from a spec's content dict. Clicking a chip bubbles the 1-based index
 * up so the parent can focus/scroll the matching chunk in the X-Ray panel.
 * Out-of-range indices are rendered dimmed + disabled (can happen on
 * older specs where the retrieval set changed).
 */
export default function CitationChips({
  indices,
  onFocus,
  maxIndex,
  hideLabel = false,
}: CitationChipsProps) {
  if (indices.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {hideLabel ? null : (
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant/70">
            CITES
          </span>
        )}
        <span className="font-mono text-[10px] text-on-surface-variant/60">
          None recorded
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hideLabel ? null : (
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface/70">
          CITES
        </span>
      )}
      {indices.map((idx, i) => {
        const valid = idx >= 1 && idx <= maxIndex;
        return (
          <button
            key={`${idx}-${i}`}
            type="button"
            disabled={!valid}
            onClick={() => {
              if (valid) onFocus(idx);
            }}
            aria-label={`Scroll to feedback ${idx}`}
            className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.15em] transition-colors ${
              valid
                ? "bg-surface-container text-secondary hover:bg-secondary hover:text-surface-container-lowest"
                : "bg-surface-container/60 text-on-surface-variant/40"
            }`}
          >
            F#{idx}
          </button>
        );
      })}
    </div>
  );
}
