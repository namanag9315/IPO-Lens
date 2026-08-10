/**
 * discoverFinologyUrls.ts
 *
 * Discovers Finology Ticker detail URLs by safe slug construction.
 * discovery_method = slug_guess_verified
 *
 * Rules:
 *   - Only works for IPOs that already exist in the `ipos` table.
 *   - Builds URL from IPO slug + category (sme/mainboard).
 *   - Fetches candidate URL.
 *   - Runs content detection to confirm valid IPO page.
 *   - Confirms company name match.
 *   - Saves to ipo_source_urls_clean.
 *   - Returns result (url + confidence) or null.
 */

import { detectIPOPageContent } from "@/lib/ipo-engine-clean/detectSourceContent";
import { fetchSource } from "@/lib/ipo-engine-clean/fetchSource";
import { slugifyIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { saveSourceUrl } from "@/lib/ipo-engine-clean/source-discovery/resolveSourceUrlForIPO";
import { verifySourceIdentity } from "@/lib/ipo-engine-clean/verifySourceIdentity";

type IPOMinimal = {
  id: string;
  name: string;
  slug?: string | null;
  category?: string | null;
};

function buildFinologyUrls(ipo: IPOMinimal) {
  const slugs = Array.from(new Set([
    ipo.slug?.trim(),
    slugifyIPONameClean(ipo.name),
    slugifyIPONameClean(ipo.name).replace(/-india$/, ""),
  ].filter((slug): slug is string => Boolean(slug))));
  const cat = ipo.category?.toLowerCase();
  const boards = cat === "sme" ? ["sme"] : cat === "mainboard" || cat === "main" ? ["mainboard"] : ["mainboard", "sme"];
  return boards.flatMap((board) => slugs.map((slug) => `https://ticker.finology.in/ipo/${board}/${slug}`));
}

export async function discoverFinologyUrls(
  ipo: IPOMinimal
): Promise<{ url: string; confidence: number; method: string } | null> {
  const candidateUrls = buildFinologyUrls(ipo);
  if (candidateUrls.length === 0) {
    await saveSourceUrl({
      ipoId: ipo.id,
      provider: "FINOLOGY_TICKER",
      sourceType: "detail",
      sourceUrl: "https://ticker.finology.in/ipo",
      discoveryMethod: "slug_guess_verified",
      matchConfidence: 0,
      status: "failed",
      failureReason: "Cannot build Finology URL: missing slug or category",
    });
    return null;
  }

  for (const candidateUrl of candidateUrls) {
    const fetched = await fetchSource(candidateUrl, {
      delayMs: 250,
      retries: 1,
      timeoutMs: 12000,
    });

    if (!fetched.ok || !fetched.html) {
      await saveSourceUrl({
        ipoId: ipo.id,
        provider: "FINOLOGY_TICKER",
        sourceType: "detail",
        sourceUrl: candidateUrl,
        discoveryMethod: "slug_guess_verified",
        matchConfidence: 0,
        status: fetched.blocked ? "blocked" : "failed",
        failureReason: fetched.error ?? `HTTP ${fetched.status}`,
      });
      if (fetched.blocked) return null;
      continue;
    }

    const detection = detectIPOPageContent({ html: fetched.html, provider: "FINOLOGY_TICKER", text: fetched.text });

    if (!detection.isValidIPOPage) {
      await saveSourceUrl({
        ipoId: ipo.id,
        provider: "FINOLOGY_TICKER",
        sourceType: "detail",
        sourceUrl: candidateUrl,
        discoveryMethod: "slug_guess_verified",
        matchConfidence: 20,
        status: "failed",
        failureReason: "Content detection: page does not look like an IPO detail page",
      });
      continue;
    }

    const identity = verifySourceIdentity({ html: fetched.html, ipoName: ipo.name, sourceUrl: candidateUrl });

    if (!identity.accepted) {
      await saveSourceUrl({
        ipoId: ipo.id,
        provider: "FINOLOGY_TICKER",
        sourceType: "detail",
        sourceUrl: candidateUrl,
        discoveryMethod: "slug_guess_verified",
        matchConfidence: identity.confidence,
        status: "needs_review",
        failureReason: identity.reason,
      });
      continue;
    }

    const confidence = Math.min(95, identity.confidence);

    await saveSourceUrl({
      ipoId: ipo.id,
      provider: "FINOLOGY_TICKER",
      sourceType: "detail",
      sourceUrl: candidateUrl,
      discoveryMethod: "slug_guess_verified",
      matchConfidence: confidence,
      status: "verified",
    });

    return { url: candidateUrl, confidence, method: "slug_guess_verified" };
  }

  return null;
}
