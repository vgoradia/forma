"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeStorage } from "@/lib/storage-events";
import {
  displayScanQuota,
  FREE_SCANS_PER_MONTH,
  GUEST_SCANS_PER_MONTH,
  type ServerUsageSnapshot,
} from "@/lib/scan-quota";

export function useScanQuota() {
  const { user, loading: authLoading } = useAuth();
  const [tick, setTick] = useState(0);
  const [server, setServer] = useState<ServerUsageSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => subscribeStorage(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/scan-usage", { credentials: "include" });
        if (!res.ok) throw new Error("scan usage failed");
        const data = (await res.json()) as ServerUsageSnapshot;
        if (cancelled) return;
        setServer(data.enforced ? data : null);
      } catch {
        if (!cancelled) setServer(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, tick, userId]);

  const fallbackLimit = user ? FREE_SCANS_PER_MONTH : GUEST_SCANS_PER_MONTH;
  const quota = displayScanQuota(server, fallbackLimit);

  return {
    ...quota,
    loading: authLoading || !loaded,
    isGuest: !user,
  };
}
