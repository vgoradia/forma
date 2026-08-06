import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function coercePrice(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value === "string") {
    let cleaned = value.trim();
    if (!cleaned || cleaned.toLowerCase() === "nan") return undefined;

    // Use first price in ranges like "$19.90 - $24.90"
    const rangeMatch = cleaned.match(/\$?\d[\d,]*(?:\.\d{1,2})?/);
    if (rangeMatch) cleaned = rangeMatch[0];

    // European format: 19,90 or $19,90
    if (/^\$?\d{1,4},\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(",", ".");
    }

    const num = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }
  return undefined;
}

export function formatPrice(amount: unknown): string {
  const price = coercePrice(amount);
  if (price === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}
