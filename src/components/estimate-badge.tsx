import { PRICE_ESTIMATE_NOTE } from "@/lib/price-estimates";

export function EstimateBadge({ note = PRICE_ESTIMATE_NOTE }: { note?: string }) {
  return (
    <span
      title={note}
      aria-label={note}
      className="ml-1.5 inline-flex cursor-help items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200"
    >
      Estimate
    </span>
  );
}

export function EstimateFootnote({ children }: { children: string }) {
  return <p className="mt-3 text-[11px] leading-relaxed text-forma-muted lg:text-xs">{children}</p>;
}
