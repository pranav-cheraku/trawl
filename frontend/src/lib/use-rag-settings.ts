"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface RagSettings {
  topK: number;
  threshold: number;
}

// Mirror TOP_K + SIMILARITY_THRESHOLD from backend/app/routers/conversations.py.
export const RAG_SETTINGS_DEFAULTS: RagSettings = {
  topK: 8,
  threshold: 0.3,
};

export const RAG_SETTINGS_BOUNDS = {
  topK: { min: 1, max: 30, step: 1 },
  threshold: { min: 0.0, max: 1.0, step: 0.05 },
} as const;

function storageKey(projectId: string): string {
  return `trawl:rag:${projectId}:settings`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readStored(projectId: string): RagSettings {
  if (typeof window === "undefined") return RAG_SETTINGS_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return RAG_SETTINGS_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<RagSettings>;
    const topK =
      typeof parsed.topK === "number" && Number.isFinite(parsed.topK)
        ? clamp(
            Math.round(parsed.topK),
            RAG_SETTINGS_BOUNDS.topK.min,
            RAG_SETTINGS_BOUNDS.topK.max,
          )
        : RAG_SETTINGS_DEFAULTS.topK;
    const threshold =
      typeof parsed.threshold === "number" && Number.isFinite(parsed.threshold)
        ? clamp(
            parsed.threshold,
            RAG_SETTINGS_BOUNDS.threshold.min,
            RAG_SETTINGS_BOUNDS.threshold.max,
          )
        : RAG_SETTINGS_DEFAULTS.threshold;
    return { topK, threshold };
  } catch {
    return RAG_SETTINGS_DEFAULTS;
  }
}

function writeStored(projectId: string, settings: RagSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(projectId),
      JSON.stringify(settings),
    );
  } catch {
    // Quota exceeded or private mode.
  }
}

export interface UseRagSettingsResult {
  settings: RagSettings;
  setTopK: (topK: number) => void;
  setThreshold: (threshold: number) => void;
  reset: () => void;
}

/**
 * Per-project RAG retrieval settings backed by localStorage. Initializes to
 * defaults so SSR and the first client render agree, then hydrates from
 * storage in an effect.
 */
export function useRagSettings(projectId: string): UseRagSettingsResult {
  const [settings, setSettings] = useState<RagSettings>(RAG_SETTINGS_DEFAULTS);

  useEffect(() => {
    setSettings(readStored(projectId));
  }, [projectId]);

  const setTopK = useCallback(
    (topK: number) => {
      const next = {
        topK: clamp(
          Math.round(topK),
          RAG_SETTINGS_BOUNDS.topK.min,
          RAG_SETTINGS_BOUNDS.topK.max,
        ),
        threshold: settings.threshold,
      };
      setSettings(next);
      writeStored(projectId, next);
    },
    [projectId, settings.threshold],
  );

  const setThreshold = useCallback(
    (threshold: number) => {
      const next = {
        topK: settings.topK,
        threshold: clamp(
          threshold,
          RAG_SETTINGS_BOUNDS.threshold.min,
          RAG_SETTINGS_BOUNDS.threshold.max,
        ),
      };
      setSettings(next);
      writeStored(projectId, next);
    },
    [projectId, settings.topK],
  );

  const reset = useCallback(() => {
    setSettings(RAG_SETTINGS_DEFAULTS);
    writeStored(projectId, RAG_SETTINGS_DEFAULTS);
  }, [projectId]);

  return useMemo(
    () => ({ settings, setTopK, setThreshold, reset }),
    [settings, setTopK, setThreshold, reset],
  );
}
