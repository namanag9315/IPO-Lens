/**
 * discoverIPOPlatformUrls.ts
 *
 * Discovers IPOPlatform detail and sibling URLs for a given IPO.
 *
 * Strategy:
 *   1. Check if a base detail URL is already known from ipo_source_records_clean (list_row).
 *   2. If not, search IPOPlatform's IPO list page for a matching IPO link.
 *   3. Fetch and verify the base URL via content detection + company name match.
 *   4. If base URL is valid, derive sibling URLs:
 *      - financial_report
 *      - peer_comparison
 *      - subscription
 *      - review
 *   5. Save all discovered URLs into ipo_source_urls_clean.
 *
 * Rules:
 *   - Never creates IPO master rows.
 *   - Never saves facts directly.
 *   - Sibling URLs are only derived from a verified base URL.
 */

import * as cheerio from "cheerio";
import { detectIPOPageContent } from "@/lib/ipo-engine-clean/detectSourceContent";
import { fetchSource } from "@/lib/ipo-engine-clean/fetchSource";
import { rankIPONameCandidates } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { supabaseAdmin } from "@/lib/supabase";
import { saveSourceUrl } from "@/lib/ipo-engine-clean/source-discovery/resolveSourceUrlForIPO";
import { verifySourceIdentity } from "@/lib/ipo-engine-clean/verifySourceIdentity";

const IPOPLATFORM_LIST_URL = "https://www.ipoplatform.com/category/upcoming-ipo/";
const IPOPLATFORM_BASE = "https://www.ipoplatform.com";

type IPOPlatformCandidate = { id: string; name: string; url: string };
let listCandidateCache: { candidates: IPOPlatformCandidate[]; expiresAt: number } | null = null;

type IPOMinimal = {
  id: string;
  name: string;
  slug?: string | null;
  category?: string | null;
};

export type IPOPlatformDiscoveryResult = {
  base: { url: string; confidence: number; method: string } | null;
  siblings: Record<string, string>; // sourceType -> url
};

/**
 * Derive sibling URLs from a verified base URL.
 * Example base: https://www.ipoplatform.com/ipo/susan-electricals-india-ipo/4595
 * Siblings:
 *   financial_report  -> https://www.ipoplatform.com/ipo/financial-report/susan-electricals-india-ipo/4595
 *   peer_comparison   -> https://www.ipoplatform.com/ipo/peer-comparison/...
 *   subscription      -> https://www.ipoplatform.com/ipo/subscription/...
 *   review            -> https://www.ipoplatform.com/ipo/review/...
 */
export function deriveIPOPlatformSiblings(baseUrl: string): Record<string, string> {
  // Match: /ipo/<slug>/<id>
  const match = baseUrl.match(/^(https?:\/\/[^/]+)\/ipo\/([^/]+)\/(\d+)\/?$/);
  if (!match) return {};
  const [, origin, slug, id] = match;
  return {
    financial_report: `${origin}/ipo/financial-report/${slug}/${id}`,
    peer_comparison: `${origin}/ipo/peer-comparison/${slug}/${id}`,
    subscription: `${origin}/ipo/subscription/${slug}/${id}`,
    review: `${origin}/ipo/review/${slug}/${id}`,
  };
}

