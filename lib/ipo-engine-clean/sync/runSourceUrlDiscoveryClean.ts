/**
 * runSourceUrlDiscoveryClean.ts
 *
 * Discovers missing source URLs for active/upcoming/recent IPOs.
 *
 * Rules:
 *   - Never creates IPO master rows.
 *   - Never saves facts directly.
 *   - Respects kill switch.
 *   - Only runs for canonical (non-duplicate) IPOs.
 *   - Runs provider discovery sequentially to avoid rate limits.
 *
 * Providers handled:
 *   - FINOLOGY_TICKER: slug_guess_verified
 *   - IPOPLATFORM: provider_search + sibling_url
 *   - CHITTORGARH: populated from list sync (list_row), not run here
 *   - IPOWATCH / INVESTORGAIN: list-level sources, no per-IPO detail URL
 */

import { isAutoSyncDisabled, skippedByKillSwitch } from "@/lib/ipo-engine-clean/killSwitch";
import { supabaseAdmin } from "@/lib/supabase";
import { discoverFinologyUrls } from "@/lib/ipo-engine-clean/source-discovery/discoverFinologyUrls";
import { discoverIPOPlatformUrls } from "@/lib/ipo-engine-clean/source-discovery/discoverIPOPlatformUrls";

type DiscoveryResult = {
  discovered: number;
  verified: number;
  failed: number;
  blocked: number;
  needs_review: number;
  ipoResults: Array<{
    ipoId: string;
    ipoName: string;
    providers: Record<string, "verified" | "failed" | "blocked" | "needs_review" | "skipped">;
  }>;
  status: "success" | "partial" | "disabled" | "failed";
};

export async function runSourceUrlDiscoveryClean(): Promise<DiscoveryResult> {
  if (isAutoSyncDisabled()) {
    return {
      ...skippedByKillSwitch(),
      discovered: 0,
      verified: 0,
      failed: 0,
      blocked: 0,
      needs_review: 0,
      ipoResults: [],
      status: "disabled" as const,
    };
  }

  // Load active/upcoming/recent non-duplicate IPOs
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30); // Include IPOs listed in last 30 days

  const { data: ipos, error } = await supabaseAdmin
    .from("ipos")
    .select("id, name, slug, category, open_date, listing_date")
    .or("is_duplicate.is.null,is_duplicate.eq.false")
    .or(
      [
        "status.eq.upcoming",
        "status.eq.open",
        "status.eq.listed",
        `listing_date.gte.${cutoff.toISOString().slice(0, 10)}`,
        `open_date.gte.${cutoff.toISOString().slice(0, 10)}`,
      ].join(",")
    )
    .order("open_date", { ascending: false })
    .limit(50);

  if (error || !ipos) {
    return {
      discovered: 0,
      verified: 0,
      failed: 0,
      blocked: 0,
      needs_review: 0,
      ipoResults: [],
      status: "failed",
    };
  }

  // For each IPO, check which provider URLs are already discovered
  const alreadyHave = await loadExistingSourceUrls(ipos.map((i) => i.id));

  let discovered = 0;
  let verified = 0;
  let failed = 0;
  let blocked = 0;
  let needs_review = 0;
  const ipoResults: DiscoveryResult["ipoResults"] = [];

  for (const ipo of ipos) {
    const providerResults: Record<string, "verified" | "failed" | "blocked" | "needs_review" | "skipped"> = {};

    // --- FINOLOGY_TICKER ---
    if (!alreadyHave.has(`${ipo.id}:FINOLOGY_TICKER:detail`)) {
      await delay(600); // polite delay
      try {
        const result = await discoverFinologyUrls(ipo);
        discovered++;
        if (result) {
          verified++;
          providerResults["FINOLOGY_TICKER"] = "verified";
        } else {
          failed++;
          providerResults["FINOLOGY_TICKER"] = "failed";
        }
      } catch {
        failed++;
        providerResults["FINOLOGY_TICKER"] = "failed";
      }
    } else {
      providerResults["FINOLOGY_TICKER"] = "skipped";
    }

    // --- IPOPLATFORM ---
    if (!alreadyHave.has(`${ipo.id}:IPOPLATFORM:detail`)) {
      await delay(800);
      try {
        const result = await discoverIPOPlatformUrls(ipo);
        discovered++;
        if (result.base) {
          verified++;
          providerResults["IPOPLATFORM"] = "verified";
          // Sibling URLs are saved automatically inside discoverIPOPlatformUrls
        } else {
          failed++;
          providerResults["IPOPLATFORM"] = "failed";
        }
      } catch {
        failed++;
        providerResults["IPOPLATFORM"] = "failed";
      }
    } else {
      providerResults["IPOPLATFORM"] = "skipped";
    }

    ipoResults.push({
      ipoId: ipo.id,
      ipoName: ipo.name,
      providers: providerResults,
    });
  }

  return {
    discovered,
    verified,
    failed,
    blocked,
    needs_review,
    ipoResults,
    status: failed > 0 ? "partial" : "success",
  };
}

async function loadExistingSourceUrls(ipoIds: string[]): Promise<Set<string>> {
  if (ipoIds.length === 0) return new Set();
  const { data } = await supabaseAdmin
    .from("ipo_source_urls_clean")
    .select("ipo_id, provider, source_type, status")
    .in("ipo_id", ipoIds)
    .in("status", ["verified", "candidate"]);

  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.status === "verified") {
      set.add(`${row.ipo_id}:${row.provider}:${row.source_type}`);
    }
  }
  return set;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
