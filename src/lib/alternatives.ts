export type AlternativeTier = "premium" | "similar" | "dupe";

/**
 * Cheaper alternatives first, premium last. A "budget dupe" that costs more
 * than the item is relabeled similar so the badge matches the price.
 */
export function orderAlternatives<T extends { price: number; tier: AlternativeTier }>(
  alternatives: readonly T[],
  estimate: number
): T[] {
  const adjusted = alternatives.map((alt) => {
    if (alt.tier === "dupe" && Number.isFinite(estimate) && estimate > 0 && alt.price > estimate) {
      return { ...alt, tier: "similar" as const };
    }
    return alt;
  });

  return [...adjusted].sort((a, b) => {
    const rank = (tier: AlternativeTier) => (tier === "premium" ? 1 : 0);
    const byTier = rank(a.tier) - rank(b.tier);
    if (byTier !== 0) return byTier;
    return a.price - b.price;
  });
}
