import type { ComponentType, ReactElement } from "react";
import type { SourceType } from "@/types";
import { getSourceTypeIcon } from "@/lib/source-display";
import AppStoreForm from "@/components/sources/app-store-form";
import CsvUploadForm from "@/components/sources/csv-upload-form";

export interface ConnectorFormProps {
  projectId: string;
  /** Called by the form when the source has been created server-side. */
  onSourceCreated: () => void;
}

export interface ConnectorEntry {
  type: SourceType;
  /** Human-readable name shown on the picker tile. */
  label: string;
  /** One-line description shown under the label. */
  description: string;
  /** SVG icon component. Receives `className`. */
  Icon: ComponentType<{ className?: string }>;
  /** Form rendered in modal step 2 when this tile is selected. */
  FormComponent: ComponentType<ConnectorFormProps>;
}

/**
 * Returns a React component that renders the source-type icon. Wraps the
 * `getSourceTypeIcon` ReactNode in a function component so the registry can
 * pass `Icon` as a JSX-rendering type. The `as ReactElement | null` cast is
 * required because `getSourceTypeIcon` returns `ReactNode` (which includes
 * `string`, `boolean`, etc.) but `ComponentType` narrows the return to
 * `ReactElement | null`. Our SVG helper always returns an `<svg>` element so
 * the cast is safe.  JSX-free so this file stays `.ts`.
 */
function makeIcon(type: SourceType): ComponentType<{ className?: string }> {
  const Cmp = ({ className }: { className?: string }) =>
    getSourceTypeIcon(type, className) as ReactElement | null;
  Cmp.displayName = `Icon_${type}`;
  return Cmp;
}

/**
 * Single source of truth for connector tiles in the AddSourceModal.
 * Adding a new source = one new entry here + the FormComponent file.
 *
 * Manual / Google Play / Reddit entries are appended in CP3 / CP4 / CP5.
 */
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
    type: "csv",
    label: "CSV File",
    description: "Upload a CSV with one feedback item per row.",
    Icon: makeIcon("csv"),
    FormComponent: CsvUploadForm,
  },
];
