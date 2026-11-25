/**
 * Placeholder words models emit when they cannot name a brand or retailer.
 * These must never be shown in a title or an "at {retailer}" sentence.
 */
const EXACT_PLACEHOLDERS = new Set([
  "unknown",
  "n/a",
  "n.a.",
  "n.a",
  "na",
  "n a",
  "null",
  "undefined",
  "none",
  "generic",
  "unbranded",
  "no brand",
  "no retailer",
  "not available",
  "unavailable",
  "not specified",
  "unidentified",
  "unknown brand",
  "unknown retailer",
  "generic brand",
  "generic retailer",
  "brand unknown",
  "retailer unknown",
]);

/** "Unknown", "N/A", "null", "Generic", empty, and the same words with light punctuation. */
export function isPlaceholderLabel(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!trimmed) return true;
  const stripped = trimmed.replace(/[.]+$/g, "").trim();
  return EXACT_PLACEHOLDERS.has(trimmed) || EXACT_PLACEHOLDERS.has(stripped);
}

/** Real brand or retailer text, or "" when the model had nothing to name. */
export function sanitizeLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || isPlaceholderLabel(trimmed)) return "";
  return trimmed;
}

// Leading placeholder tokens baked into a product name. "Generic Surplus" is a
// real denim label, so that pair is left intact.
const LEADING_PLACEHOLDER =
  /^(?:unknown|n\/a|n\.a\.|null|undefined|unbranded)\b[\s:,\-–—]*/i;
const LEADING_GENERIC = /^generic\b(?!\s+surplus\b)[\s:,\-–—]*/i;

/** Drop a leading "Unknown"/"N/A"/"Generic" the model prefixed onto a product name. */
export function sanitizeProductName(value: unknown): string {
  if (typeof value !== "string") return "";
  let name = value.trim().replace(/\s+/g, " ");
  for (let i = 0; i < 3; i++) {
    const next = name.replace(LEADING_PLACEHOLDER, "").replace(LEADING_GENERIC, "").trim();
    if (next === name) break;
    name = next;
  }
  if (!name || isPlaceholderLabel(name)) return "";
  return name;
}

/** "at Nordstrom", or "" when the retailer is unknown. */
export function formatAtRetailer(retailer: unknown): string {
  const label = sanitizeLabel(retailer);
  return label ? `at ${label}` : "";
}

/**
 * Remove "at Unknown" / "Unknown brand" from prose. Product titles still go
 * through `sanitizeProductName`; this only cleans sentences.
 */
export function stripPlaceholderMentions(text: string): string {
  if (!text) return "";
  const cleaned = text
    .replace(
      /\b(?:at|from|by|via)\s+(?:an?\s+)?(?:unknown|n\/a|n\.a\.|null|undefined|generic|unbranded)\b/gi,
      ""
    )
    .replace(/\b(?:unknown|generic|unbranded|n\/a)\s+(?:brand|retailer|store|label)\b/gi, "")
    .replace(/\b(?:Unknown|unknown|UNKNOWN|N\/A|n\/a)\s+(?=[A-Z])/g, "");

  const normalized = cleaned
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
  return isPlaceholderLabel(normalized) ? "" : normalized;
}
