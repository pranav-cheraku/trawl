"use client";

import { useId } from "react";

import {
  RAG_SETTINGS_BOUNDS,
  RAG_SETTINGS_DEFAULTS,
  type RagSettings,
} from "@/lib/use-rag-settings";

interface RagSettingsPanelProps {
  settings: RagSettings;
  onTopKChange: (topK: number) => void;
  onThresholdChange: (threshold: number) => void;
  onReset: () => void;
}

/**
 * Two-slider control surface for the RAG retrieval knobs, mounted inside
 * `RagSettingsMenu`'s frosted-glass popover. Values are user-tuned per
 * project (persisted via `useRagSettings`) and apply to the NEXT
 * `sendMessage` call — they don't retroactively change the chunks shown
 * for the currently-displayed message.
 */
export function RagSettingsPanel({
  settings,
  onTopKChange,
  onThresholdChange,
  onReset,
}: RagSettingsPanelProps) {
  const topKId = useId();
  const thresholdId = useId();
  const isDefault =
    settings.topK === RAG_SETTINGS_DEFAULTS.topK &&
    Math.abs(settings.threshold - RAG_SETTINGS_DEFAULTS.threshold) < 1e-6;

  return (
    <div className="flex flex-col gap-3 px-4 pt-3 pb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          Retrieval Settings
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={isDefault}
          className="rounded-[4px] bg-surface-container-high px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-on-surface transition-colors hover:bg-on-surface hover:text-surface-container-lowest disabled:cursor-not-allowed disabled:bg-transparent disabled:text-on-surface-variant/50 disabled:hover:bg-transparent disabled:hover:text-on-surface-variant/50"
          aria-label="Reset retrieval settings to defaults"
          title={
            isDefault
              ? "Already at defaults"
              : `Reset to k=${RAG_SETTINGS_DEFAULTS.topK}, t=${RAG_SETTINGS_DEFAULTS.threshold.toFixed(2)}`
          }
        >
          Reset to Defaults
        </button>
      </div>

      <SliderRow
        id={topKId}
        label="Top-K"
        value={settings.topK}
        min={RAG_SETTINGS_BOUNDS.topK.min}
        max={RAG_SETTINGS_BOUNDS.topK.max}
        step={RAG_SETTINGS_BOUNDS.topK.step}
        formatValue={(v) => String(v)}
        description="How many of your most relevant feedback chunks get fed into the answer. Higher = broader context, slightly slower."
        onChange={onTopKChange}
      />

      <SliderRow
        id={thresholdId}
        label="Threshold"
        value={settings.threshold}
        min={RAG_SETTINGS_BOUNDS.threshold.min}
        max={RAG_SETTINGS_BOUNDS.threshold.max}
        step={RAG_SETTINGS_BOUNDS.threshold.step}
        formatValue={(v) => v.toFixed(2)}
        description="Minimum cosine similarity a chunk needs to be considered. Higher = stricter match, fewer (but more on-topic) chunks."
        onChange={onThresholdChange}
      />
    </div>
  );
}

interface SliderRowProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  description: string;
  onChange: (next: number) => void;
}

function SliderRow({
  id,
  label,
  value,
  min,
  max,
  step,
  formatValue,
  description,
  onChange,
}: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface"
        >
          {label}
        </label>
        <span className="font-mono text-[11px] text-on-surface">
          {formatValue(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rag-slider h-1.5 w-full appearance-none rounded-[2px] bg-surface-container-high"
        aria-label={`${label} retrieval slider`}
      />
      <div className="flex items-center justify-between font-mono text-[9px] text-on-surface-variant/70">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      <p className="text-[11.5px] leading-snug text-on-surface-variant">
        {description}
      </p>
    </div>
  );
}
