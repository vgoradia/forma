import Link from "next/link";
import { INLINE_AFFILIATE_DISCLOSURE } from "@/lib/legal";
import { cn } from "@/lib/utils";

/** One-line FTC disclosure placed next to retailer and buy links. */
export function AffiliateLinkNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-forma-muted lg:text-xs", className)}>
      <Link
        href="/affiliate-disclosure"
        className="underline decoration-forma-border underline-offset-2 hover:text-gray-800"
      >
        {INLINE_AFFILIATE_DISCLOSURE}
      </Link>
    </p>
  );
}
