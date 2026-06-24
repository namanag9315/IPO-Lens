import { NextResponse } from "next/server";
import { fetchGMPUpdates, slugify } from "@/lib/scrapers/ipoGuru";
import { scrapeBackupGMP } from "@/lib/scrapers/investorgain";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { GMPHistoryInsert } from "@/types/ipo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface IPOReference {
  id: string;
  slug: string;
  name: string;
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || !authorization) return false;
  return authorization === cronSecret || authorization === `Bearer ${cronSecret}`;
}

async function getLastGMP(ipoId: string) {
  const { data, error } = await supabaseAdmin
    .from("gmp_history")
    .select("gmp_value")
    .eq("ipo_id", ipoId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as { gmp_value: number } | null)?.gmp_value ?? null;
}

function mergedGMPValue(primary: number | null, backup: number | null) {
  if (primary !== null && backup !== null) {
    return Math.round((primary + backup) / 2);
  }

  return primary ?? backup;
}

async function syncGMP(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 503 });
  }

  const timeoutSecs = process.env.SYNC_TIMEOUT_SECONDS ? parseInt(process.env.SYNC_TIMEOUT_SECONDS, 10) : 50;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout: Sync execution exceeded time limit.")), timeoutSecs * 1000)
  );

  const performSync = async () => {
    const [ipoGuruUpdates, backupUpdates, ipoResponse] = await Promise.all([
      fetchGMPUpdates(),
      scrapeBackupGMP(),
      // Only check GMP for active IPOs to save time and DB load
      supabaseAdmin.from("ipos").select("id, slug, name").in("status", ["upcoming", "open", "closed"]),
    ]);

    if (ipoResponse.error) {
      return NextResponse.json({ error: ipoResponse.error.message }, { status: 500 });
    }

    const ipos = (ipoResponse.data ?? []) as IPOReference[];
    const ipoIds = ipos.map(i => i.id);

    // Fetch latest GMP values for these active IPOs in a single query to avoid N+1 queries
    const latestGmpMap = new Map<string, number>();
    if (ipoIds.length > 0) {
      const { data: latestGMPs, error: gmpErr } = await supabaseAdmin
        .from("gmp_history")
        .select("ipo_id, gmp_value, captured_at")
        .in("ipo_id", ipoIds)
        .order("captured_at", { ascending: false });

      if (gmpErr) {
        console.error("[Sync-GMP] Error fetching latest GMP values:", gmpErr);
      } else if (latestGMPs) {
        // Build map of ipo_id -> latest gmp_value
        for (const row of latestGMPs) {
          if (!latestGmpMap.has(row.ipo_id)) {
            latestGmpMap.set(row.ipo_id, row.gmp_value);
          }
        }
      }
    }

    const primaryBySlug = new Map(ipoGuruUpdates.map((update) => [update.slug, update.gmp]));
    const backupBySlug = new Map(backupUpdates.map((update) => [slugify(update.name), update.gmp]));
    const rows: GMPHistoryInsert[] = [];

    for (const ipo of ipos) {
      const primary = primaryBySlug.get(ipo.slug) ?? primaryBySlug.get(slugify(ipo.name)) ?? null;
      const backup = backupBySlug.get(ipo.slug) ?? backupBySlug.get(slugify(ipo.name)) ?? null;
      const gmp = mergedGMPValue(primary, backup);

      if (gmp === null) {
        continue;
      }

      const lastGMP = latestGmpMap.get(ipo.id) ?? null;

      if (lastGMP === gmp) {
        continue;
      }

      rows.push({
        ipo_id: ipo.id,
        gmp_value: gmp,
        source: primary !== null && backup !== null ? "ipoguru+investorgain" : primary !== null ? "ipoguru" : "investorgain",
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    const { error } = await supabaseAdmin.from("gmp_history").insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updated: rows.length });
  };

  try {
    return await Promise.race([performSync(), timeoutPromise]);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Unable to sync GMP data.";
    console.error("[Sync-GMP] Sync job failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return syncGMP(request);
}

export async function POST(request: Request) {
  return syncGMP(request);
}
