"use client";

import { useEffect, useRef, useState } from "react";
import type { Spec } from "@/types";
import {
  slugify,
  specsToCsv,
  specsToMarkdown,
} from "@/lib/spec-export";

interface ExportMenuProps {
  specs: Spec[];
  projectName: string;
}

type CopyState = "idle" | "copied" | "blocked";

export default function ExportMenu({ specs, projectName }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", onDown);
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const disabled = specs.length === 0;

  const today = new Date().toISOString().slice(0, 10);
  const slug = slugify(projectName);

  const handleCopyMarkdown = async () => {
    const md = specsToMarkdown(specs, projectName);
    try {
      await navigator.clipboard.writeText(md);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("blocked");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  const handleDownloadCsv = () => {
    const csv = specsToCsv(specs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-specs-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-[4px] bg-surface-container px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-20 w-[220px] rounded-[4px] bg-surface-container-lowest/90 py-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-md ring-1 ring-outline-variant/20"
        >
          <button
            role="menuitem"
            type="button"
            onClick={handleCopyMarkdown}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-on-surface hover:bg-surface-container-high"
          >
            <span>Copy as Markdown</span>
            {copyState === "copied" ? (
              <span className="font-mono text-[10px] text-secondary">✓ Copied</span>
            ) : copyState === "blocked" ? (
              <span className="font-mono text-[10px] text-error">Blocked</span>
            ) : null}
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={handleDownloadCsv}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-on-surface hover:bg-surface-container-high"
          >
            <span>Download CSV</span>
            <span className="font-mono text-[10px] text-on-surface-variant/70">
              {specs.length} rows
            </span>
          </button>
          {copyState === "blocked" ? (
            <div className="px-3 pb-2 text-[11px] leading-snug text-on-surface-variant">
              Clipboard blocked by this browser context — use CSV download.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
