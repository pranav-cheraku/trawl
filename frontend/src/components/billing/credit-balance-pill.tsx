"use client";
// Credit balance chip in the app header. Backed by useCredits() which syncs
// on trawl:paywall and trawl:credits-updated window events.

import Link from "next/link";

import { useCredits } from "@/lib/use-credits";

export function CreditBalancePill() {
  const { balance, initialLoading } = useCredits();
  if (initialLoading || balance === null) return null;

  return (
    <Link
      href="/billing"
      title="New accounts start with 25 free credits. Click to buy more."
      className="hidden items-center gap-2 rounded-[4px] bg-surface-container-low px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface sm:inline-flex"
    >
      <span className="text-[11px] uppercase tracking-wider">Credits</span>
      <span className="text-on-surface">{balance}</span>
    </Link>
  );
}
