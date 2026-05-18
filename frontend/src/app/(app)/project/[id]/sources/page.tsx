"use client";
// Sources tab page: header stats, SourceList, and the Add Source modal trigger.
// refreshKey increments on source creation to tell SourceList to re-fetch.
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AddSourceModal from "@/components/sources/add-source-modal";
import SourceList from "@/components/sources/source-list";
import WorkspaceHeader, {
  type WorkspaceStat,
} from "@/components/workspace/workspace-header";
import { listSources } from "@/lib/api";
import { friendlyAgo } from "@/lib/time";
import type { Source } from "@/types";

export default function SourcesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [refreshKey, setRefreshKey] = useState(0);
  const [sources, setSources] = useState<Source[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleSourceCreated() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    let cancelled = false;
    listSources(projectId)
      .then((data) => {
        if (!cancelled) setSources(data);
      })
      .catch(() => {
        /* stats strip is best-effort; the list shows its own error */
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

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

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceHeader
        title="Feedback Sources"
        stats={stats}
        right={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-[4px] bg-on-surface px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-secondary"
            aria-label="Add a feedback source"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 14 14"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M7 1v12M1 7h12" />
            </svg>
            Add Source
          </button>
        }
      />

      <SourceList projectId={projectId} refreshKey={refreshKey} />

      <AddSourceModal
        projectId={projectId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSourceCreated={handleSourceCreated}
      />
    </div>
  );
}
