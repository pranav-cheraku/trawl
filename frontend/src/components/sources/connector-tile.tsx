"use client";

import type { ConnectorEntry } from "@/lib/connector-registry";

interface ConnectorTileProps {
  entry: ConnectorEntry;
  onClick: () => void;
}

export default function ConnectorTile({ entry, onClick }: ConnectorTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Connect ${entry.label}`}
      className="group flex flex-col items-start gap-2 rounded-[4px] bg-surface-container-low px-4 py-4 text-left transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
    >
      <entry.Icon className="h-7 w-7 text-on-surface-variant transition-colors group-hover:text-secondary" />
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-on-surface">
          {entry.label}
        </span>
        <span className="text-[12px] leading-snug text-on-surface-variant">
          {entry.description}
        </span>
      </div>
    </button>
  );
}
