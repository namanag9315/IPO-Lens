import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";

export interface CleanIPOReference {
  close_date?: string | null;
  exchange?: string | null;
  id: string;
  issue_size_cr?: number | null;
  name: string;
  open_date?: string | null;
  price_band_high?: number | null;
  price_band_low?: number | null;
  slug?: string | null;
}

export interface CleanAliasReference {
  ipo_id: string;
  normalized_alias: string;
  provider?: string | null;
}

export interface CleanMatchInput {
  aliases?: CleanAliasReference[];
  closeDate?: string | null;
  existingIpos: CleanIPOReference[];
  issueSizeCr?: number | null;
  openDate?: string | null;
  priceBandHigh?: number | null;
  priceBandLow?: number | null;
  provider?: string | null;
  rawName: string;
}

export interface IPONameScore {
  characterScore: number;
  compactExact: boolean;
  normalizedCandidate: string;
  normalizedQuery: string;
  score: number;
  tokenCoverage: number;
  tokenScore: number;
}

export interface CleanMatchAlternative {
  confidence: number;
  ipoId: string;
  name: string;
}

export interface CleanMatchResult {
  alternatives?: CleanMatchAlternative[];
  confidence: number;
  ipoId: string | null;
  margin?: number;
  matchType: "exact" | "alias" | "token" | "fuzzy" | "none";
  reason: string;
}

const LOW_INFORMATION_TOKENS = new Set(["and", "company", "india"]);

function comparisonToken(token: string) {
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function levenshtein(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j];
      previous[j] = a[i - 1] === b[j - 1]
        ? diagonal
        : 1 + Math.min(previous[j], previous[j - 1], diagonal);
      diagonal = old;
    }
  }

  return previous[b.length];
}

function tokenWeight(token: string) {
  if (LOW_INFORMATION_TOKENS.has(token)) return 0.35;
  if (token.length <= 2) return 0.55;
  return 1 + Math.min(0.5, (token.length - 3) * 0.05);
}

function weightedTokenStats(leftName: string, rightName: string) {
  const left = Array.from(new Set(leftName.split(" ").filter(Boolean).map(comparisonToken)));
  const right = Array.from(new Set(rightName.split(" ").filter(Boolean).map(comparisonToken)));
  const rightSet = new Set(right);
  const overlap = left.filter((token) => rightSet.has(token));
  const leftWeight = left.reduce((sum, token) => sum + tokenWeight(token), 0);
  const rightWeight = right.reduce((sum, token) => sum + tokenWeight(token), 0);
  const overlapWeight = overlap.reduce((sum, token) => sum + tokenWeight(token), 0);
  const maxCoverage = Math.max(
    leftWeight > 0 ? overlapWeight / leftWeight : 0,
    rightWeight > 0 ? overlapWeight / rightWeight : 0,
  );
  const dice = leftWeight + rightWeight > 0 ? (2 * overlapWeight) / (leftWeight + rightWeight) : 0;

  return {
    dice,
    leftCount: left.length,
    maxCoverage,
    overlapCount: overlap.length,
    rightCount: right.length,
  };
}

export function scoreIPONameCandidate(queryName: string, candidateName: string): IPONameScore {
  const normalizedQuery = normalizeIPONameClean(queryName);
  const normalizedCandidate = normalizeIPONameClean(candidateName);
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const compactCandidate = normalizedCandidate.replace(/\s+/g, "");
  const comparisonCompactQuery = normalizedQuery.split(" ").filter(Boolean).map(comparisonToken).join("");
  const comparisonCompactCandidate = normalizedCandidate.split(" ").filter(Boolean).map(comparisonToken).join("");

  if (!normalizedQuery || !normalizedCandidate) {
    return {
      characterScore: 0,
      compactExact: false,
      normalizedCandidate,
      normalizedQuery,
      score: 0,
      tokenCoverage: 0,
      tokenScore: 0,
    };
  }

  if (normalizedQuery === normalizedCandidate) {
    return {
      characterScore: 100,
      compactExact: true,
      normalizedCandidate,
      normalizedQuery,
      score: 100,
      tokenCoverage: 100,
      tokenScore: 100,
    };
  }

  if (compactQuery === compactCandidate || comparisonCompactQuery === comparisonCompactCandidate) {
    return {
      characterScore: 100,
      compactExact: true,
      normalizedCandidate,
      normalizedQuery,
      score: 99,
      tokenCoverage: 100,
      tokenScore: 100,
    };
  }

  const stats = weightedTokenStats(normalizedQuery, normalizedCandidate);
  const maxLength = Math.max(comparisonCompactQuery.length, comparisonCompactCandidate.length);
  const characterSimilarity = maxLength > 0
    ? Math.max(0, (maxLength - levenshtein(comparisonCompactQuery, comparisonCompactCandidate)) / maxLength)
    : 0;
  let score = Math.round((stats.maxCoverage * 50) + (stats.dice * 30) + (characterSimilarity * 20));

  const queryFirst = normalizedQuery.split(" ")[0];
  const candidateFirst = normalizedCandidate.split(" ")[0];
  if (queryFirst && queryFirst === candidateFirst) score += 3;
  else if (stats.leftCount > 1 && stats.rightCount > 1) score -= 8;

  // A single generic token is not enough to identify an IPO safely.
  if (Math.min(stats.leftCount, stats.rightCount) <= 1 && Math.max(stats.leftCount, stats.rightCount) > 1) {
    score = Math.min(score, 68);
  }

  if (stats.overlapCount === 0) score = Math.min(score, Math.round(characterSimilarity * 55));

  return {
    characterScore: Math.round(characterSimilarity * 100),
    compactExact: false,
    normalizedCandidate,
    normalizedQuery,
    score: Math.max(0, Math.min(96, score)),
    tokenCoverage: Math.round(stats.maxCoverage * 100),
    tokenScore: Math.round(stats.dice * 100),
  };
}

