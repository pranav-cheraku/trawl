"use client";

import { useState } from "react";
import { connectReddit } from "@/lib/api";
import type { ConnectorFormProps } from "@/lib/connector-registry";

type Mode = "subreddit" | "keyword";
type RedditPreset = "quick" | "standard" | "deep";

export default function RedditForm({
  projectId,
  onSourceCreated,
}: ConnectorFormProps) {
  const [mode, setMode] = useState<Mode>("subreddit");
  const [preset, setPreset] = useState<RedditPreset>("standard");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await connectReddit(projectId, { mode, value: trimmed, preset });
      onSourceCreated();
    } catch {
      setError(
        mode === "subreddit"
          ? `Failed to connect r/${trimmed.replace(/^r\//, "")}`
          : `Failed to search for "${trimmed}"`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Reddit input mode"
        className="flex gap-0.5 self-start rounded-[4px] bg-surface-container-low p-0.5"
      >
        <button
          type="button"
          onClick={() => setMode("subreddit")}
          aria-pressed={mode === "subreddit"}
          className={`rounded-[3px] px-3 py-1 text-[12px] font-medium transition-colors ${
            mode === "subreddit"
              ? "bg-surface-container-lowest text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Subreddit
        </button>
        <button
          type="button"
          onClick={() => setMode("keyword")}
          aria-pressed={mode === "keyword"}
          className={`rounded-[3px] px-3 py-1 text-[12px] font-medium transition-colors ${
            mode === "keyword"
              ? "bg-surface-container-lowest text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Keyword
        </button>
      </div>

      <div
        role="group"
        aria-label="Yield preset"
        className="flex gap-0.5 self-start rounded-[4px] bg-surface-container-low p-0.5"
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
          Quick
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
          Standard
        </button>
        <button
          type="button"
          onClick={() => setPreset("deep")}
          aria-pressed={preset === "deep"}
          className={`rounded-[3px] px-3 py-1 text-[11px] font-medium transition-colors ${
            preset === "deep"
              ? "bg-surface-container-lowest text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Deep
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[12px] text-on-surface-variant">
          {mode === "subreddit" ? "Subreddit name" : "Search keyword"}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            mode === "subreddit"
              ? "r/spotify or spotify"
              : 'e.g. "spotify shuffle bug"'
          }
          maxLength={255}
          className="w-full rounded-[4px] bg-surface-container-lowest px-3 py-2 text-[13px] text-on-surface outline outline-1 outline-outline-variant placeholder:text-on-surface-variant/60 focus:outline-secondary"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !value.trim()}
        className="inline-flex items-center gap-2 self-start rounded-[4px] bg-on-surface px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-secondary disabled:opacity-50"
      >
        {isSubmitting ? "Connecting..." : "Connect"}
      </button>

      {error && (
        <p className="text-[12px] text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
