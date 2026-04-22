"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppStoreConnector from "@/components/sources/app-store-connector";
import CsvUpload from "@/components/sources/csv-upload";
import SourceList from "@/components/sources/source-list";
import WorkspaceHeader, {
  type WorkspaceStat,
} from "@/components/workspace/workspace-header";
import { listSources } from "@/lib/api";
import type { Source } from "@/types";

function formatRelative(iso: string): string {
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const ms = Date.now() - new Date(normalized).getTime();
  const sec = Math.max(1, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function SourcesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [refreshKey, setRefreshKey] = useState(0);
  const [sources, setSources] = useState<Source[]>([]);

  function handleSourceCreated() {
    setRefreshKey((k) => k + 1);
  }

  // Lightweight fetch solely for the stats strip. SourceList fetches its own
  // copy independently; keeping the two separate avoids coupling the stats
  // to the list's polling cadence.
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
      {
        value: latest ? formatRelative(latest) : "—",
        key: "Last Update",
      },
    ];
  }, [sources]);

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceHeader
        label="Workspace / Sources"
        title="Feedback Sources"
        stats={stats}
      />

      {/* Connector section — two columns with more breathing room */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AppStoreConnector
          projectId={projectId}
          onSourceCreated={handleSourceCreated}
        />
        <CsvUpload
          projectId={projectId}
          onSourceCreated={handleSourceCreated}
        />
      </div>

      {/* Source list with status polling — columnar table in Task 2.4 */}
      <SourceList projectId={projectId} refreshKey={refreshKey} />
    </div>
  );
}
