"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { subscribeStorage } from "@/lib/storage-events";
import { FREE_SCANS_PER_MONTH, getScanQuota } from "@/lib/scan-quota";
import { useSubscriptionPlan } from "@/hooks/use-subscription-plan";
import { cn } from "@/lib/utils";

export function ScanQuotaBanner({
  className,
  showUpgradeLink = true,
}: {
  className?: string;
  showUpgradeLink?: boolean;
}) {
  const { plan, loading } = useSubscriptionPlan();
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeStorage(() => setTick((n) => n + 1)), []);
  void tick;
  const quota = getScanQuota();

  if (loading || plan === "plus") return null;

  const atLimit = quota.remaining === 0;

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
          ? "You've used your free scans this month"
          : `${quota.remaining} of ${FREE_SCANS_PER_MONTH} free scans left this month`}
      </p>
      <p className="mt-0.5 text-xs text-forma-muted">
        {atLimit
          ? "Upgrade for unlimited verdicts, or come back next month."
          : "Each scan gives you a buy / wait / skip verdict with prices and dupes."}
      </p>
      {showUpgradeLink && (
        <Link
          href="/profile"
          className="mt-2 inline-block text-xs font-semibold text-forma-primary hover:underline"
        >
          {atLimit ? "Get Forma Plus" : "Go unlimited with Forma Plus →"}
        </Link>
      )}
    </div>
  );
}