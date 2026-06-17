import { NextResponse } from "next/server";
import { fetchGMPUpdates, slugify } from "@/lib/scrapers/ipoGuru";
import { scrapeBackupGMP } from "@/lib/scrapers/investorgain";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { GMPHistoryInsert } from "@/types/ipo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface IPOReference {
  id: string;
  slug: string;
  name: string;
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  return Boolean(cronSecret && authorization === cronSecret);
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

  try {
    const [ipoGuruUpdates, backupUpdates, ipoResponse] = await Promise.all([
      fetchGMPUpdates(),
      scrapeBackupGMP(),
      supabaseAdmin.from("ipos").select("id, slug, name"),
    ]);

    if (ipoResponse.error) {
      return NextResponse.json({ error: ipoResponse.error.message }, { status: 500 });
    }

    const ipos = (ipoResponse.data ?? []) as IPOReference[];
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

      const lastGMP = await getLastGMP(ipo.id);

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync GMP data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return syncGMP(request);
}

export async function POST(request: Request) {
  return syncGMP(request);
}
