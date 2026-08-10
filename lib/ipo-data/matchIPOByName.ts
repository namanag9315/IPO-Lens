import { ipoNameTokens, normalizeIPOName } from "./normalizeIPOName";

export interface IPOReference {
  id: string;
  slug: string;
  name: string;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  status: string;
}

export interface IPOAlias {
  ipo_id: string;
  normalized_alias: string;
  source: string;
}

export interface MatchResult {
  ipo: IPOReference;
  score: number;
  matchType: "slug" | "normalized_name" | "alias" | "fuzzy";
}

function slugifyIPOName(value: string) {
  const normalized = normalizeIPOName(value);
  return normalized.replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
}

export function calculateMatchConfidence(scrapedName: string, ipoName: string, ipoSlug: string) {
  const scraped = normalizeIPOName(scrapedName);
  const target = normalizeIPOName(ipoName);
  const slug = normalizeIPOName(ipoSlug.replace(/-/g, " "));

  if (!scraped || !target) return 0;
  if (scraped.includes(target) || target.includes(scraped) || scraped.includes(slug) || slug.includes(scraped)) {
    return 0.82;
  }

  const scrapedTokens = new Set(ipoNameTokens(scraped));
  const targetTokens = ipoNameTokens(target);
  const matches = targetTokens.filter((token) => scrapedTokens.has(token)).length;

  return targetTokens.length ? matches / targetTokens.length : 0;
}

export function matchIPOByName(
  scrapedName: string,
  source: string,
  ipos: IPOReference[],
  aliases: IPOAlias[]
): MatchResult | null {
  const normalized = normalizeIPOName(scrapedName);
  const slugified = slugifyIPOName(scrapedName);

  // 1. Exact slug match
  const slugMatch = ipos.find((i) => i.slug === slugified || i.slug.replace(/-/g, "") === slugified.replace(/-/g, ""));
  if (slugMatch) return { ipo: slugMatch, score: 1, matchType: "slug" };

  // 2. Exact normalized name match
  const exactMatch = ipos.find((i) => normalizeIPOName(i.name) === normalized);
  if (exactMatch) return { ipo: exactMatch, score: 1, matchType: "normalized_name" };

  // 3. Alias match
  const aliasMatch = aliases.find((a) => a.normalized_alias === normalized && a.source === source);
  if (aliasMatch) {
    const ipo = ipos.find((i) => i.id === aliasMatch.ipo_id);
    if (ipo) return { ipo, score: 1, matchType: "alias" };
  }

  // 4. Fuzzy token match
  let best: MatchResult | null = null;
  for (const ipo of ipos) {
    const score = calculateMatchConfidence(scrapedName, ipo.name, ipo.slug);
    if (!best || score > best.score) {
      best = { ipo, score, matchType: "fuzzy" };
    }
  }

  return best;
}
