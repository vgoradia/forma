import { notifyStorageChange } from "@/lib/storage-events";

const STORAGE_KEY = "forma_scan_quota_v1";

/** Free scans per calendar month (guests + free plan). */
export const FREE_SCANS_PER_MONTH = 8;

type QuotaRecord = {
  month: string;
  count: number;
};

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function readRecord(): QuotaRecord {
  if (typeof window === "undefined") {
    return { month: currentMonthKey(), count: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { month: currentMonthKey(), count: 0 };
    const parsed = JSON.parse(raw) as QuotaRecord;
    if (!parsed.month || typeof parsed.count !== "number") {
      return { month: currentMonthKey(), count: 0 };
    }
    if (parsed.month !== currentMonthKey()) {
      return { month: currentMonthKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { month: currentMonthKey(), count: 0 };
  }
}

function writeRecord(record: QuotaRecord) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  notifyStorageChange();
}

export function getScanQuota() {
  const { month, count } = readRecord();
  const remaining = Math.max(0, FREE_SCANS_PER_MONTH - count);
  return {
    month,
    used: count,
    limit: FREE_SCANS_PER_MONTH,
    remaining,
  };
}

export function canStartScan(isPlus: boolean): boolean {
  if (isPlus) return true;
  return getScanQuota().remaining > 0;
}

/** Call after a successful /api/analyze (not for demo). */
export function recordScanUsage(isPlus: boolean): void {
  if (isPlus) return;
  const month = currentMonthKey();
  const record = readRecord();
  const count = record.month === month ? record.count + 1 : 1;
  writeRecord({ month, count });
}