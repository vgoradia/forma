import type { ReactNode } from "react";
import { applyAffiliateParams } from "@/lib/affiliate";

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

  return (
    <a href={outbound} target="_blank" rel="noopener noreferrer sponsored" className={className}>
      {children}
    </a>
  );
}
