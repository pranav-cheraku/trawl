"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectAppStore, searchApps } from "@/lib/api";
import type { AppSearchResult } from "@/types";
import type { ConnectorFormProps } from "@/lib/connector-registry";

type AppStorePreset = "quick" | "standard";

export default function AppStoreForm({
  projectId,
  onSourceCreated,
}: ConnectorFormProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [preset, setPreset] = useState<AppStorePreset>("standard");

  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      setError(null);
      try {
        const data = await searchApps(query.trim());
        if (!controller.signal.aborted) {
          setResults(data);
          setShowDropdown(data.length > 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setShowDropdown(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Click outside to dismiss
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleConnect = useCallback(
    async (app: AppSearchResult) => {
      setConnectingId(app.trackId);
      setError(null);
      try {
        await connectAppStore(projectId, app.trackName, undefined, preset);
        setQuery("");
        setResults([]);
        setShowDropdown(false);
        onSourceCreated();
      } catch {
        setError(`Failed to connect "${app.trackName}"`);
      } finally {
        setConnectingId(null);
      }
    },
    [projectId, onSourceCreated, preset],
  );

  return (
    <div ref={containerRef} className="relative flex flex-col">
      {/* Yield preset */}
      <div
        role="group"
        aria-label="Yield preset"
        className="mb-3 flex gap-0.5 self-start rounded-[4px] bg-surface-container-low p-0.5"
      >
        <button
          type="button"
          onClick={() => setPreset("quick")}
          aria-pressed={preset === "quick"}
          className={`rounded-[3px] px-3 py-1 text-[11px] font-medium transition-colors ${
            preset === "quick"
              ? "bg-surface-container-lowest text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Quick · ~500
        </button>
        <button
          type="button"
          onClick={() => setPreset("standard")}
          aria-pressed={preset === "standard"}
          className={`rounded-[3px] px-3 py-1 text-[11px] font-medium transition-colors ${
            preset === "standard"
              ? "bg-surface-container-lowest text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Standard · ~2,000
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search the App Store..."
          className="w-full rounded-[4px] bg-surface-container-lowest px-3 py-2 text-[13px] text-on-surface outline outline-1 outline-outline-variant placeholder:text-on-surface-variant/60 focus:outline-secondary"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-4 w-4 animate-spin text-on-surface-variant"
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
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[320px] overflow-y-auto rounded-[4px] bg-surface-container-lowest/85 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-[12px]">
          {results.map((app) => (
            <div
              key={app.trackId}
              className="flex items-center gap-3 rounded-[4px] px-3 py-2 hover:bg-surface-container-high"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={app.artworkUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-[4px]"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-on-surface">
                  {app.trackName}
                </p>
                <div className="flex items-center gap-2">
                  {app.averageRating != null && (
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.round(app.averageRating!)
                              ? "text-secondary"
                              : "text-outline-variant/40"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-0.5 font-mono text-[10px] text-on-surface-variant">
                        {app.averageRating.toFixed(1)}
                      </span>
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    {app.genre}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleConnect(app)}
                disabled={connectingId !== null}
                className="shrink-0 rounded-[4px] bg-on-surface px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {connectingId === app.trackId ? (
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
                ) : (
                  "Connect"
                )}
              </button>
            </div>
          ))}
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
