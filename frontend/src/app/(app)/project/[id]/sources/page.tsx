"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import AppStoreConnector from "@/components/sources/app-store-connector";
import CsvUpload from "@/components/sources/csv-upload";
import SourceList from "@/components/sources/source-list";

export default function SourcesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSourceCreated() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      {/* Connector section — two columns */}
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

      {/* Source list with status polling */}
      <SourceList projectId={projectId} refreshKey={refreshKey} />
    </div>
  );
}
