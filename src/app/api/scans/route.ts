import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isValidStoredScan, sanitizeProductAnalysis } from "@/lib/scan-validation";
import type { StoredScan } from "@/lib/storage";

const MAX_CLOUD_SCANS = 50;

function parseStoredScan(payload: unknown): StoredScan | null {
  if (!isValidStoredScan(payload)) return null;
  return {
    id: payload.id,
    savedAt: payload.savedAt,
    label: payload.label,
    source: payload.source as StoredScan["source"],
    imagePreview: payload.imagePreview,
    analysis: sanitizeProductAnalysis(payload.analysis),
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ scans: [], configured: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_scans")
    .select("scan_id, payload, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(MAX_CLOUD_SCANS);

  if (error) {
    console.error("user_scans list failed:", error.message);
    return NextResponse.json({ error: "Could not load cloud scans" }, { status: 500 });
  }

  const scans =
    data
      ?.map((row) => parseStoredScan(row.payload))
      .filter((scan): scan is StoredScan => scan !== null) ?? [];

  return NextResponse.json({ scans, configured: true });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = (await request.json()) as { scan?: unknown; scans?: unknown[] };

  const incoming: unknown[] = [];
  if (body.scan) incoming.push(body.scan);
  if (Array.isArray(body.scans)) incoming.push(...body.scans);

  const rows = incoming
    .map(parseStoredScan)
    .filter((scan): scan is StoredScan => scan !== null)
    .map((scan) => ({
      scan_id: scan.id,
      user_id: user.id,
      payload: scan,
      saved_at: scan.savedAt,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid scans" }, { status: 400 });
  }

  const { error } = await supabase.from("user_scans").upsert(rows, {
    onConflict: "user_id,scan_id",
  });

  if (error) {
    console.error("user_scans upsert failed:", error.message);
    return NextResponse.json({ error: "Could not save scans" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}