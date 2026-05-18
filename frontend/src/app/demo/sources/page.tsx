"use client";
// Demo Sources page: read-only view of the demo project's feedback sources.
import { useEffect, useMemo, useState } from "react";

import WorkspaceHeader, {
  type WorkspaceStat,
} from "@/components/workspace/workspace-header";
import DemoProjectLayout from "@/components/demo/demo-project-layout";
import { apiFetch } from "@/lib/api";
import { useDemoMode } from "@/lib/demo-mode";
import { getSourceBaseName, getSourceTypeLabel } from "@/lib/source-display";
import { friendlyAgo, parseUtcIso } from "@/lib/time";
import type { Source } from "@/types";

const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ?? "";
const DEMO_PROJECT_NAME = "Notion – App Reviews";

function StatusDot({ status }: { status: string }) {
  if (status === "ready") {
    return <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />;
  }
  if (status === "error") {
    return <span className="inline-block h-1.5 w-1.5 rounded-full bg-error" />;
  }
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
    </span>
  );
}

export default function DemoSourcesPage() {
  const isDemo = useDemoMode();
  const projectId = DEMO_PROJECT_ID;
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    apiFetch<Source[]>(`/api/projects/${projectId}/sources`, { demo: isDemo })
      .then((data) => {
        if (!cancelled) {
          setSources(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, isDemo]);

  const stats = useMemo<WorkspaceStat[]>(() => {
    const total = sources.length;
    const reviews = sources
      .filter((s) => s.status === "ready")
      .reduce((acc, s) => acc + (s.recordCount ?? 0), 0);
    const latest = sources.reduce<string | null>((acc, s) => {
      if (!s.createdAt) return acc;
      if (!acc || s.createdAt > acc) return s.createdAt;
      return acc;
    }, null);

    return [
      { value: total.toString(), key: "Active Sources" },
      { value: reviews.toLocaleString(), key: "Reviews Indexed" },
      { value: latest ? friendlyAgo(latest) : "—", key: "Last Update" },
    ];
  }, [sources]);

  if (!projectId) {
    return (
      <DemoProjectLayout projectName={DEMO_PROJECT_NAME}>
        <div className="p-6 text-center text-on-surface-variant">
          Demo not configured.
        </div>
      </DemoProjectLayout>
    );
  }

  return (
    <DemoProjectLayout projectName={DEMO_PROJECT_NAME}>
      <div className="flex flex-col gap-4">
        <WorkspaceHeader
          title="Feedback Sources"
          stats={stats}
        />

        {isLoading ? (
          <div className="rounded-[4px] bg-surface-container-lowest p-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
            Loading sources…
          </div>
        ) : sources.length === 0 ? (
          <div className="rounded-[4px] bg-surface-container-lowest px-8 py-16 text-center">
            <p className="text-[13px] text-on-surface-variant">
              Demo data not yet seeded. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[4px]">
            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1fr_120px_100px_120px] gap-0 text-[11px] font-medium uppercase tracking-[0.12em] text-on-surface-variant">
                <div className="px-4 py-2">Source</div>
                <div className="px-4 py-2">Type</div>
                <div className="px-4 py-2">Reviews</div>
                <div className="px-4 py-2">Added</div>
              </div>
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="grid grid-cols-[1fr_120px_100px_120px] gap-0 shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-center gap-2 px-4 py-3">
                    <StatusDot status={source.status} />
                    <span className="text-[13px] font-medium text-on-surface">
                      {getSourceBaseName(source)}
                    </span>
                  </div>
                  <div className="flex items-center px-4 py-3">
                    <span className="rounded-[2px] bg-surface-container px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">
                      {getSourceTypeLabel(source.sourceType)}
                    </span>
                  </div>
                  <div className="flex items-center px-4 py-3">
                    <span className="font-mono text-[13px] text-on-surface">
                      {source.recordCount?.toLocaleString() ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center px-4 py-3">
                    <span className="font-mono text-[11px] text-on-surface-variant">
                      {source.createdAt
                        ? parseUtcIso(source.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-2 md:hidden">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-[4px] bg-surface-container-lowest p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={source.status} />
                      <span className="text-[13px] font-medium text-on-surface">
                        {getSourceBaseName(source)}
                      </span>
                    </div>
                    <span className="rounded-[2px] bg-surface-container px-2 py-0.5 font-mono text-[10px] text-on-surface-variant">
                      {getSourceTypeLabel(source.sourceType)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 font-mono text-[11px] text-on-surface-variant">
                    <span>{source.recordCount?.toLocaleString() ?? "—"} reviews</span>
                    {source.createdAt && (
                      <span>{friendlyAgo(source.createdAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DemoProjectLayout>
  );
}
