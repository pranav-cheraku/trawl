"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import EmptyState from "@/components/build-next/empty-state";
import { SourceScopeMenu } from "@/components/sources/source-scope-menu";
import WorkspaceHeader, {
  type WorkspaceStat,
} from "@/components/workspace/workspace-header";
import {
  AlreadyRunningError,
  getBuildReport,
  getBuildReportChunks,
  getProject,
  listBuildRuns,
  listSources,
  runBuildNext,
} from "@/lib/api";
import { useSourceScope } from "@/lib/use-source-scope";
import type {
  BuildReport,
  BuildReportChunk,
  BuildReportSummary,
  Source,
} from "@/types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 5 * 60 * 1000; // 5 minutes
const ZOMBIE_AGE_MS = 10 * 60 * 1000; // backend's 10-min stale = failed

export default function BuildNextPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [projectName, setProjectName] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<BuildReportSummary[]>([]);
  const [report, setReport] = useState<BuildReport | null>(null);
  const [chunks, setChunks] = useState<BuildReportChunk[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartRef = useRef<number | null>(null);

  const sourceScope = useSourceScope(projectId, "build");
  const readySources = sources.filter((s) => s.status === "ready");
  const activeIds = sourceScope.activeIds(readySources);
  const isScopeEmpty = readySources.length > 0 && activeIds.length === 0;
  const isInFlight =
    report?.status === "running" || report?.status === "pending";

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollStartRef.current = null;
  }, []);

  const refreshReport = useCallback(
    async (id: string): Promise<BuildReport | null> => {
      try {
        const fresh = await getBuildReport(id);
        // Treat zombie running rows (>10min stale) as failed on the client.
        if (
          fresh.status === "running" &&
          new Date(fresh.createdAt + "Z").getTime() <
            Date.now() - ZOMBIE_AGE_MS
        ) {
          const zombieFailed: BuildReport = {
            ...fresh,
            status: "failure",
            failureReason: "Run timed out. Re-run to try again.",
          };
          setReport(zombieFailed);
          return zombieFailed;
        }
        setReport(fresh);
        return fresh;
      } catch (e) {
        console.error("getBuildReport failed", e);
        return null;
      }
    },
    [],
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollStartRef.current = Date.now();
      const tick = async () => {
        // Guard: stopPolling() nulls pollStartRef — bail if called before or
        // during this tick (handles unmount during the in-flight await).
        if (pollStartRef.current === null) return;

        const fresh = await refreshReport(id);
        if (pollStartRef.current === null) return; // unmounted during await

        const elapsed = Date.now() - pollStartRef.current;
        if (
          fresh &&
          (fresh.status === "success" || fresh.status === "failure")
        ) {
          stopPolling();
          listBuildRuns(projectId).then(setRuns).catch(console.error);
          if (fresh.status === "success") {
            getBuildReportChunks(id).then(setChunks).catch(console.error);
          }
          return;
        }
        if (elapsed > MAX_POLL_MS) {
          stopPolling();
          setErrorBanner(
            "This is taking longer than expected. Refresh to check again.",
          );
          return;
        }
        pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
      };
      pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    },
    [projectId, refreshReport, stopPolling],
  );

  // Mount: fetch project + sources + runs in parallel; if a run exists,
  // hydrate the latest one.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [projectRes, sourcesRes, runsRes] = await Promise.allSettled([
        getProject(projectId),
        listSources(projectId),
        listBuildRuns(projectId),
      ]);
      if (cancelled) return;
      if (projectRes.status === "fulfilled") {
        setProjectName(projectRes.value.name);
      }
      if (sourcesRes.status === "fulfilled") setSources(sourcesRes.value);
      const runsList =
        runsRes.status === "fulfilled" ? runsRes.value : [];
      setRuns(runsList);

      if (runsList.length === 0) {
        setIsLoading(false);
        return;
      }

      const latest = runsList[0];
      const fresh = await refreshReport(latest.id);
      if (cancelled) return;
      setIsLoading(false);
      if (fresh && (fresh.status === "running" || fresh.status === "pending")) {
        startPolling(fresh.id);
      } else if (fresh && fresh.status === "success") {
        getBuildReportChunks(fresh.id).then(setChunks).catch(console.error);
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [projectId, refreshReport, startPolling, stopPolling]);

  const handleRun = useCallback(async () => {
    setErrorBanner(null);
    try {
      const { reportId } = await runBuildNext(
        projectId,
        readySources.length > 0 ? activeIds : undefined,
      );
      const newRuns = await listBuildRuns(projectId);
      setRuns(newRuns);
      const fresh = await refreshReport(reportId);
      if (fresh && (fresh.status === "running" || fresh.status === "pending")) {
        startPolling(reportId);
      }
    } catch (e) {
      if (e instanceof AlreadyRunningError) {
        // Attach to the existing run.
        const fresh = await refreshReport(e.existingReportId);
        if (fresh) startPolling(e.existingReportId);
      } else {
        const msg = e instanceof Error ? e.message : "Failed to start run";
        setErrorBanner(msg);
      }
    }
  }, [projectId, readySources, activeIds, refreshReport, startPolling]);

  const stats: WorkspaceStat[] =
    report?.status === "success"
      ? [
          {
            key: "LATEST RUN",
            value: report.completedAt
              ? new Date(report.completedAt + "Z").toLocaleDateString()
              : "—",
          },
          { key: "THEMES", value: String(report.themes.length) },
          { key: "SPECS", value: String(report.specs.length) },
        ]
      : [];

  const reviewCount = readySources.reduce(
    (sum, s) => sum + s.recordCount,
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceHeader
        label="Workspace / Build Next"
        title="What Should We Build Next?"
        stats={stats.length > 0 ? stats : undefined}
        right={
          <button
            type="button"
            onClick={handleRun}
            disabled={isScopeEmpty || isInFlight}
            className="rounded-[4px] bg-on-surface px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runs.length === 0 ? "Run analysis" : "Re-run analysis"}
          </button>
        }
      />

      {/* Source scope strip — mirrors Specs tab */}
      <div className="flex items-center justify-between rounded-[4px] bg-surface-container-lowest px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Scope
          </span>
          <SourceScopeMenu
            sources={readySources}
            mutedIds={sourceScope.mutedIds}
            onToggle={sourceScope.toggle}
            onEnableAll={sourceScope.clear}
          />
        </div>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
            isScopeEmpty ? "text-error" : "text-on-surface-variant"
          }`}
        >
          {isScopeEmpty
            ? "Activate at least one source to run"
            : `Generation will use ${activeIds.length} of ${readySources.length} sources`}
        </span>
      </div>

      {errorBanner ? (
        <div className="flex items-center justify-between rounded-[4px] bg-error/10 px-4 py-2 text-[12px] text-error">
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Body — state machine. CP4-7 replace these placeholders. */}
      <div>
        {isLoading ? (
          <div className="rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center text-[12px] text-on-surface-variant">
            Loading…
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            sourceCount={readySources.length}
            reviewCount={reviewCount}
            isScopeEmpty={isScopeEmpty}
            isRunning={isInFlight}
            onRun={handleRun}
          />
        ) : report?.status === "running" || report?.status === "pending" ? (
          <PlaceholderRunning />
        ) : report?.status === "failure" ? (
          <PlaceholderFailure
            reason={report.failureReason ?? "Unknown error"}
            onRetry={handleRun}
          />
        ) : report?.status === "success" ? (
          <PlaceholderSuccess report={report} chunks={chunks} />
        ) : (
          <div className="rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center text-[12px] text-on-surface-variant">
            No report.
          </div>
        )}
      </div>

      {/* CP4 will surface projectName in the archived-run pill. */}
      <span className="hidden">{projectName ?? ""}</span>
    </div>
  );
}

// ----- Placeholder substates (replaced in CP4-CP7) -----

function PlaceholderRunning() {
  return (
    <div className="rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">
      Running…
    </div>
  );
}

function PlaceholderFailure({
  reason,
  onRetry,
}: {
  reason: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center">
      <h2 className="text-lg font-bold text-error">Run failed</h2>
      <p className="mx-auto mt-2 max-w-sm text-[13px] text-on-surface-variant">
        {reason}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-[4px] bg-on-surface px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-container-lowest hover:bg-secondary"
      >
        Re-run analysis →
      </button>
    </div>
  );
}

function PlaceholderSuccess({
  report,
  chunks,
}: {
  report: BuildReport;
  chunks: BuildReportChunk[] | null;
}) {
  return (
    <div className="rounded-[4px] bg-surface-container-lowest px-8 py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
        Report rendered (placeholder) · {report.themes.length} themes ·{" "}
        {report.specs.length} specs · {chunks?.length ?? 0} chunks
      </p>
    </div>
  );
}