function dateDistanceDays(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return null;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return null;
  return Math.abs(leftTime - rightTime) / 86_400_000;
}

function relativeDifference(left: number | null | undefined, right: number | null | undefined) {
  if (!left || !right) return null;
  return Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right));
}

function contextualScore(ipo: CleanIPOReference, input: CleanMatchInput) {
  let adjustment = 0;
  let corroborators = 0;
  const notes: string[] = [];

  for (const [label, sourceDate, ipoDate] of [
    ["open date", input.openDate, ipo.open_date],
    ["close date", input.closeDate, ipo.close_date],
  ] as const) {
    const distance = dateDistanceDays(sourceDate, ipoDate);
    if (distance === null) continue;
    if (distance <= 1) {
      adjustment += 5;
      corroborators += 1;
    } else if (distance > 14) {
      adjustment -= 14;
      notes.push(`${label} conflicts`);
    }
  }

  const sourcePrice = input.priceBandHigh ?? input.priceBandLow;
  const ipoPrice = ipo.price_band_high ?? ipo.price_band_low;
  const priceDifference = relativeDifference(sourcePrice, ipoPrice);
  if (priceDifference !== null) {
    if (priceDifference <= 0.02) {
      adjustment += 5;
      corroborators += 1;
    } else if (priceDifference > 0.12) {
      adjustment -= 16;
      notes.push("price band conflicts");
    }
  }

  const sizeDifference = relativeDifference(input.issueSizeCr, ipo.issue_size_cr);
  if (sizeDifference !== null) {
    if (sizeDifference <= 0.05) {
      adjustment += 4;
      corroborators += 1;
    } else if (sizeDifference > 0.3) {
      adjustment -= 10;
      notes.push("issue size conflicts");
    }
  }

  return { adjustment, corroborators, notes };
}

export function rankIPONameCandidates(
  rawName: string,
  candidates: Array<{ id: string; name: string }>,
) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      ...scoreIPONameCandidate(rawName, candidate.name),
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
}

export function matchIPONameClean(input: CleanMatchInput): CleanMatchResult {
  const normalized = normalizeIPONameClean(input.rawName);
  if (!normalized) {
    return { confidence: 0, ipoId: null, matchType: "none", reason: "Empty normalized name." };
  }

  const exact = input.existingIpos.find((ipo) => normalizeIPONameClean(ipo.name) === normalized);
  if (exact) {
    return { confidence: 100, ipoId: exact.id, margin: 100, matchType: "exact", reason: "Exact normalized IPO name match." };
  }

  const alias = (input.aliases ?? []).find((item) =>
    item.normalized_alias === normalized && (!item.provider || !input.provider || item.provider === input.provider));
  if (alias) {
    return { confidence: 98, ipoId: alias.ipo_id, margin: 98, matchType: "alias", reason: "Exact verified alias match." };
  }

  const ranked = input.existingIpos
    .map((ipo) => {
      const nameScore = scoreIPONameCandidate(input.rawName, ipo.name);
      const context = contextualScore(ipo, input);
      return {
        confidence: Math.max(0, Math.min(96, nameScore.score + context.adjustment)),
        context,
        ipo,
        nameScore,
      };
    })
    .sort((left, right) => right.confidence - left.confidence || left.ipo.name.localeCompare(right.ipo.name));

  const best = ranked[0];
  if (!best) return { confidence: 0, ipoId: null, matchType: "none", reason: "No IPO candidates available." };

  const second = ranked[1];
  const margin = second ? best.confidence - second.confidence : best.confidence;
  const alternatives = ranked.slice(0, 3).map((candidate) => ({
    confidence: candidate.confidence,
    ipoId: candidate.ipo.id,
    name: candidate.ipo.name,
  }));
  const hasSafeMargin = margin >= 8;
  const corroborated = best.context.corroborators > 0;
  const accepted = best.confidence >= 82 && (hasSafeMargin || corroborated);
  const matchType = best.nameScore.tokenScore >= best.nameScore.characterScore ? "token" : "fuzzy";
  const detail = `Name ${best.nameScore.score}; token ${best.nameScore.tokenScore}; character ${best.nameScore.characterScore}; margin ${margin}.`;
  const conflict = best.context.notes.length > 0 ? ` Conflicts: ${best.context.notes.join(", ")}.` : "";

  if (!accepted) {
    const rejection = best.confidence >= 82 && !hasSafeMargin && !corroborated
      ? "Match is ambiguous because the top candidates are too close."
      : "Match is below the safe confidence threshold.";
    return {
      alternatives,
      confidence: best.confidence,
      ipoId: null,
      margin,
      matchType: "none",
      reason: `${detail}${conflict} ${rejection}`,
    };
  }

  return {
    alternatives,
    confidence: best.confidence,
    ipoId: best.ipo.id,
    margin,
    matchType,
    reason: `${detail}${conflict} Identity accepted.`,
  };
}
