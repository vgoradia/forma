"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export type UserPlan = "free" | "plus";

export function useSubscriptionPlan() {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<UserPlan>("free");
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setPlan("free");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/stripe/subscription-status");
      if (!res.ok) throw new Error("status failed");
      const data = (await res.json()) as { plan?: UserPlan; configured?: boolean };
      setPlan(data.plan === "plus" ? "plus" : "free");
      setConfigured(Boolean(data.configured));
    } catch {
      const metadataPlan = user.user_metadata?.plan;
      setPlan(metadataPlan === "plus" ? "plus" : "free");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  return { plan, loading: authLoading || loading, configured, refresh };
}
