import type { StoredScan } from "./storage";
import type { ProductAnalysis } from "./types";
import { getAnalysisHeroImage } from "./product-images";
import { homeSections } from "./demo-data";

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function getSourceLabel(scan: StoredScan): string {
  switch (scan.source) {
    case "upload":
      return "Image scan";
    case "link":
      return "Product link";
    case "pinterest":
      return "Pinterest screenshot";
    case "tiktok":
      return "TikTok clip";
    case "instagram":
      return "Instagram post";
    default:
      return scan.label || "Text search";
  }
}

export function getSourceIcon(scan: StoredScan): string {
  switch (scan.source) {
    case "pinterest":
      return "pi";
    case "tiktok":
      return "tt";
    case "instagram":
      return "ig";
    case "link":
      return "lk";
    case "upload":
      return "up";
    default:
      return "sr";
  }
}

export function getProductName(scan: StoredScan): string {
  const p = scan.analysis?.identifiedProduct;
  if (!p?.brand || !p?.name) return scan.label || "Saved scan";
  return `${p.brand} ${p.name}`;
}

export function getScanImage(scan: StoredScan): string | undefined {
  return getAnalysisHeroImage(scan.analysis, scan.imagePreview);
}

export function getContinueSearching(scans: StoredScan[]) {
  return scans.slice(0, 6).map((scan) => ({
    id: scan.id,
    name: getProductName(scan),
    subtitle: formatRelativeTime(scan.savedAt),
    imageUrl: getScanImage(scan),
    href: `/analysis/${scan.id}`,
  }));
}

export function getPriceDropAlerts(scans: StoredScan[]) {
  return scans
    .filter((s) => s.analysis.salePrediction?.likelihood && s.analysis.salePrediction.likelihood !== "low")
    .slice(0, 6)
    .map((scan) => ({
      id: scan.id,
      name: getProductName(scan),
      price: scan.analysis.lowestPrice?.price,
      subtitle: `Expected sale ${scan.analysis.salePrediction?.predictedDrop?.toLowerCase() ?? "soon"}`,
      imageUrl: getScanImage(scan),
      href: `/analysis/${scan.id}`,
    }));
}

export function getRecommendedFromScans(scans: StoredScan[]) {
  const items: {
    id: string;
    name: string;
    subtitle: string;
    imageUrl?: string;
    href: string;
  }[] = [];

  for (const scan of scans) {
    for (const alt of scan.analysis.alternatives.slice(0, 2)) {
      items.push({
        id: `${scan.id}-${alt.brand}-${alt.name}`,
        name: `${alt.brand} ${alt.name}`,
        subtitle: alt.reason,
        imageUrl: alt.imageUrl,
        href: alt.url,
      });
      if (items.length >= 6) return items;
    }
  }

  return items;
}

export function getWardrobeMatchesFromScans(scans: StoredScan[]) {
  const items: {
    id: string;
    name: string;
    matches: number;
    subtitle: string;
    imageUrl?: string;
    href: string;
  }[] = [];

  for (const scan of scans) {
    for (const match of scan.analysis.wardrobeMatches.slice(0, 2)) {
      items.push({
        id: `${scan.id}-${match.item}`,
        name: match.item,
        matches: scan.analysis.wardrobeMatches.length,
        subtitle: `Matches ${scan.analysis.wardrobeMatches.length} items in your wardrobe`,
        imageUrl: match.imageUrl,
        href: `/analysis/${scan.id}`,
      });
      if (items.length >= 6) return items;
    }
  }

  return items;
}

export function getRecentScanRows(scans: StoredScan[]) {
  return scans.slice(0, 9).map((scan) => ({
    id: scan.id,
    source: getSourceLabel(scan),
    time: formatRelativeTime(scan.savedAt),
    icon: getSourceIcon(scan),
    href: `/analysis/${scan.id}`,
  }));
}

export function getSavedItems(scans: StoredScan[], bookmarkIds: string[]) {
  return scans.filter((s) => bookmarkIds.includes(s.id));
}

export function countWardrobeItems(scans: StoredScan[]): number {
  const unique = new Set<string>();
  for (const scan of scans) {
    for (const match of scan.analysis.wardrobeMatches) {
      unique.add(match.item.toLowerCase());
    }
  }
  return unique.size;
}

export function getDemoContinueSearching() {
  return homeSections.continueSearching.map((item) => ({
    id: item.id,
    name: item.name,
    subtitle: item.saved,
    imageUrl: item.imageUrl,
    href: "/scan",
  }));
}

export function getDemoPriceDrops() {
  return homeSections.priceDrops.map((item) => ({
    id: item.id,
    name: item.name,
    subtitle: item.note,
    price: item.price,
    imageUrl: item.imageUrl,
    href: "/alerts",
  }));
}

export function getDemoRecommended() {
  return homeSections.recommended.map((item) => ({
    id: item.id,
    name: item.name,
    subtitle: item.reason,
    imageUrl: item.imageUrl,
    href: "/scan",
  }));
}

export function getDemoWardrobeMatches() {
  return homeSections.wardrobeMatches.map((item) => ({
    id: item.id,
    name: item.name,
    matches: item.matches,
    subtitle: `Matches ${item.matches} items in your wardrobe`,
    imageUrl: item.imageUrl,
    href: "/wardrobe",
  }));
}

export function getVerdictLabel(recommendation: ProductAnalysis["verdict"]["recommendation"]) {
  switch (recommendation) {
    case "buy":
      return "Buy";
    case "wait":
      return "Wait for sale";
    case "skip":
      return "Skip";
    case "consider-alternatives":
      return "Consider alternatives";
  }
}

export function getAlternativeTierLabel(tier: "premium" | "similar" | "dupe") {
  switch (tier) {
    case "dupe":
      return "Budget dupe";
    case "similar":
      return "Similar";
    case "premium":
      return "Premium";
  }
}
