"use client";

import Link from "next/link";

import { useCredits } from "@/lib/use-credits";

export function CreditBalancePill() {
  const { balance, initialLoading } = useCredits();
  if (initialLoading || balance === null) return null;

  return (
    <Link
      href="/billing"
      className="hidden items-center gap-2 rounded-[4px] bg-surface-container-low px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface sm:inline-flex"
    >
      <span className="text-[11px] uppercase tracking-wider">Credits</span>
      <span className="text-on-surface">{balance}</span>
    </Link>
  );
}
