"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { readTrustedPlan, type UserPlan } from "@/lib/plan";

export type { UserPlan };

export function useSubscriptionPlan() {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<UserPlan>("free");
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    void (async () => {
      if (!user) {
        if (!cancelled) {
          setPlan("free");
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/stripe/subscription-status");
        if (!res.ok) throw new Error("status failed");
        const data = (await res.json()) as { plan?: UserPlan; configured?: boolean };
        if (!cancelled) {
          setPlan(data.plan === "plus" ? "plus" : "free");
          setConfigured(Boolean(data.configured));
        }
      } catch {
        if (!cancelled) {
          // Display only. app_metadata is signed into the session by Supabase;
          // user_metadata is not consulted because the client can edit it.
          setPlan(readTrustedPlan(user));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return { plan, loading: authLoading || loading, configured };
}
