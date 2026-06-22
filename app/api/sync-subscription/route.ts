import { NextResponse } from "next/server";
import { fetchSubscriptionData } from "@/lib/scrapers/bseScraper";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { SubscriptionDataInsert } from "@/types/ipo";
import { fetchAllChittorgarhSubscriptions } from "@/lib/scrapers/chittorgarh";
import { scrapeIPOPlatform } from "@/lib/scrapers/ipoPlatform";
import { fetchAllIPOs } from "@/lib/scrapers/ipoGuru";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface IPOReference {
  id: string;
  slug: string;
  name: string;
  status?: string;
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  return Boolean(cronSecret && authorization === cronSecret);
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(ipo|limited|ltd)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingIPO(scrapedName: string, ipos: IPOReference[]) {
  const scraped = normalizeForMatch(scrapedName);

  if (!scraped) {
    return null;
  }

  return (
    ipos.find((ipo) => {
      const name = normalizeForMatch(ipo.name);
      const slug = ipo.slug.toLowerCase().replace(/-/g, " ");

      return scraped.includes(name) || name.includes(scraped) || scraped.includes(slug) || slug.includes(scraped);
    }) ?? null
  );
}

async function syncSubscription(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 503 });
  }

  const useChittorgarhFallback = process.env.USE_CHITTORGARH_FALLBACK === "true";

  // 1. Fetch from IPO Guru (Primary)
  let guruIPOs: any[] = [];
  try {
    guruIPOs = await fetchAllIPOs();
  } catch (err) {
    console.error("Error fetching primary subscriptions from IPO Guru:", err);
  }

  // 2. Fetch from BSE Scraper (Secondary fallback)
  let bseSubs: any[] = [];
  try {
    bseSubs = await fetchSubscriptionData();
  } catch (err) {
    console.error("Error fetching BSE subscriptions:", err);
  }

  // 3. Fetch from Chittorgarh (Quaternary fallback)
  const chittorgarhSubs = useChittorgarhFallback ? await fetchAllChittorgarhSubscriptions() : [];

  if (guruIPOs.length === 0 && bseSubs.length === 0 && chittorgarhSubs.length === 0 && !useChittorgarhFallback) {
    // Continue below to allow IPOPlatform fallback to run
  } else if (guruIPOs.length === 0 && bseSubs.length === 0 && chittorgarhSubs.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const { data: ipos, error: ipoError } = await supabaseAdmin.from("ipos").select("id, slug, name, status");

  if (ipoError) {
    return NextResponse.json({ error: ipoError.message }, { status: 500 });
  }

  const ipoRows = (ipos ?? []) as IPOReference[];
  const rows: SubscriptionDataInsert[] = [];
  const processedIpoIds = new Set<string>();

  // Helper to check if a subscription record has valid data
  const hasValidSubData = (sub: any) => {
    return sub && (
      (sub.qib !== null && sub.qib > 0) ||
      (sub.nii !== null && sub.nii > 0) ||
      (sub.retail !== null && sub.retail > 0) ||
      (sub.total !== null && sub.total > 0)
    );
  };

  // --- Step 1: Process IPO Guru subscriptions (Primary) ---
  for (const guruIpo of guruIPOs) {
    if (hasValidSubData(guruIpo.subscription)) {
      const match = findMatchingIPO(guruIpo.name, ipoRows);
      if (match) {
        rows.push({
          ipo_id: match.id,
          qib_x: guruIpo.subscription.qib ?? 0,
          nii_x: guruIpo.subscription.nii ?? 0,
          retail_x: guruIpo.subscription.retail ?? 0,
          total_x: guruIpo.subscription.total ?? 0,
        });
        processedIpoIds.add(match.id);
      }
    }
  }

  // --- Step 2: Process BSE subscriptions (Secondary) ---
  for (const subscription of bseSubs) {
    const match = findMatchingIPO(subscription.name, ipoRows);

    if (match && !processedIpoIds.has(match.id)) {
      rows.push({
        ipo_id: match.id,
        qib_x: subscription.qib,
        nii_x: subscription.nii,
        retail_x: subscription.retail,
        total_x: subscription.total,
      });
      processedIpoIds.add(match.id);
    }
  }

  // --- Step 3: Process IPOPlatform scraper (Tertiary) ---
  for (const ipo of ipoRows) {
    if (processedIpoIds.has(ipo.id)) {
      continue;
    }

    // Sync subscriptions only for active/open/upcoming/closed IPOs
    const isActive = !ipo.status || ipo.status === "open" || ipo.status === "upcoming" || ipo.status === "closed";
    if (isActive) {
      try {
        console.log(`[Sync-Sub] Fetching subscription fallback from IPOPlatform for: ${ipo.name}`);
        const platformData = await scrapeIPOPlatform(ipo.name, null, { onlySubscription: true });
        if (platformData && platformData.subscription) {
          rows.push({
            ipo_id: ipo.id,
            qib_x: platformData.subscription.qib_x ?? 0,
            nii_x: platformData.subscription.nii_x ?? 0,
            retail_x: platformData.subscription.retail_x ?? 0,
            total_x: platformData.subscription.total_x ?? 0,
          });
          processedIpoIds.add(ipo.id);
        }
      } catch (err) {
        console.error(`[Sync-Sub] IPOPlatform subscription scrape failed for ${ipo.name}:`, err);
      }
    }
  }

  // --- Step 4: Process Chittorgarh subscriptions (Quaternary) ---
  if (useChittorgarhFallback) {
    for (const subscription of chittorgarhSubs) {
      const match = findMatchingIPO(subscription.name, ipoRows);

      if (match && !processedIpoIds.has(match.id)) {
        rows.push({
          ipo_id: match.id,
          qib_x: 0,
          nii_x: 0,
          retail_x: 0,
          total_x: subscription.total,
        });
        processedIpoIds.add(match.id);
      }
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const { error } = await supabaseAdmin.from("subscription_data").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: rows.length });
}

export async function GET(request: Request) {
  return syncSubscription(request);
}

export async function POST(request: Request) {
  return syncSubscription(request);
}
