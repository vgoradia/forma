import { useSyncExternalStore } from "react";
import type { ProductAnalysis } from "./types";
import { notifyStorageChange, subscribeStorage } from "./storage-events";
import { isValidStoredScan, sanitizeProductAnalysis } from "./scan-validation";

const ONBOARDING_KEY = "forma_onboarding_complete";
const SCANS_KEY = "forma_scans";
const PREFS_KEY = "forma_prefs";
const BOOKMARKS_KEY = "forma_bookmarks";
const MAX_PREVIEW_CHARS = 120_000;

export interface StoredScan {
  id: string;
  analysis: ProductAnalysis;
  source: "upload" | "link" | "search" | "pinterest" | "tiktok" | "instagram";
  label: string;
  savedAt: string;
  imagePreview?: string;
}

export interface UserPrefs {
  priceDropAlerts: boolean;
  salePredictions: boolean;
  alternativeAlerts: boolean;
  reviewSummaries: boolean;
  weeklyDigest: boolean;
  priceDropPush: boolean;
  savedItemReminders: boolean;
  emailUpdates: boolean;
}

const defaultPrefs: UserPrefs = {
  priceDropAlerts: true,
  salePredictions: true,
  alternativeAlerts: true,
  reviewSummaries: true,
  weeklyDigest: true,
  priceDropPush: true,
  savedItemReminders: false,
  emailUpdates: false,
};

let cachedScansRaw: string | null | undefined;
let cachedScansList: StoredScan[] = [];
let cachedLastScan: StoredScan | null = null;
let cachedBookmarksRaw: string | null | undefined;
let cachedBookmarks: string[] = [];

function invalidateStorageCache() {
  cachedScansRaw = undefined;
  cachedBookmarksRaw = undefined;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    invalidateStorageCache();
    notifyStorageChange();
  } catch (error) {
    console.warn("Forma storage write failed:", error);
  }
}

function trimScanForStorage(scan: StoredScan): StoredScan {
  if (scan.imagePreview && scan.imagePreview.length > MAX_PREVIEW_CHARS) {
    return { ...scan, imagePreview: undefined };
  }
  return scan;
}

function syncScansCache(raw: string | null) {
  cachedScansRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    cachedScansList = parsed
      .filter(isValidStoredScan)
      .map((scan) => ({
        ...scan,
        analysis: sanitizeProductAnalysis(scan.analysis),
      })) as StoredScan[];
    cachedLastScan = cachedScansList[0] ?? null;
  } catch {
    cachedScansList = [];
    cachedLastScan = null;
  }
}

function getScansSnapshot(): StoredScan[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(SCANS_KEY);
  if (raw === cachedScansRaw) {
    return cachedScansList;
  }

  syncScansCache(raw);
  return cachedScansList;
}

function getLastScanSnapshot(): StoredScan | null {
  getScansSnapshot();
  return cachedLastScan;
}

function getBookmarksSnapshot(): string[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(BOOKMARKS_KEY);
  if (raw === cachedBookmarksRaw) {
    return cachedBookmarks;
  }

  cachedBookmarksRaw = raw;
  try {
    cachedBookmarks = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cachedBookmarks = [];
  }

  return cachedBookmarks;
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function completeOnboarding() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function getScans(): StoredScan[] {
  return getScansSnapshot();
}

export function saveScan(scan: StoredScan) {
  const trimmed = trimScanForStorage(scan);
  const scans = getScans().filter((s) => s.id !== trimmed.id);
  writeJson(SCANS_KEY, [trimmed, ...scans].slice(0, 15));
}

export function getScan(id: string): StoredScan | undefined {
  return getScans().find((s) => s.id === id);
}

export function getLastScan(): StoredScan | undefined {
  return getScans()[0];
}

export function clearAllScans() {
  writeJson(SCANS_KEY, []);
  writeJson(BOOKMARKS_KEY, []);
}

export function getBookmarkIds(): string[] {
  return getBookmarksSnapshot();
}

export function isBookmarked(id: string): boolean {
  return getBookmarkIds().includes(id);
}

export function toggleBookmark(id: string): boolean {
  const ids = getBookmarkIds();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  writeJson(BOOKMARKS_KEY, next);
  return !ids.includes(id);
}

export function getPrefs(): UserPrefs {
  return { ...defaultPrefs, ...readJson(PREFS_KEY, defaultPrefs) };
}

export { defaultPrefs };

export function savePrefs(prefs: UserPrefs) {
  writeJson(PREFS_KEY, prefs);
}

export function useScans(): StoredScan[] {
  return useSyncExternalStore(subscribeStorage, getScansSnapshot, () => []);
}

export function useLastScan(): StoredScan | null {
  return useSyncExternalStore(subscribeStorage, getLastScanSnapshot, () => null);
}

export function useBookmarkIds(): string[] {
  return useSyncExternalStore(subscribeStorage, getBookmarksSnapshot, () => []);
}
