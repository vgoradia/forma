"use client";

import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth-ui";
import { useScanQuota } from "@/hooks/use-scan-quota";
import { useSubscriptionPlan } from "@/hooks/use-subscription-plan";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function ScanQuotaBanner({
  className,
  showUpgradeLink = true,
}: {
  className?: string;
  showUpgradeLink?: boolean;
}) {
  const { plan, loading: planLoading } = useSubscriptionPlan();
  const quota = useScanQuota();

  if (planLoading || quota.loading || plan === "plus") return null;

  const { remaining, limit, isGuest } = quota;
  const atLimit = remaining === 0;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        atLimit
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-forma-border bg-white text-gray-700",
        className
      )}
    >
      <p className="font-medium text-gray-900">
        {atLimit
          ? isGuest
            ? "You've used your guest scans this month"
            : "You've used your free scans this month"
          : `${remaining} of ${limit} free scans left this month`}
      </p>
      <p className="mt-0.5 text-xs text-forma-muted">
        {atLimit
          ? isGuest
            ? "Sign in with Google for more free scans."
            : "Upgrade for unlimited verdicts, or come back next month."
          : "Each scan gives you a buy / wait / skip verdict with prices and dupes."}
      </p>
      {atLimit && isGuest ? (
        <div className="mt-3">
          <GoogleSignInButton redirectTo="/scan" label="Sign in with Google" />
        </div>
      ) : (
        showUpgradeLink && (
          <Link
            href="/profile"
            onClick={() => trackEvent("upgrade_clicked", { source: "quota_banner" })}
            className="mt-2 inline-block text-xs font-semibold text-forma-primary hover:underline"
          >
            {atLimit ? "Get Forma Plus" : "Go unlimited with Forma Plus →"}
          </Link>
        )
      )}
    </div>
  );
}
