import * as cheerio from "cheerio";
import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { scoreIPONameCandidate } from "@/lib/ipo-engine-clean/matchIPONameClean";

export interface SourceIdentityResult {
  accepted: boolean;
  bestCandidate: string | null;
  confidence: number;
  reason: string;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.replace(/\s+/g, " ").trim()).filter((value): value is string => Boolean(value))));
}

function nameFromUrl(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const ignored = new Set(["ipo", "sme", "mainboard", "financial-report", "peer-comparison", "subscription", "review"]);
    const segment = segments.find((item) => !ignored.has(item.toLowerCase()) && !/^\d+$/.test(item));
    return segment?.replace(/-/g, " ") ?? null;
  } catch {
    return null;
  }
}

export function verifySourceIdentity({
  html,
  ipoName,
  sourceUrl,
}: {
  html: string;
  ipoName: string;
  sourceUrl?: string | null;
}): SourceIdentityResult {
  const $ = cheerio.load(html);
  const candidates = unique([
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("title").first().text(),
    ...$("h1").slice(0, 3).map((_, element) => $(element).text()).get(),
    ...$("h2").slice(0, 4).map((_, element) => $(element).text()).get(),
    nameFromUrl(sourceUrl),
  ]);

  const ranked = candidates
    .map((candidate) => ({ candidate, score: scoreIPONameCandidate(ipoName, candidate).score }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0] ?? null;

  if (best && best.score >= 82) {
    return {
      accepted: true,
      bestCandidate: best.candidate,
      confidence: best.score,
      reason: `Source title/heading identity matched at ${best.score}.`,
    };
  }

  // Some provider pages omit a useful title but repeat the issuer name near the
  // start of the document. This is a fallback, not a fuzzy whole-page match.
  $("script,style,noscript,svg").remove();
  const leadingText = $("body").text().replace(/\s+/g, " ").slice(0, 3500);
  const normalizedIPO = normalizeIPONameClean(ipoName);
  const normalizedLeading = normalizeIPONameClean(leadingText);
  const compactIPO = normalizedIPO.replace(/\s+/g, "");
  const compactLeading = normalizedLeading.replace(/\s+/g, "");

  if (compactIPO.length >= 6 && compactLeading.includes(compactIPO) && (best?.score ?? 0) >= 55) {
    return {
      accepted: true,
      bestCandidate: best?.candidate ?? null,
      confidence: Math.max(84, best?.score ?? 0),
      reason: "Exact normalized issuer name appears near the start of the source page.",
    };
  }

  return {
    accepted: false,
    bestCandidate: best?.candidate ?? null,
    confidence: best?.score ?? 0,
    reason: `Source identity could not be verified${best ? `; best title/heading score was ${best.score}` : ""}.`,
  };
}
