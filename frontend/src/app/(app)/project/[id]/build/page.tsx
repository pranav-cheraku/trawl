"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import BuildSpecDetailModal from "@/components/build-next/build-spec-detail-modal";
import EmptyState from "@/components/build-next/empty-state";
import ExecutiveSummaryCard from "@/components/build-next/executive-summary-card";
import FailureState from "@/components/build-next/failure-state";
import RunningState from "@/components/build-next/running-state";
import RunSwitcher from "@/components/build-next/run-switcher";
import ThemeCard from "@/components/build-next/theme-card";
import RadialThemeChart from "@/components/build-next/radial-theme-chart";
import { SourceScopeMenu } from "@/components/sources/source-scope-menu";
import WorkspaceHeader, {
  type WorkspaceStat,
} from "@/components/workspace/workspace-header";
import { XrayPanel } from "@/components/rag-xray/xray-panel";
import {
  AlreadyRunningError,
  getBuildReport,
  getBuildReportChunks,
  listBuildRuns,
  listSources,
  promoteBuildSpec,
  runBuildNext,
} from "@/lib/api";
import { useSourceScope } from "@/lib/use-source-scope";
import type {
  BuildReport,
  BuildReportChunk,
  BuildReportSpec,
  BuildReportSummary,
  Source,
} from "@/types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 5 * 60 * 1000; // 5 minutes
const ZOMBIE_AGE_MS = 10 * 60 * 1000; // backend's 10-min stale = failed

