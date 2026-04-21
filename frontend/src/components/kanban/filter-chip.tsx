"use client";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: "ink" | "signal";
  ariaLabel?: string;
}

export default function FilterChip({
  label,
  active,
  onClick,
  accent = "ink",
  ariaLabel,
}: FilterChipProps) {
  const base =
    "inline-flex items-center rounded-[2px] px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[0.15em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";
  const inactive =
    "bg-surface-container text-on-surface-variant hover:bg-surface-container-high";
  const activeInk = "bg-on-surface text-surface-container-lowest";
  const activeSignal = "bg-secondary text-surface-container-lowest";
  const activeClass = accent === "signal" ? activeSignal : activeInk;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      className={`${base} ${active ? activeClass : inactive}`}
    >
      {label}
    </button>
  );
}
