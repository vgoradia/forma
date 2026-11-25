"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function TrackOnMount({ name, source }: { name: string; source?: string }) {
  useEffect(() => {
    trackEvent(name, source ? { source } : undefined);
  }, [name, source]);

  return null;
}
