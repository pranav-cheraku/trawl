import { friendlyAgo } from "@/lib/time";

type Props = {
  reason: string;
  failedAtIso: string | null;
  onRetry: () => void;
  isScopeEmpty: boolean;
};

export default function FailureState({
  reason,
  failedAtIso,
  onRetry,
  isScopeEmpty,
}: Props) {
  const failedAgo = failedAtIso ? friendlyAgo(failedAtIso) : null;
  return (
    <div className="rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[4px] bg-error/10">
        <svg
          className="h-5 w-5 text-error"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path d="M12 9v3.75m0 3.75h.008m9.742-3.75a9.75 9.75 0 1 1-19.5 0 9.75 9.75 0 0 1 19.5 0Z" />
        </svg>
      </div>
      <h2 className="mt-5 text-[18px] font-semibold text-on-surface">
        Run failed
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-on-surface-variant">
        {reason}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isScopeEmpty}
        className="mt-8 rounded-[4px] bg-on-surface px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      >
        Re-run analysis →
      </button>
      {failedAgo ? (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
          · Failed {failedAgo}
        </p>
      ) : null}
    </div>
  );
}