export async function discoverIPOPlatformUrls(
  ipo: IPOMinimal
): Promise<IPOPlatformDiscoveryResult> {
  // Step 1: Check ipo_source_records_clean for a list_row match
  const { data: existingRecord } = await supabaseAdmin
    .from("ipo_source_records_clean")
    .select("source_url")
    .eq("matched_ipo_id", ipo.id)
    .eq("provider", "IPOPLATFORM")
    .eq("record_type", "ipo_list")
    .not("source_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let candidate: { confidence: number; method: string; url: string } | null = existingRecord?.source_url
    ? { confidence: 100, method: "list_row", url: existingRecord.source_url }
    : null;

  // Step 2: If no record found, search IPOPlatform list page
  if (!candidate) {
    candidate = await searchIPOPlatformList(ipo);
  }

  if (!candidate) {
    return { base: null, siblings: {} };
  }

  // Step 3: Verify the base URL
  const verified = await verifyIPOPlatformUrl(ipo, candidate.url, candidate.confidence, candidate.method);
  if (!verified) {
    return { base: null, siblings: {} };
  }

  // Step 4: Derive and save sibling URLs
  const siblings = deriveIPOPlatformSiblings(candidate.url);
  for (const [siblingType, siblingUrl] of Object.entries(siblings)) {
    await saveSourceUrl({
      ipoId: ipo.id,
      provider: "IPOPLATFORM",
      sourceType: siblingType,
      sourceUrl: siblingUrl,
      discoveryMethod: "sibling_url",
      matchConfidence: 85,
      status: "candidate", // candidates until fetched and verified
    });
  }

  return { base: verified, siblings };
}

function extractCandidates(html: string) {
  const $ = cheerio.load(html);
  const byUrl = new Map<string, IPOPlatformCandidate>();
  $("a[href*='/ipo/']").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    let url: URL;
    try {
      url = new URL(href, IPOPLATFORM_BASE);
    } catch {
      return;
    }
    const match = url.pathname.match(/^\/ipo\/(?!financial-report\/|peer-comparison\/|subscription\/|review\/|performance\/)([^/]+)\/(\d+)\/?$/i);
    if (!match) return;
    const name = ($(element).attr("title") || $(element).attr("aria-label") || $(element).text() || match[1].replace(/-/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (!name) return;
    const absolute = `${url.origin}${url.pathname.replace(/\/$/, "")}`;
    if (!byUrl.has(absolute)) byUrl.set(absolute, { id: absolute, name, url: absolute });
  });
  return Array.from(byUrl.values());
}

async function cachedListCandidates() {
  if (listCandidateCache && listCandidateCache.expiresAt > Date.now()) return listCandidateCache.candidates;
  const fetched = await fetchSource(IPOPLATFORM_LIST_URL, { delayMs: 300, retries: 1, timeoutMs: 14_000 });
  const candidates = fetched.ok && fetched.html ? extractCandidates(fetched.html) : [];
  listCandidateCache = { candidates, expiresAt: Date.now() + 5 * 60_000 };
  return candidates;
}

function selectSafeCandidate(ipoName: string, candidates: IPOPlatformCandidate[], method: string) {
  const ranked = rankIPONameCandidates(ipoName, candidates);
  const best = ranked[0];
  const second = ranked[1];
  const margin = second ? best.score - second.score : best?.score ?? 0;
  if (!best || best.score < 82 || margin < 6) return null;
  const candidate = candidates.find((item) => item.id === best.id);
  return candidate ? { confidence: best.score, method, url: candidate.url } : null;
}

async function searchIPOPlatformList(ipo: IPOMinimal) {
  const listCandidates = await cachedListCandidates();
  const listMatch = selectSafeCandidate(ipo.name, listCandidates, "provider_list_search");
  if (listMatch) return listMatch;

  // The provider's own search catches DRHP-filed and older IPOs that are not on
  // the current upcoming list. Candidate links are still verified below.
  const searchUrl = `${IPOPLATFORM_BASE}/?s=${encodeURIComponent(`${ipo.name} IPO`)}`;
  const fetched = await fetchSource(searchUrl, { delayMs: 300, retries: 1, timeoutMs: 14_000 });
  if (!fetched.ok || !fetched.html) return null;
  return selectSafeCandidate(ipo.name, extractCandidates(fetched.html), "provider_site_search");
}

async function verifyIPOPlatformUrl(
  ipo: IPOMinimal,
  url: string,
  discoveryConfidence: number,
  discoveryMethod: string,
): Promise<{ url: string; confidence: number; method: string } | null> {
  const fetched = await fetchSource(url, {
    delayMs: 500,
    retries: 1,
    timeoutMs: 14000,
  });

  if (!fetched.ok || !fetched.html) {
    await saveSourceUrl({
      ipoId: ipo.id,
      provider: "IPOPLATFORM",
      sourceType: "detail",
      sourceUrl: url,
      discoveryMethod,
      matchConfidence: 0,
      status: fetched.blocked ? "blocked" : "failed",
      failureReason: fetched.error ?? `HTTP ${fetched.status}`,
    });
    return null;
  }

  const detection = detectIPOPageContent({ html: fetched.html, provider: "IPOPLATFORM", text: fetched.text });
  if (!detection.isValidIPOPage) {
    await saveSourceUrl({
      ipoId: ipo.id,
      provider: "IPOPLATFORM",
      sourceType: "detail",
      sourceUrl: url,
      discoveryMethod,
      matchConfidence: 20,
      status: "failed",
      failureReason: "Page content does not look like a valid IPO detail page",
    });
    return null;
  }

  const identity = verifySourceIdentity({ html: fetched.html, ipoName: ipo.name, sourceUrl: url });
  if (!identity.accepted) {
    await saveSourceUrl({
      ipoId: ipo.id,
      provider: "IPOPLATFORM",
      sourceType: "detail",
      sourceUrl: url,
      discoveryMethod,
      matchConfidence: identity.confidence,
      status: "needs_review",
      failureReason: identity.reason,
    });
    return null;
  }

  const confidence = Math.min(98, discoveryConfidence, identity.confidence);
  const method = discoveryMethod;

  await saveSourceUrl({
    ipoId: ipo.id,
    provider: "IPOPLATFORM",
    sourceType: "detail",
    sourceUrl: url,
    discoveryMethod: method,
    matchConfidence: confidence,
    status: "verified",
  });

  return { url, confidence, method };
}
