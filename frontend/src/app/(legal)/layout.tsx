// Minimal layout for legal/docs pages: Trawl logo link to home, no auth required.
import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-surface-container-lowest shadow-[inset_0_-1px_0_rgba(15,23,42,0.04)]">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <Link
            href="/"
            className="text-base font-bold text-on-surface transition-colors hover:text-secondary"
          >
            Trawl
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
