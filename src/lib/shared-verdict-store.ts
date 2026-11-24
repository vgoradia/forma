import { cache } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createShareId,
  isShareId,
  toSharedVerdict,
  type SharedVerdict,
} from "@/lib/shared-verdict";

const MEMORY_LIMIT = 50;

function devMemoryStore(): Map<string, SharedVerdict> | null {
  if (process.env.NODE_ENV === "production") return null;
  if (isSupabaseConfigured()) return null;

  const globalStore = globalThis as typeof globalThis & {
    __formaSharedVerdicts?: Map<string, SharedVerdict>;
  };
  if (!globalStore.__formaSharedVerdicts) {
    globalStore.__formaSharedVerdicts = new Map();
  }
  return globalStore.__formaSharedVerdicts;
}

function rememberDevShare(id: string, verdict: SharedVerdict) {
  const memory = devMemoryStore();
  if (!memory) return;
  memory.set(id, verdict);
  while (memory.size > MEMORY_LIMIT) {
    const oldest = memory.keys().next().value;
    if (!oldest) break;
    memory.delete(oldest);
  }
}

/**
 * Insert a sanitized verdict. Callers must pass the output of `toSharedVerdict`
 * so account fields never reach the table.
 */
export async function insertSharedVerdict(verdict: SharedVerdict): Promise<string | null> {
  const clean = toSharedVerdict(verdict);
  if (!clean) return null;

  const memory = devMemoryStore();
  if (memory) {
    const id = createShareId();
    rememberDevShare(id, clean);
    return id;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = createShareId();
    const { error } = await admin.from("shared_verdicts").insert({ id, payload: clean });
    if (!error) return id;
    if (error.code !== "23505") {
      console.error("shared_verdicts insert failed:", error.message);
      return null;
    }
  }

  return null;
}

async function loadSharedVerdict(id: string): Promise<SharedVerdict | null> {
  if (!isShareId(id)) return null;

  const memory = devMemoryStore();
  if (memory) {
    return memory.get(id) ?? null;
  }

  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.rpc("get_shared_verdict", { share_id: id });
  if (error) {
    console.error("get_shared_verdict failed:", error.message);
    return null;
  }

  return toSharedVerdict(parseRpcPayload(data));
}

function parseRpcPayload(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  return data;
}

/** Deduped per request so metadata and the page share one read. */
export const readSharedVerdict = cache(loadSharedVerdict);
