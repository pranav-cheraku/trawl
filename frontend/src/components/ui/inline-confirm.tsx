"use client";

interface InlineConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Compact Yes / No confirmation used inline for destructive actions
 * (delete source, delete project). Stops click propagation so it can
 * safely live inside clickable rows or cards.
 */
export default function InlineConfirm({
  message,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: InlineConfirmProps) {
  return (
    <div
      className="flex items-center gap-2 text-[12px]"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-on-surface-variant">{message}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
        disabled={isSubmitting}
        className="font-medium text-error hover:underline disabled:opacity-50"
        aria-label="Confirm"
      >
        {isSubmitting ? "..." : "Yes"}
      </button>
      <span className="text-on-surface-variant/40">/</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="font-medium text-on-surface-variant hover:text-on-surface"
        aria-label="Cancel"
      >
        No
      </button>
    </div>
  );
}
