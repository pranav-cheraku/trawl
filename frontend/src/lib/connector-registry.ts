// Single source of truth for connector tiles in AddSourceModal. Adding a new
// connector type requires one new entry here plus a corresponding FormComponent.
import type { ComponentType, ReactElement } from "react";
import type { SourceType } from "@/types";
import { getSourceTypeIcon } from "@/lib/source-display";
import AppStoreForm from "@/components/sources/app-store-form";
import CsvUploadForm from "@/components/sources/csv-upload-form";
import GooglePlayForm from "@/components/sources/google-play-form";
import ManualPasteForm from "@/components/sources/manual-paste-form";
import RedditForm from "@/components/sources/reddit-form";

export interface ConnectorFormProps {
  projectId: string;
  onSourceCreated: () => void;
}

export interface ConnectorEntry {
  type: SourceType;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
  FormComponent: ComponentType<ConnectorFormProps>;
}

// Wraps getSourceTypeIcon (ReactNode) into a ComponentType so ConnectorEntry.Icon
// can be used as JSX. The cast to ReactElement | null is safe because the SVG
// helper always returns an <svg> element. This file stays .ts (no JSX).

function makeIcon(type: SourceType): ComponentType<{ className?: string }> {
  const Cmp = ({ className }: { className?: string }) =>
    getSourceTypeIcon(type, className) as ReactElement | null;
  Cmp.displayName = `Icon_${type}`;
  return Cmp;
}

// Single source of truth for connector tiles in AddSourceModal.
// Adding a new connector type = one new entry here + a FormComponent file.
export const CONNECTORS: ConnectorEntry[] = [
  {
    type: "app_store",
    label: "App Store",
    description:
      "Latest reviews from US, UK, CA, AU, and IE storefronts.",
    Icon: makeIcon("app_store"),
    FormComponent: AppStoreForm,
  },
  {
    type: "google_play",
    label: "Google Play",
    description: "Latest reviews from the US English Play store.",
    Icon: makeIcon("google_play"),
    FormComponent: GooglePlayForm,
  },
  {
    type: "reddit",
    label: "Reddit",
    description: "Subreddit posts or keyword search.",
    Icon: makeIcon("reddit"),
    FormComponent: RedditForm,
  },
  {
    type: "csv",
    label: "CSV File",
    description: "Upload a CSV with one feedback item per row.",
    Icon: makeIcon("csv"),
    FormComponent: CsvUploadForm,
  },
  {
    type: "manual",
    label: "Manual Paste",
    description: "Paste raw text. Splits on blank lines into items.",
    Icon: makeIcon("manual"),
    FormComponent: ManualPasteForm,
  },
];
