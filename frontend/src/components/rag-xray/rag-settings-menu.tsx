"use client";

import { useEffect, useRef, useState } from "react";

import { RagSettingsPanel } from "@/components/rag-xray/rag-settings-panel";
import { useFloatingPosition } from "@/lib/use-floating-position";
import {
  RAG_SETTINGS_DEFAULTS,
  type RagSettings,
} from "@/lib/use-rag-settings";

interface RagSettingsMenuProps {
  settings: RagSettings;
  onTopKChange: (topK: number) => void;
  onThresholdChange: (threshold: number) => void;
  onReset: () => void;
}

export function RagSettingsMenu({
  settings,
  onTopKChange,
  onThresholdChange,
  onReset,
}: RagSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const position = useFloatingPosition({
    isOpen,
    triggerRef,
    preferredWidth: 320,
  });

  const isDefault =
    settings.topK === RAG_SETTINGS_DEFAULTS.topK &&
    Math.abs(settings.threshold - RAG_SETTINGS_DEFAULTS.threshold) < 1e-6;

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Register via setTimeout(0) so the opening click doesn't immediately close
  // the popover. The popover renders outside the trigger's DOM subtree
  // (position: fixed), so both refs must be checked for outside-click detection.
  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleMouseDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Retrieval settings"
        title={
          isDefault
            ? "Retrieval settings · at defaults"
            : `Retrieval settings · k=${settings.topK}, t=${settings.threshold.toFixed(2)}`
        }
        className="inline-flex items-center gap-1.5 rounded-[4px] bg-surface-container-high px-2 py-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-on-surface transition-colors hover:bg-on-surface hover:text-surface-container-lowest"
      >
        <SettingsIcon className="h-3 w-3" />
        <span>Settings</span>
        {!isDefault && (
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-secondary"
            title="Off defaults"
          />
        )}
      </button>
      {isOpen && position && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Retrieval settings"
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            width: position.width,
          }}
          className="z-50 max-h-[80vh] overflow-y-auto rounded-[4px] bg-surface-container-lowest/95 ring-1 ring-inset ring-outline-variant/20 backdrop-blur-md"
        >
          <RagSettingsPanel
            settings={settings}
            onTopKChange={onTopKChange}
            onThresholdChange={onThresholdChange}
            onReset={onReset}
          />
        </div>
      )}
    </>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}
