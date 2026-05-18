// Shown in a ThemeCard when spec generation failed for that theme.
// The error is not surfaced here; it lives in the task failure_reason field.
export default function ThemeSpecFailed() {
  return (
    <p className="rounded-[4px] bg-surface-container px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
      · Spec generation failed for this theme. Re-run to retry.
    </p>
  );
}
