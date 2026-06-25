import { NextResponse } from "next/server";
import { fetchSubscriptionData } from "@/lib/scrapers/bseScraper";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { SubscriptionDataInsert } from "@/types/ipo";
import { fetchAllChittorgarhSubscriptions } from "@/lib/scrapers/chittorgarh";
import { scrapeIPOPlatform } from "@/lib/scrapers/ipoPlatform";
import { fetchAllIPOs } from "@/lib/scrapers/ipoGuru";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface IPOReference {
  id: string;
  slug: string;
  name: string;
  status?: string;
  enriched_data?: any;
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || !authorization) return false;
  return authorization === cronSecret || authorization === `Bearer ${cronSecret}`;
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

function getLinkInfoFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/\/ipo\/([a-zA-Z0-9\-]+)\/(\d+)/);
  if (match) {
    return {
      slug: match[1],
      id: match[2],
      url
    };
  }
  return null;
}

async function syncSubscription(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 503 });
  }

  const startTime = Date.now();
  const timeoutSecs = process.env.SYNC_TIMEOUT_SECONDS ? parseInt(process.env.SYNC_TIMEOUT_SECONDS, 10) : 50;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout: Sync execution exceeded time limit.")), timeoutSecs * 1000)
  );

  const performSync = async () => {
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

    // Select enriched_data so we can read and use cached ipoplatform_url
    const { data: ipos, error: ipoError } = await supabaseAdmin
      .from("ipos")
      .select("id, slug, name, status, enriched_data");

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

    // --- Step 1: Process IPOPlatform scraper (Primary/Strict for active IPOs) ---
    for (const ipo of ipoRows) {
      // Time-budget check: Exit early if we have exceeded budget
      const elapsedMs = Date.now() - startTime;
      const budgetMs = Math.max(5, timeoutSecs - 5) * 1000;
      if (elapsedMs > budgetMs) {
        console.log(`[Sync-Sub] Approaching time limit (${elapsedMs}ms). Terminating subscription scrape loop early.`);
        break;
      }

      const isActive = !ipo.status || ipo.status === "open" || ipo.status === "upcoming" || ipo.status === "closed";
      if (isActive) {
        try {
          const enriched = ipo.enriched_data || {};
          const ipoPlatformUrl = enriched.ipoplatform_url;
          const linkInfo = getLinkInfoFromUrl(ipoPlatformUrl);

          console.log(`[Sync-Sub] Fetching subscription strictly from IPOPlatform for: ${ipo.name} (Cached Link: ${linkInfo ? "Yes" : "No"})`);
          const platformData = await scrapeIPOPlatform(ipo.name, linkInfo, { onlySubscription: true });
          
          // Cache the found URL back to enriched_data if it wasn't already there
          if (platformData && platformData.url && !ipoPlatformUrl) {
            const updatedEnriched = {
              ...enriched,
              ipoplatform_url: platformData.url
            };
            await supabaseAdmin
              .from("ipos")
              .update({ enriched_data: updatedEnriched })
              .eq("id", ipo.id);
            console.log(`[Sync-Sub] Cached IPOPlatform URL for ${ipo.name}`);
          }

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

    // --- Step 2: Process IPO Guru subscriptions (Secondary Fallback) ---
    for (const guruIpo of guruIPOs) {
      const match = findMatchingIPO(guruIpo.name, ipoRows);
      if (match && !processedIpoIds.has(match.id) && hasValidSubData(guruIpo.subscription)) {
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

    // --- Step 3: Process BSE subscriptions (Tertiary Fallback) ---
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

    // --- Step 4: Process Chittorgarh subscriptions (Quaternary Fallback) ---
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
  };

  try {
    return await Promise.race([performSync(), timeoutPromise]);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Unable to sync subscription data.";
    console.error("[Sync-Subscription] Sync job failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return syncSubscription(request);
}

export async function POST(request: Request) {
  return syncSubscription(request);
}
