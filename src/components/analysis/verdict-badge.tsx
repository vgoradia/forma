import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import type { ProductAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getVerdictLabel } from "@/lib/scan-helpers";

const verdictConfig = {
  buy: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  wait: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  skip: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  "consider-alternatives": {
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
} as const;

export function VerdictBadge({
  recommendation,
  className,
}: {
  recommendation: ProductAnalysis["verdict"]["recommendation"];
  className?: string;
}) {
  const config = verdictConfig[recommendation] ?? verdictConfig.buy;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.bg,
        config.border,
        config.color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {getVerdictLabel(recommendation)}
    </span>
  );
}
