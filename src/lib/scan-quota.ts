import { notifyStorageChange } from "@/lib/storage-events";

const STORAGE_KEY = "forma_scan_quota_v1";

/** Signed-in free scans per calendar month. */
export const FREE_SCANS_PER_MONTH = 8;

/** Scans a signed-out visitor can run per calendar month. */
export const GUEST_SCANS_PER_MONTH = 3;

/** Monthly ceiling for Forma Plus, enforced with the same reservation function. */
export const PLUS_FAIR_USE_PER_MONTH = 300;

export const SCANS_UNAVAILABLE_MESSAGE =
  "Scans are temporarily unavailable. Try again in a minute.";

export const GUEST_LIMIT_MESSAGE =
  "You've used your guest scans this month. Sign in with Google for more free scans.";

export const FREE_LIMIT_MESSAGE =
  "You've used all free scans this month. Upgrade to Forma Plus on Profile for unlimited verdicts.";

export const FAIR_USE_LIMIT_MESSAGE =
  "You've reached this month's fair-use limit for Forma Plus. It resets next month.";

export type ServerUsageSnapshot = {
  remaining: number;
  used: number;
  limit: number;
  enforced?: boolean;
};

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

/** Local fallback display. Pass the guest or free cap; the server limit wins when enforced. */
export function getScanQuota(limit = FREE_SCANS_PER_MONTH) {
  const { month, count } = readRecord();
  const remaining = Math.max(0, limit - count);
  return {
    month,
    used: count,
    limit,
    remaining,
  };
}

export function displayScanQuota(
  server: ServerUsageSnapshot | null | undefined,
  fallbackLimit = FREE_SCANS_PER_MONTH
) {
  if (
    server?.enforced &&
    typeof server.limit === "number" &&
    typeof server.used === "number"
  ) {
    const remaining =
      typeof server.remaining === "number"
        ? server.remaining
        : Math.max(0, server.limit - server.used);
    return {
      used: server.used,
      limit: server.limit,
      remaining,
      enforced: true as const,
    };
  }

  const local = getScanQuota(fallbackLimit);
  return {
    used: local.used,
    limit: local.limit,
    remaining: local.remaining,
    enforced: false as const,
  };
}

export function canStartScan(
  isPlus: boolean,
  server?: ServerUsageSnapshot | null,
  fallbackLimit = FREE_SCANS_PER_MONTH
): boolean {
  if (isPlus) return true;
  return displayScanQuota(server, fallbackLimit).remaining > 0;
}

/** Ask open quota views to refetch /api/scan-usage. */
export function requestScanQuotaRefresh() {
  notifyStorageChange();
}

/** Local fallback only. The server reservation is what actually counts. */
export function recordScanUsage(isPlus: boolean): void {
  if (isPlus) return;
  const month = currentMonthKey();
  const record = readRecord();
  const count = record.month === month ? record.count + 1 : 1;
  writeRecord({ month, count });
}
