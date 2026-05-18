"use client";
// Fetches /api/auth/me and re-fetches on trawl:user-updated so the header
// dropdown and profile page stay in sync after a name edit.
import { useCallback, useEffect, useState } from "react";

import { getUserMe } from "@/lib/api";
import type { UserMe } from "@/types";

export function useUserMe() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getUserMe();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdated = () => {
      void refresh();
    };
    window.addEventListener("trawl:user-updated", onUpdated);
    return () => window.removeEventListener("trawl:user-updated", onUpdated);
  }, [refresh]);

  return { user, initialLoading, refresh };
}
