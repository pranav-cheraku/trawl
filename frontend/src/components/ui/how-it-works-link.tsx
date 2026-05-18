// Quiet contextual link to /docs. Drop into empty states and help affordances
// rather than hand-rolling a docs link each time.
import Link from "next/link";

interface HowItWorksLinkProps {
  className?: string;
}

/**
 * Quiet contextual link to the /docs guide. Used in empty states across the
 * app so help is always one click away.
 */
export function HowItWorksLink({ className = "" }: HowItWorksLinkProps) {
  return (
    <Link
      href="/docs"
      className={`inline-flex items-center gap-1 text-[12px] font-medium text-on-surface-variant transition-colors hover:text-secondary ${className}`}
    >
      How it works
      <span aria-hidden>→</span>
    </Link>
  );
}
