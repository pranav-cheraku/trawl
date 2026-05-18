"use client";
// CSV file upload form. Uses apiUpload (not apiFetch) because it sends a
// multipart/form-data body, so the Content-Type header must not be set manually.

import { useCallback, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { uploadCsv } from "@/lib/api";
import { springs } from "@/lib/motion";
import type { ConnectorFormProps } from "@/lib/connector-registry";

interface CsvPreview {
  columns: string[];
  rows: string[][];
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsvPreview(text: string): CsvPreview {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const columns = parseCsvLine(lines[0]);
  const rows = lines.slice(1, 4).map((line) => parseCsvLine(line));
  return { columns, rows };
}

export default function CsvUploadForm({
  projectId,
  onSourceCreated,
}: ConnectorFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [contentColumn, setContentColumn] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const prefersReducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsvPreview(text);
      setPreview(parsed);
      if (parsed.columns.length > 0) {
        const contentIdx = parsed.columns.findIndex(
          (c) => c.toLowerCase() === "content",
        );
        setContentColumn(parsed.columns[contentIdx >= 0 ? contentIdx : 0]);
      }
    };
    reader.readAsText(f, "utf-8");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".csv")) {
        handleFile(f);
      } else {
        setError("Please drop a .csv file");
      }
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleUpload = useCallback(async () => {
    if (!file || !contentColumn) return;
    setIsUploading(true);
    setError(null);
    try {
      await uploadCsv(projectId, file, contentColumn);
      setFile(null);
      setPreview(null);
      setContentColumn("");
      if (inputRef.current) inputRef.current.value = "";
      onSourceCreated();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [file, contentColumn, projectId, onSourceCreated]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setContentColumn("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <div className="flex flex-col">
      {!preview ? (
        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-[4px] border border-dashed px-4 py-8 transition-colors ${
            isDragOver
              ? "border-secondary bg-surface-container-high"
              : "border-outline-variant bg-surface-container-low"
          }`}
          animate={
            prefersReducedMotion
              ? undefined
              : isDragOver
              ? { scale: 1.02 }
              : { scale: 1 }
          }
          transition={prefersReducedMotion ? undefined : { ...springs.gentle }}
        >
          <svg
            className="h-6 w-6 text-on-surface-variant"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="mt-2 text-[13px] text-on-surface-variant">
            Drop a CSV file or{" "}
            <span className="font-medium text-secondary">click to browse</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
          />
        </motion.div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-on-surface-variant"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
              <span className="text-[13px] font-medium text-on-surface">
                {file?.name}
              </span>
            </div>
            <button
              onClick={handleReset}
              className="text-[11px] text-on-surface-variant hover:text-on-surface"
            >
              Clear
            </button>
          </div>

          <div className="overflow-x-auto rounded-[4px] bg-surface-container-low">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {preview.columns.map((col) => (
                    <th
                      key={col}
                      className={`px-2 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider ${
                        col === contentColumn
                          ? "bg-secondary/10 text-secondary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={`max-w-[160px] truncate px-2 py-1 font-mono text-[11px] ${
                          preview.columns[j] === contentColumn
                            ? "bg-secondary/5 text-on-surface"
                            : "text-on-surface-variant"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[12px] text-on-surface-variant">
              Content column:
            </label>
            <select
              value={contentColumn}
              onChange={(e) => setContentColumn(e.target.value)}
              className="rounded-[4px] bg-surface-container-lowest px-2 py-1 font-mono text-[12px] text-on-surface outline outline-1 outline-outline-variant focus:outline-secondary"
            >
              {preview.columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading || !contentColumn}
            className="flex items-center gap-2 rounded-[4px] bg-on-surface px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {isUploading && (
              <svg
                className="h-3.5 w-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-[12px] text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
