"use client";
// Small bookmark icon that toggles the pinned state of a project card or list
// row. stopPropagation prevents the parent Link navigation from firing.

interface PinButtonProps {
  isPinned: boolean;
  onClick: () => void;
  ariaLabel: string;
}

export default function PinButton({
  isPinned,
  onClick,
  ariaLabel,
}: PinButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-surface-container-lowest text-on-surface-variant transition-colors hover:text-secondary"
      aria-label={ariaLabel}
      aria-pressed={isPinned}
    >
      {isPinned ? (
        <svg
          className="h-3.5 w-3.5 text-secondary"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 3.75A2.25 2.25 0 0 1 8.25 1.5h7.5A2.25 2.25 0 0 1 18 3.75v17.25l-6-3.375L6 21V3.75Z" />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
          />
        </svg>
      )}
    </button>
  );
}
