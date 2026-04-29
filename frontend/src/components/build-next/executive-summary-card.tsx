import type { BuildRetrievalMetadata } from "@/types";

type Props = {
  summary: string;
  metadata: BuildRetrievalMetadata | null;
  partialFailure: boolean;
};

export default function ExecutiveSummaryCard({
  summary,
  metadata,
  partialFailure,
}: Props) {
  const totalSec = metadata?.totalMs
    ? `${(metadata.totalMs / 1000).toFixed(1)}s`
    : null;
  const tokenIn = metadata?.tokenUsage?.input;
  const tokenOut = metadata?.tokenUsage?.output;

  return (
    <section className="rounded-[4px] bg-surface-container-lowest p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
        Executive Summary
      </p>
      <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-on-surface">
        {summary || "No summary generated."}
      </p>
      <div className="mt-5 flex min-w-0 flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
        {metadata?.model ? <span>Model · {metadata.model}</span> : null}
        {metadata?.queries?.length ? (
          <span>Queries · {metadata.queries.length}</span>
        ) : null}
        {metadata?.dedupedTotal != null ? (
          <span>Chunks · {metadata.dedupedTotal}</span>
        ) : null}
        {totalSec ? <span>Latency · {totalSec}</span> : null}
        {tokenIn != null && tokenOut != null ? (
          <span>
            Tokens · {tokenIn.toLocaleString()} in /{" "}
            {tokenOut.toLocaleString()} out
          </span>
        ) : null}
      </div>
      {partialFailure ? (
        <p className="mt-2 text-[12px] leading-relaxed text-error">
          · Partial failure — some themes had spec generation errors.
        </p>
      ) : null}
    </section>
  );
}
