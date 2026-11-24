"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { pullCloudScansIntoLocal, pushAllLocalScansToCloud } from "@/lib/scans-cloud";

/** Merges cloud scan history when a user signs in. */
export function CloudScanSync() {
  const { user, loading } = useAuth();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (syncedFor.current === user.id) return;

    syncedFor.current = user.id;

    void (async () => {
      await pullCloudScansIntoLocal();
      await pushAllLocalScansToCloud();
    })();
  }, [user, loading]);

  return null;
}