export default function BuildNextPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<BuildReportSummary[]>([]);
  const [report, setReport] = useState<BuildReport | null>(null);
  const [chunks, setChunks] = useState<BuildReportChunk[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [selectedSpec, setSelectedSpec] = useState<BuildReportSpec | null>(null);
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());

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
        // stopPolling() nulls pollStartRef. Bail if called before or during
        // this tick to handle unmount during the in-flight await.
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [sourcesRes, runsRes] = await Promise.allSettled([
        listSources(projectId),
        listBuildRuns(projectId),
      ]);
      if (cancelled) return;
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
    setChunks(null); // old chunks shouldn't linger across runs
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
        const fresh = await refreshReport(e.existingReportId);
        if (fresh) startPolling(e.existingReportId);
      } else {
        const msg = e instanceof Error ? e.message : "Failed to start run";
        setErrorBanner(msg);
      }
    }
  }, [projectId, readySources, activeIds, refreshReport, startPolling]);

  const handlePromote = useCallback(
    async (spec: BuildReportSpec) => {
      if (!report) return;
      setPromotingIds((prev) => new Set(prev).add(spec.id));
      try {
        const result = await promoteBuildSpec(report.id, spec.id);
        const newSpecId =
          "kanbanSpecId" in result ? result.kanbanSpecId : result.existingSpecId;
        setReport((prev) =>
          prev
            ? {
                ...prev,
                specs: prev.specs.map((s) =>
                  s.id === spec.id ? { ...s, promotedSpecId: newSpecId } : s,
                ),
              }
            : prev,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to promote spec";
        setErrorBanner(`Couldn't add to Kanban. ${msg}`);
      } finally {
        setPromotingIds((prev) => {
          const next = new Set(prev);
          next.delete(spec.id);
          return next;
        });
      }
    },
    [report],
  );

  const handleSelectRun = useCallback(
    async (runId: string | null) => {
      setSelectedReportId(runId);
      const target = runId ?? runs[0]?.id;
      if (!target) return;
      stopPolling();
      setChunks(null);
      const fresh = await refreshReport(target);
      if (fresh && (fresh.status === "running" || fresh.status === "pending")) {
        startPolling(fresh.id);
      } else if (fresh && fresh.status === "success") {
        getBuildReportChunks(fresh.id).then(setChunks).catch(console.error);
      }
    },
    [runs, refreshReport, startPolling, stopPolling],
  );

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
    <div className="flex flex-col gap-4 overflow-x-hidden">
      {/* Header */}
      <WorkspaceHeader
        title="What Should We Build Next?"
        stats={stats.length > 0 ? stats : undefined}
        right={
          <div className="flex items-center gap-3">
            <RunSwitcher
              runs={runs}
              selectedRunId={selectedReportId}
              onSelect={handleSelectRun}
            />
            <button
              type="button"
              onClick={handleRun}
              disabled={isScopeEmpty || isInFlight}
              className="rounded-[4px] bg-on-surface px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-container-lowest transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runs.length === 0 ? "Run analysis" : "Re-run analysis"}
            </button>
          </div>
        }
      />

      {/* Scope strip */}
      <div className="flex flex-col gap-2 rounded-[4px] bg-surface-container-lowest px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Main content */}
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
          <RunningState startedAtIso={report.createdAt} />
        ) : report?.status === "failure" ? (
          <FailureState
            reason={report.failureReason ?? "Unknown error"}
            failedAtIso={report.completedAt}
            onRetry={handleRun}
            isScopeEmpty={isScopeEmpty}
          />
        ) : report?.status === "success" ? (
          (() => {
            // Sort by frequency desc so the chart's Q1..QN reflect theme size
            // (biggest = Q1). Theme cards below follow the same order so the
            // chart and cards stay in lock-step. Backend severity_score still
            // drives spec ranking (B1..BN); it's just not surfaced as the
            // theme Q-number here.
            const themesByFrequency = [...report.themes].sort(
              (a, b) => b.frequencyPct - a.frequencyPct,
            );
            return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_440px]">
            <div className="flex flex-col gap-4">
              {report.executiveSummary !== null ? (
                <ExecutiveSummaryCard
                  summary={report.executiveSummary}
                  metadata={report.retrievalMetadata}
                  partialFailure={report.partialFailure}
                />
              ) : null}
              <RadialThemeChart
                themes={themesByFrequency}
                onThemeClick={(themeId) => {
                  const el = document.getElementById(`theme-${themeId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
              />
              {themesByFrequency.map((theme, idx) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  displayRank={idx + 1}
                  specs={report.specs}
                  projectId={projectId}
                  onSpecClick={(spec) => setSelectedSpec(spec)}
                  onPromote={handlePromote}
                  promotingIds={promotingIds}
                />
              ))}
              {/* X-Ray panel (mobile inline) */}
              <div className="block lg:hidden">
                {chunks ? (
                  <XrayPanel
                    variant="build"
                    projectId={projectId}
                    reportChunks={chunks}
                    reportMetadata={report.retrievalMetadata}
                    focusedChunkId={null}
                    focusTick={0}
                  />
                ) : (
                  <div className="rounded-[4px] bg-surface-container-low p-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    Loading X-Ray…
                  </div>
                )}
              </div>
            </div>
            {/* X-Ray panel (desktop aside) */}
            <aside className="hidden lg:block">
              {chunks ? (
                <XrayPanel
                  variant="build"
                  projectId={projectId}
                  reportChunks={chunks}
                  reportMetadata={report.retrievalMetadata}
                  focusedChunkId={null}
                  focusTick={0}
                />
              ) : (
                <div className="rounded-[4px] bg-surface-container-low p-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Loading X-Ray…
                </div>
              )}
            </aside>
          </div>
            );
          })()
        ) : (
          <div className="rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center text-[12px] text-on-surface-variant">
            No report.
          </div>
        )}
      </div>

      {selectedSpec && report
        ? (() => {
            // Derive the live spec from report.specs so promote-to-Kanban updates
            // the modal button without requiring a re-open.
            const liveSpec =
              report.specs.find((s) => s.id === selectedSpec.id) ??
              selectedSpec;
            return (
              <BuildSpecDetailModal
                spec={liveSpec}
                theme={
                  report.themes.find((t) => t.id === liveSpec.themeId) ?? null
                }
                projectId={projectId}
                onClose={() => setSelectedSpec(null)}
                onPromote={() => handlePromote(liveSpec)}
                isPromoting={promotingIds.has(liveSpec.id)}
              />
            );
          })()
        : null}
    </div>
  );
}
