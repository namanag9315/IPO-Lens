import type {
  AIAnalysisLabel,
  IPOAnchorInvestor,
  IPOAnchorSummary,
  IPOCategory,
  IPOFinancialYearly,
  IPOObjectOfIssue,
  IPOPeerComparison,
  ResearchSignalLabel,
  ScoreBreakdown,
} from "@/types/ipo";
import { calculateAnchorInvestorScore } from "@/lib/anchorInvestorScoring";

export interface ScoringInput {
  gmp: number;
  issuePrice: number;
  totalX: number;
  qibX: number;
  niiX: number;
  retailX: number;
  issueSizeCr: number;
  category?: IPOCategory | null;
  financials?: IPOFinancialYearly[];
  peers?: IPOPeerComparison[];
  anchorSummary?: IPOAnchorSummary | null;
  anchorInvestors?: IPOAnchorInvestor[];
  objectsOfIssue?: IPOObjectOfIssue[];
  riskFactors?: string[];
}

export interface ScoringResult {
  score: number;
  label: ResearchSignalLabel;
  breakdown: ScoreBreakdown;
  confidence: "Low" | "Medium" | "High";
}

export function estimateListingGainPct(gmpValue: number | null, issuePrice: number | null) {
  if (gmpValue === null || issuePrice === null || issuePrice <= 0) {
    return null;
  }

  return Number(((gmpValue / issuePrice) * 100).toFixed(2));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function latestFinancials(financials: IPOFinancialYearly[] = []) {
  return financials
    .slice()
    .sort((a, b) => a.financial_year.localeCompare(b.financial_year))
    .at(-1);
}

function previousFinancials(financials: IPOFinancialYearly[] = []) {
  return financials
    .slice()
    .sort((a, b) => a.financial_year.localeCompare(b.financial_year))
    .at(-2);
}

function percentageGrowth(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || previous === null || previous === undefined || previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function fundamentalsScore(financials: IPOFinancialYearly[] = []) {
  if (financials.length === 0) {
    return 6;
  }

  const latest = latestFinancials(financials);
  const previous = previousFinancials(financials);

  if (!latest) {
    return 6;
  }

  let score = 0;
  const revenueGrowth = percentageGrowth(latest.revenue_cr, previous?.revenue_cr);
  const patGrowth = percentageGrowth(latest.pat_cr, previous?.pat_cr);

  if ((latest.pat_cr ?? 0) > 0) {
    score += 5;
  }

  if ((latest.revenue_cr ?? 0) > 0) {
    score += 3;
  }

  if (revenueGrowth !== null) {
    score += revenueGrowth >= 25 ? 5 : revenueGrowth >= 10 ? 3 : revenueGrowth >= 0 ? 1 : 0;
  } else {
    score += 1;
  }

  if (patGrowth !== null) {
    score += patGrowth >= 25 ? 4 : patGrowth >= 10 ? 3 : patGrowth >= 0 ? 1 : 0;
  }

  if ((latest.pat_margin_pct ?? 0) >= 10) {
    score += 3;
  } else if ((latest.pat_margin_pct ?? 0) > 0) {
    score += 1;
  }

  if ((latest.roe_pct ?? 0) >= 15 || (latest.roce_pct ?? 0) >= 15) {
    score += 3;
  } else if ((latest.roe_pct ?? 0) >= 8 || (latest.roce_pct ?? 0) >= 8) {
    score += 1;
  }

  if (latest.debt_equity !== null && latest.debt_equity !== undefined) {
    score += latest.debt_equity <= 0.5 ? 2 : latest.debt_equity <= 1.5 ? 1 : -2;
  }

  if ((latest.pat_cr ?? 0) < 0) {
    score -= 6;
  }

  return clamp(score, 0, 25);
}

function subscriptionScore(totalX: number, qibX: number, retailX: number) {
  let score = 0;
  score += clamp(totalX, 0, 50) / 50 * 8;
  score += qibX >= 20 ? 7 : qibX >= 5 ? 5 : qibX >= 1 ? 2 : 0;
  score += retailX >= 10 ? 5 : retailX >= 3 ? 3 : retailX >= 1 ? 1 : 0;

  return clamp(score, 0, 20);
}

function valuationScore(issuePrice: number, financials: IPOFinancialYearly[] = [], peers: IPOPeerComparison[] = []) {
  const latest = latestFinancials(financials);
  const eps = latest?.eps ?? null;
  const peerPEs = peers.map((peer) => peer.pe_ratio).filter((value): value is number => value !== null && value > 0);

  if (!eps || eps <= 0) {
    return peerPEs.length > 0 ? 5 : 6;
  }

  const issuePE = issuePrice / eps;

  if (peerPEs.length === 0) {
    return issuePE <= 20 ? 11 : issuePE <= 35 ? 8 : issuePE <= 50 ? 5 : 2;
  }

  const averagePeerPE = peerPEs.reduce((sum, value) => sum + value, 0) / peerPEs.length;
  const relative = issuePE / averagePeerPE;

  if (relative <= 0.75) {
    return 15;
  }

  if (relative <= 1) {
    return 12;
  }

  if (relative <= 1.25) {
    return 8;
  }

  if (relative <= 1.6) {
    return 5;
  }

  return 2;
}

function gmpScore(gmp: number, issuePrice: number) {
  const pct = issuePrice > 0 ? (gmp / issuePrice) * 100 : 0;

  if (pct < 0) {
    return 0;
  }

  if (pct >= 35) {
    return 25;
  }

  if (pct >= 25) {
    return 22;
  }

  if (pct >= 15) {
    return 17;
  }

  if (pct >= 8) {
    return 12;
  }

  if (pct >= 3) {
    return 6;
  }

  return 2;
}

function weightedScore(value: number, max: number, target: number) {
  return Math.round((value / max) * target);
}

function anchorScore(input: ScoringInput) {
  const score = calculateAnchorInvestorScore({
    investors: input.anchorInvestors ?? [],
    summary: input.anchorSummary,
    issueSizeCr: input.issueSizeCr,
    priceBandHigh: input.issuePrice,
    category: input.category,
  }).anchor_quality_score;

  return clamp(Math.round(score / 10), 0, 10);
}

function riskScore(input: ScoringInput) {
  let score = 10;
  const latest = latestFinancials(input.financials);
  const risks = input.riskFactors ?? [];

  if (input.category === "sme") {
    score -= 2;
  }

  if ((latest?.pat_cr ?? 0) < 0) {
    score -= 3;
  }

  if ((latest?.debt_equity ?? 0) > 2) {
    score -= 2;
  }

  if (risks.length >= 8) {
    score -= 2;
  } else if (risks.length >= 4) {
    score -= 1;
  }

  return clamp(score, 0, 10);
}

function objectsScore(objects: IPOObjectOfIssue[] = []) {
  if (objects.length === 0) {
    return 2;
  }

  let score = 2;
  const categories = objects.map((object) => `${object.category ?? ""} ${object.object_name}`.toLowerCase());
  const growthUse = categories.some((text) => /capex|expansion|working capital|technology|manufactur|growth/.test(text));
  const debtUse = categories.some((text) => /debt|repay|prepay/.test(text));
  const offerForSaleHeavy = objects
    .filter((object) => /offer for sale|ofs/i.test(`${object.category ?? ""} ${object.object_name}`))
    .reduce((sum, object) => sum + (object.percentage ?? 0), 0);

  if (growthUse) {
    score += 2;
  }

  if (debtUse) {
    score += 1;
  }

  if (offerForSaleHeavy > 60) {
    score -= 2;
  }

  return clamp(score, 0, 5);
}

function dataConfidence(input: ScoringInput): ScoringResult["confidence"] {
  const available = [
    Boolean(input.financials?.length),
    Boolean(input.peers?.length),
    Boolean(input.anchorSummary || input.anchorInvestors?.length),
    Boolean(input.objectsOfIssue?.length),
    Boolean(input.riskFactors?.length),
    input.totalX > 0,
    input.gmp !== 0,
  ].filter(Boolean).length;

  if (available >= 5) {
    return "High";
  }

  if (available >= 3) {
    return "Medium";
  }

  return "Low";
}

export function getScoreLabel(score: number): ResearchSignalLabel {
  if (score >= 75) {
    return "Strong signal";
  }

  if (score >= 56) {
    return "Positive signal";
  }

  if (score >= 36) {
    return "Neutral signal";
  }

  return "Weak signal";
}

export function calculateScore(data: ScoringInput): ScoringResult {
  const fundamentals = fundamentalsScore(data.financials);
  const subscriptionDemand = subscriptionScore(data.totalX, data.qibX, data.retailX);
  const valuationComfort = valuationScore(data.issuePrice, data.financials, data.peers);
  const anchorInvestorQuality = anchorScore(data);
  const riskAndGovernance = riskScore(data);

  const breakdown: ScoreBreakdown = {
    fundamentals: weightedScore(fundamentals, 25, 22),
    subscriptionDemand: weightedScore(subscriptionDemand, 20, 18),
    valuationComfort: weightedScore(valuationComfort, 15, 13),
    gmpMomentum: gmpScore(data.gmp, data.issuePrice),
    anchorInvestorQuality: weightedScore(anchorInvestorQuality, 10, 8),
    riskAndGovernance: weightedScore(riskAndGovernance, 10, 9),
    objectsOfIssue: objectsScore(data.objectsOfIssue),
    penalties: 0,
  };

  if (data.category === "sme") {
    breakdown.penalties += 3;
  }

  const missingResearchAreas = [
    data.financials?.length,
    data.peers?.length,
    data.anchorSummary || data.anchorInvestors?.length,
    data.objectsOfIssue?.length,
  ].filter(Boolean).length;

  if (missingResearchAreas <= 1) {
    breakdown.penalties += 4;
  }

  const rawScore =
    breakdown.fundamentals +
    breakdown.subscriptionDemand +
    breakdown.valuationComfort +
    breakdown.gmpMomentum +
    breakdown.anchorInvestorQuality +
    breakdown.riskAndGovernance +
    breakdown.objectsOfIssue -
    breakdown.penalties;
  const score = clamp(Math.round(rawScore), 0, 100);

  return {
    score,
    label: getScoreLabel(score),
    breakdown,
    confidence: dataConfidence(data),
  };
}

export function getScoreColor(label: AIAnalysisLabel | string) {
  switch (label) {
    case "Avoid":
    case "Weak signal":
    case "High risk":
      return "text-red-500 bg-red-50";
    case "Neutral":
    case "Neutral signal":
      return "text-yellow-500 bg-yellow-50";
    case "Apply":
    case "Positive signal":
      return "text-green-500 bg-green-50";
    case "Strong Apply":
    case "Strong signal":
      return "text-emerald-500 bg-emerald-50";
    default:
      return "text-zinc-500 bg-zinc-50";
  }
}
