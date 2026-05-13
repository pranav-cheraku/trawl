import type { ReactNode } from "react";
import type { Source, SourceType } from "@/types";


const PHONE_PATH =
  "M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3";

const FILE_PATH =
  "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z";

const PLAY_TRIANGLE_PATH = "M5 3.5v17l13.5-8.5L5 3.5Z";

const REDDIT_PATH =
  "M12 2.25c-5.385 0-9.75 3.694-9.75 8.25 0 1.81.66 3.503 1.81 4.95-.184.886-.42 1.7-.626 2.215a.75.75 0 0 0 .958.945 11.18 11.18 0 0 0 3.014-1.176A11.39 11.39 0 0 0 12 18.75c5.385 0 9.75-3.694 9.75-8.25S17.385 2.25 12 2.25Z";

const QUOTE_PATH =
  "M3.75 6.75h9.75m-9.75 6h13.5m-13.5 6h6.75m6.75-9 3 3-3 3";

function svg(path: string, className: string | undefined, key: string): ReactNode {
  return (
    <svg
      key={key}
      className={className ?? "h-4 w-4 text-on-surface-variant"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export function getSourceTypeIcon(
  type: SourceType,
  className?: string,
): ReactNode {
  switch (type) {
    case "app_store":
      return svg(PHONE_PATH, className, `icon-app_store`);
    case "google_play":
      return svg(PLAY_TRIANGLE_PATH, className, `icon-google_play`);
    case "reddit":
      return svg(REDDIT_PATH, className, `icon-reddit`);
    case "csv":
      return svg(FILE_PATH, className, `icon-csv`);
    case "manual":
      return svg(QUOTE_PATH, className, `icon-manual`);
  }
}

export function getSourceTypeLabel(type: SourceType): string {
  switch (type) {
    case "app_store":
      return "App Store";
    case "google_play":
      return "Google Play";
    case "reddit":
      return "Reddit";
    case "csv":
      return "CSV";
    case "manual":
      return "Manual";
  }
}

// Dedupe key used to detect duplicate sources. When multiple sources share
// the same key, the caller appends an (N) suffix to each display name.
export function getSourceDedupeKey(source: Source): string {
  switch (source.sourceType) {
    case "app_store":
      return `appstore::${source.appStoreName ?? source.appStoreId ?? ""}`;
    case "google_play": {
      const cfg = source.connectorConfig ?? {};
      // Backend stores snake_case keys inside JSONB dict fields. Pydantic's
      // alias_generator only transforms model fields, not dict values.
      const pkg =
        typeof cfg.package_name === "string" ? cfg.package_name : "";
      return `googleplay::${pkg}`;
    }
    case "reddit": {
      const cfg = source.connectorConfig ?? {};
      const mode = typeof cfg.mode === "string" ? cfg.mode : "";
      const value = typeof cfg.value === "string" ? cfg.value : "";
      return `reddit::${mode}::${value}`;
    }
    case "csv":
      return `csv::${source.filename ?? "CSV Upload"}`;
    case "manual": {
      const cfg = source.connectorConfig ?? {};
      const title = typeof cfg.title === "string" ? cfg.title : null;
      return `manual::${title ?? source.createdAt}`;
    }
  }
}

export function getSourceBaseName(source: Source): string {
  switch (source.sourceType) {
    case "app_store": {
      const label = source.appStoreName ?? `#${source.appStoreId ?? "?"}`;
      return `App Store - ${label}`;
    }
    case "google_play": {
      const cfg = source.connectorConfig ?? {};
      const appName =
        typeof cfg.app_name === "string" ? cfg.app_name : "Unknown app";
      return `Google Play - ${appName}`;
    }
    case "reddit": {
      const cfg = source.connectorConfig ?? {};
      const mode = cfg.mode === "keyword" ? "keyword" : "subreddit";
      const value = typeof cfg.value === "string" ? cfg.value : "?";
      return mode === "keyword"
        ? `Reddit - "${value}"`
        : `Reddit - r/${value}`;
    }
    case "csv":
      return source.filename ?? "CSV Upload";
    case "manual": {
      const cfg = source.connectorConfig ?? {};
      const title =
        typeof cfg.title === "string" && cfg.title.trim()
          ? cfg.title.trim()
          : null;
      if (title) return title;
      const date = new Date(
        /[zZ]|[+-]\d{2}:?\d{2}$/.test(source.createdAt)
          ? source.createdAt
          : `${source.createdAt}Z`,
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return `Manual Paste · ${date}`;
    }
  }
}
