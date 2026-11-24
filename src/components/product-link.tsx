"use client";

import type { ReactNode } from "react";
import { applyAffiliateParams } from "@/lib/affiliate";
import { trackEvent } from "@/lib/analytics";

/** Opens retailer links in a new tab so Forma stays open. */
export function ProductLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const trimmed = href?.trim();
  if (!trimmed || trimmed === "#") {
    return <span className={className}>{children}</span>;
  }

  const outbound = applyAffiliateParams(trimmed);

  const handleClick = () => {
    try {
      const host = new URL(outbound).hostname.replace(/^www\./, "");
      trackEvent("affiliate_click", { retailer: host });
    } catch {
      trackEvent("affiliate_click", { retailer: "unknown" });
    }
  };

  return (
    <a
      href={outbound}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
