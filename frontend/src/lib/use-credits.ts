"use client";

import { useCallback, useEffect, useState } from "react";

import { getCreditBalance } from "@/lib/api";

export function useCredits() {
  const [balance, setBalance] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { creditsBalance } = await getCreditBalance();
      setBalance(creditsBalance);
    } catch {
      setBalance(null);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onPaywall = () => {
      void refresh();
    };
    window.addEventListener("trawl:paywall", onPaywall);
    return () => window.removeEventListener("trawl:paywall", onPaywall);
  }, [refresh]);

  return { balance, initialLoading, refresh };
}
