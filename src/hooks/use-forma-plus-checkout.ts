"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscriptionPlan } from "@/hooks/use-subscription-plan";
import { useUserProfile } from "@/hooks/use-user-profile";

export function useFormaPlusCheckout() {
  const router = useRouter();
  const profile = useUserProfile();
  const { plan, configured, loading } = useSubscriptionPlan();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const startCheckout = useCallback(async () => {
    if (loading || pending) return;

    if (!profile.isAuthenticated) {
      router.push("/login?next=/profile");
      return;
    }

    if (!configured) {
      setMessage("Billing is being set up — check back soon.");
      setTimeout(() => setMessage(null), 3500);
      return;
    }

    if (plan === "plus") {
      setMessage("You're already on Forma Plus!");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setPending(true);
    setMessage("Redirecting to secure checkout…");

    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.href = data.url;
    } catch {
      setMessage("Could not start checkout. Try again in a moment.");
      setPending(false);
      setTimeout(() => setMessage(null), 3500);
    }
  }, [configured, loading, pending, plan, profile.isAuthenticated, router]);

  return {
    plan,
    isPlus: plan === "plus",
    configured,
    loading,
    pending,
    message,
    startCheckout,
  };
}
