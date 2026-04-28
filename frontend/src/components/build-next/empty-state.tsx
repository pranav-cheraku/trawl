type Props = {
  sourceCount: number;
  reviewCount: number;
  isScopeEmpty: boolean;
  isRunning: boolean;
  onRun: () => void;
};

export default function EmptyState({
  sourceCount,
  reviewCount,
  isScopeEmpty,
  isRunning,
  onRun,
}: Props) {
  return (
    <div className="rounded-[4px] bg-surface-container-lowest px-8 py-20 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[4px] bg-surface-container">
        <svg
          className="h-5 w-5 text-on-surface"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      </div>
      <h2 className="mt-5 text-[18px] font-semibold tracking-tight text-on-surface">
        Run your first analysis
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-on-surface-variant">
        Trawl runs 5 exploratory queries against your feedback corpus and
        surfaces ranked themes plus draft feature specs. Typical runtime:
        30–60 seconds.
      </p>
      <button
        type="button"
        onClick={onRun}
        disabled={isScopeEmpty || isRunning}
        className="mt-8 rounded-[4px] bg-on-surface px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      >
        Run analysis →
      </button>
      <p
        className={`mt-4 font-mono text-[10px] uppercase tracking-[0.18em] ${
          isScopeEmpty ? "text-error" : "text-on-surface-variant"
        }`}
      >
        {isScopeEmpty
          ? "Activate at least one source above to run"
          : `· Uses ${reviewCount} reviews from ${sourceCount} sources`}
      </p>
    </div>
  );
}
