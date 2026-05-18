"use client";
// Credit balance hook. Every useCredits() instance is independent; fire a
// trawl:credits-updated window event to sync all instances simultaneously.
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
    const onRefresh = () => {
      void refresh();
    };
    // `trawl:paywall` fires on a 402; `trawl:credits-updated` fires after a
    // purchase/refresh. Both must re-fetch so every useCredits instance
    // (header pill + billing page) stays in sync.
    window.addEventListener("trawl:paywall", onRefresh);
    window.addEventListener("trawl:credits-updated", onRefresh);
    return () => {
      window.removeEventListener("trawl:paywall", onRefresh);
      window.removeEventListener("trawl:credits-updated", onRefresh);
    };
  }, [refresh]);

  return { balance, initialLoading, refresh };
}
