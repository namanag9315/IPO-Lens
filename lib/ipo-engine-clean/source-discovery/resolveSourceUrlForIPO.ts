/**
 * resolveSourceUrlForIPO.ts
 *
 * Resolves the best available source URL for a given IPO + provider + source_type.
 *
 * Priority:
 *   1. Verified admin_override URL (highest trust)
 *   2. Verified auto-discovered URL from ipo_source_urls_clean
 *   3. High-confidence candidate URL (match_confidence >= 80)
 *   4. Run provider-specific discovery (if allowed)
 *   5. null  — no source available
 *
 * Rules:
 *   - Never creates IPO master rows.
 *   - Never saves facts directly.
 *   - Discovery is optional (set allowDiscovery = false to skip).
 */

import { supabaseAdmin } from "@/lib/supabase";
import type { CleanProvider } from "@/lib/ipo-engine-clean/types";

export type SourceUrlResolution = {
  url: string | null;
  source:
    | "admin_override"
    | "verified_discovered"
    | "high_confidence_candidate"
    | "freshly_discovered"
    | "no_source_url_available";
  confidence: number;
  discoveryMethod: string | null;
};

export async function resolveSourceUrlForIPO({
  ipoId,
  provider,
  sourceType,
  allowDiscovery = true,
}: {
  ipoId: string;
  provider: CleanProvider;
  sourceType: string;
  allowDiscovery?: boolean;
}): Promise<SourceUrlResolution> {
  // 1. Query DB for existing URLs (ordered by priority)
  const { data: rows } = await supabaseAdmin
    .from("ipo_source_urls_clean")
    .select("id, source_url, discovery_method, match_confidence, status")
    .eq("ipo_id", ipoId)
    .eq("provider", provider)
    .eq("source_type", sourceType)
    .not("status", "in", "(rejected,blocked)")
    .order("match_confidence", { ascending: false })
    .limit(10);

  if (rows && rows.length > 0) {
    // Priority 1: admin_override verified
    const adminVerified = rows.find(
      (r) => r.discovery_method === "admin_override" && r.status === "verified"
    );
    if (adminVerified?.source_url) {
      return {
        url: adminVerified.source_url,
        source: "admin_override",
        confidence: 100,
        discoveryMethod: "admin_override",
      };
    }

    // Priority 2: Any verified URL
    const verified = rows.find((r) => r.status === "verified");
    if (verified?.source_url) {
      return {
        url: verified.source_url,
        source: "verified_discovered",
        confidence: verified.match_confidence ?? 80,
        discoveryMethod: verified.discovery_method ?? null,
      };
    }

    // Priority 3: High-confidence candidate
    const highConf = rows.find(
      (r) => r.status === "candidate" && (r.match_confidence ?? 0) >= 80
    );
    if (highConf?.source_url) {
      return {
        url: highConf.source_url,
        source: "high_confidence_candidate",
        confidence: highConf.match_confidence ?? 80,
        discoveryMethod: highConf.discovery_method ?? null,
      };
    }
  }

  // Priority 4: Run discovery on demand
  if (allowDiscovery) {
    const discovered = await runProviderDiscovery({ ipoId, provider, sourceType });
    if (discovered) {
      return {
        url: discovered.url,
        source: "freshly_discovered",
        confidence: discovered.confidence,
        discoveryMethod: discovered.method,
      };
    }
  }

  return {
    url: null,
    source: "no_source_url_available",
    confidence: 0,
    discoveryMethod: null,
  };
}

/**
 * Save a discovered source URL into ipo_source_urls_clean.
 * Uses upsert on (ipo_id, provider, source_type, source_url).
 */
export async function saveSourceUrl({
  ipoId,
  provider,
  sourceType,
  sourceUrl,
  discoveryMethod,
  matchConfidence,
  status,
  failureReason,
}: {
  ipoId: string;
  provider: string;
  sourceType: string;
  sourceUrl: string;
  discoveryMethod: string;
  matchConfidence: number;
  status: "candidate" | "verified" | "failed" | "blocked" | "needs_review" | "rejected";
  failureReason?: string | null;
}) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("ipo_source_urls_clean")
    .upsert(
      {
        discovery_method: discoveryMethod,
        failure_reason: failureReason ?? null,
        ipo_id: ipoId,
        last_checked_at: now,
        last_success_at: status === "verified" ? now : undefined,
        match_confidence: matchConfidence,
        provider,
        source_type: sourceType,
        source_url: sourceUrl,
        status,
        updated_at: now,
      },
      {
        onConflict: "ipo_id,provider,source_type,source_url",
        ignoreDuplicates: false,
      }
    );

  if (error) {
    console.warn(`[saveSourceUrl] Failed to save ${provider}/${sourceType} for IPO ${ipoId}: ${error.message}`);
  }
  return !error;
}

// ---------------------------------------------------------------------------
// Internal: run provider-specific discovery
// ---------------------------------------------------------------------------

async function runProviderDiscovery({
  ipoId,
  provider,
  sourceType,
}: {
  ipoId: string;
  provider: CleanProvider;
  sourceType: string;
}): Promise<{ url: string; confidence: number; method: string } | null> {
  // Fetch minimal IPO info needed for discovery
  const { data: ipo } = await supabaseAdmin
    .from("ipos")
    .select("id,name,slug,category,open_date,close_date,price_band_low,price_band_high,issue_size_cr")
    .eq("id", ipoId)
    .maybeSingle();

  if (!ipo) return null;

  if (provider === "CHITTORGARH" && sourceType === "detail") {
    const { discoverChittorgarhUrl } = await import(
      "@/lib/ipo-engine-clean/source-discovery/discoverChittorgarhUrl"
    );
    return discoverChittorgarhUrl(ipo);
  }

  if (provider === "FINOLOGY_TICKER" && sourceType === "detail") {
    const { discoverFinologyUrls } = await import(
      "@/lib/ipo-engine-clean/source-discovery/discoverFinologyUrls"
    );
    return discoverFinologyUrls(ipo);
  }

  if (provider === "IPOPLATFORM" && sourceType === "detail") {
    const { discoverIPOPlatformUrls } = await import(
      "@/lib/ipo-engine-clean/source-discovery/discoverIPOPlatformUrls"
    );
    const result = await discoverIPOPlatformUrls(ipo);
    return result?.base ?? null;
  }

  // CHITTORGARH detail URLs come from list sync (list_row method), not on-demand
  // IPOWATCH / INVESTORGAIN are list-level sources, no per-IPO detail URL needed
  return null;
}
