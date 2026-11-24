import type { StoredScan } from "@/lib/storage";
import { getScans } from "@/lib/storage";
import { isValidStoredScan, sanitizeProductAnalysis } from "@/lib/scan-validation";
import { notifyStorageChange } from "@/lib/storage-events";

function mergeScans(local: StoredScan[], remote: StoredScan[]): StoredScan[] {
  const byId = new Map<string, StoredScan>();

  for (const scan of [...remote, ...local]) {
    const existing = byId.get(scan.id);
    if (!existing || new Date(scan.savedAt) > new Date(existing.savedAt)) {
      byId.set(scan.id, scan);
    }
  }

  return [...byId.values()]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 15);
}

export async function pullCloudScansIntoLocal(): Promise<boolean> {
  try {
    const res = await fetch("/api/scans", { credentials: "include" });
    if (!res.ok) return false;

    const data = (await res.json()) as { scans?: unknown[] };
    const remote = (data.scans ?? [])
      .filter(isValidStoredScan)
      .map((scan) => ({
        ...scan,
        analysis: sanitizeProductAnalysis(scan.analysis),
      })) as StoredScan[];

    if (remote.length === 0) return true;

    const merged = mergeScans(getScans(), remote);
    if (typeof window !== "undefined") {
      localStorage.setItem("forma_scans", JSON.stringify(merged));
      notifyStorageChange();
    }
    return true;
  } catch {
    return false;
  }
}

export async function pushScanToCloud(scan: StoredScan): Promise<void> {
  try {
    await fetch("/api/scans", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scan }),
    });
  } catch {
    // Non-blocking; local save is source of truth offline.
  }
}

export async function pushAllLocalScansToCloud(): Promise<void> {
  const scans = getScans();
  if (scans.length === 0) return;

  try {
    await fetch("/api/scans", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scans }),
    });
  } catch {
    // ignore
  }
}