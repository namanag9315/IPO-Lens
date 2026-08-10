import type {
  AIAnalysisLabel,
  IPOAnchorInvestor,
  IPOAnchorSummary,
  IPOCategory,
  IPOFinancialYearly,
  IPOLeadManagerWithManager,
  IPOMarketMakerWithMaker,
  IPOObjectOfIssue,
  IPOPeerComparison,
  LeadManagerIPOHistory,
  LeadManagerTrackRecordScore,
  ResearchSignalLabel,
  ScoreBreakdown,
} from "@/types/ipo";
import { calculateAnchorInvestorScore } from "@/lib/anchorInvestorScoring";
import { isSMECategory } from "@/lib/ipoCategory";
import { mainboardScoreItems } from "@/lib/scoring/mainboardScore";
import { smeScoreItems } from "@/lib/scoring/smeScore";
import type { DetailedScoringResult } from "@/lib/scoring/scoreTypes";

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
  leadManagers?: IPOLeadManagerWithManager[];
  leadManagerHistory?: LeadManagerIPOHistory[];
  leadManagerScores?: LeadManagerTrackRecordScore[];
  marketMakers?: IPOMarketMakerWithMaker[];
}

export interface ScoringResult {
  score: number;
  label: ResearchSignalLabel;
  breakdown: ScoreBreakdown;
  confidence: "Low" | "Medium" | "High";
}

export interface IPOScoringInput {
  gmp: number;
  issuePrice: number;
  totalX: number;
  qibX: number;
  niiX: number;
  retailX: number;
  revenueLatest: number;
  revenuePrev: number;
  patLatest: number;
  patPrev: number;
  patMargin: number;
  roe: number;
  roce: number;
  ipoPE: number | null;
  sectorPE: number | null;
  leadManagerScore: number | null;
  hasMarketMaker: boolean;
  marketMakerQuality: "strong" | "average" | "weak" | null;
  promoterHolding: number;
  hasUseOfProceeds: boolean;
  hasCleanGovernance: boolean;
  category: "mainboard" | "sme";
  hasObjectsOfIssue: boolean;
  hasPeerData: boolean;
  hasLeadManager?: boolean;
}

export interface IPOScoreBreakdown {
  gmpScore: number;
  demandScore: number;
  financialScore: number;
  valuationScore: number;
  leadManagerScore: number;
  marketMakerScore: number;
  governanceScore: number;
  riskAdjustment: number;
}

export interface IPOScoringResult {
  score: number;
  label: "Strong apply" | "Apply" | "Neutral" | "Avoid";
  scoreColor: "green" | "amber" | "yellow" | "red";
  breakdown: IPOScoreBreakdown;
  missingData: string[];
  potentialScore: number;
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

function safeGrowth(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return 0;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function scoreColorForLabel(label: IPOScoringResult["label"]): IPOScoringResult["scoreColor"] {
  switch (label) {
    case "Strong apply":
      return "green";
    case "Apply":
      return "amber";
    case "Neutral":
      return "yellow";
    default:
      return "red";
  }
}

export function calculateLeadManagerScoreLite(pastIPOCount: number, positiveListingPct: number, above30DayPct: number) {
  return clamp(
    positiveListingPct * 0.5 + above30DayPct * 0.35 + (Math.min(Math.max(pastIPOCount, 0), 20) / 20) * 100 * 0.15,
    0,
    100,
  );
}

export function getMissingDataWarnings(input: IPOScoringInput): string[] {
  const warnings: string[] = [];

  if (input.leadManagerScore === null) {
    if (input.hasLeadManager) {
      warnings.push("Lead manager history pending - 15 pts locked");
    } else {
      warnings.push("Lead manager not linked - 15 pts locked");
    }
  }

  if (input.category === "sme" && !input.hasMarketMaker) {
    warnings.push("Market maker missing - 8 pts locked");
  }

  if (!input.hasPeerData) {
    warnings.push("Peer PE data missing - valuation estimated");
  }

  if (!input.hasUseOfProceeds || !input.hasObjectsOfIssue) {
    warnings.push("Objects of issue not added - 4 pts locked");
  }

  if (input.ipoPE === null) {
    warnings.push("IPO PE not calculated - scoring conservative");
  }

  return warnings;
}

export function getPotentialScore(result: Pick<IPOScoringResult, "score">, input: IPOScoringInput): number {
  let bonus = 0;

  if (input.leadManagerScore === null) {
    bonus += input.category === "sme" ? 9 : 5;
  }

  if (input.category === "sme" && !input.hasMarketMaker) {
    bonus += 4;
  }

  if (!input.hasPeerData) {
    bonus += 3;
  }

  if (!input.hasUseOfProceeds || !input.hasObjectsOfIssue) {
    bonus += 3;
  }

  return Math.min(100, result.score + bonus);
}

export function calculateIPOScore(input: IPOScoringInput): IPOScoringResult {
  const gmpPct = input.issuePrice > 0 ? (input.gmp / input.issuePrice) * 100 : 0;
  const gmpMomentumScore =
    gmpPct < 0 ? 0 : gmpPct < 5 ? 2 : gmpPct < 15 ? 4 : gmpPct < 25 ? 6 : gmpPct < 50 ? 8 : 10;

  const qibScore = input.qibX >= 50 ? 6 : input.qibX >= 20 ? 5 : input.qibX >= 5 ? 4 : input.qibX >= 1 ? 2 : 0;
  const niiScore = input.niiX >= 100 ? 4 : input.niiX >= 30 ? 3 : input.niiX >= 10 ? 2 : 1;
  const totalScore = (Math.min(Math.max(input.totalX, 0), 80) / 80) * 5;
  const demandScore = qibScore + niiScore + totalScore;

  const revGrowth = safeGrowth(input.revenueLatest, input.revenuePrev);
  const patGrowth = safeGrowth(input.patLatest, input.patPrev);
  const revenueScore = revGrowth >= 100 ? 5 : revGrowth >= 50 ? 4 : revGrowth >= 25 ? 3 : revGrowth >= 10 ? 2 : 1;
  const patGrowthScore = patGrowth >= 200 ? 5 : patGrowth >= 100 ? 4 : patGrowth >= 50 ? 3 : patGrowth >= 20 ? 2 : 1;
  const marginScore = input.patMargin >= 20 ? 5 : input.patMargin >= 12 ? 4 : input.patMargin >= 8 ? 3 : input.patMargin >= 4 ? 2 : 1;
  const roeScore = input.roe >= 25 ? 3 : input.roe >= 15 ? 2 : 1;
  const roceScore = input.roce >= 20 ? 2 : input.roce >= 12 ? 1 : 0;
  const financialScore = revenueScore + patGrowthScore + marginScore + roeScore + roceScore;

  let valuationScore = 5;
  if (input.ipoPE !== null && input.sectorPE !== null && input.sectorPE > 0) {
    const discount = ((input.sectorPE - input.ipoPE) / input.sectorPE) * 100;
    valuationScore = discount >= 40 ? 15 : discount >= 25 ? 12 : discount >= 10 ? 9 : discount >= 0 ? 6 : 3;
  }
  if (input.hasPeerData) {
    valuationScore += 2;
  }
  valuationScore = clamp(valuationScore, 0, 15);

  const leadManagerContribution =
    input.leadManagerScore === null ? (input.category === "sme" ? 3 : 7) : (clamp(input.leadManagerScore, 0, 100) / 100) * 15;

  const marketMakerScore =
    input.category === "mainboard"
      ? 8
      : !input.hasMarketMaker
        ? 2
        : input.marketMakerQuality === "weak"
          ? 3
          : input.marketMakerQuality === "strong"
            ? 8
            : 5;

  const promoterScore = input.promoterHolding >= 75 ? 4 : input.promoterHolding >= 60 ? 3 : input.promoterHolding >= 50 ? 2 : 1;
  const governanceScore = promoterScore + (input.hasUseOfProceeds ? 4 : 0) + (input.hasCleanGovernance ? 4 : 1);

  let missingCount = 0;
  if (input.leadManagerScore === null) missingCount += 1;
  if (input.category === "sme" && !input.hasMarketMaker) missingCount += 1;
  if (!input.hasUseOfProceeds) missingCount += 1;
  if (!input.hasPeerData) missingCount += 1;

  const riskAdjustment = -(Math.min(missingCount, 4) + (input.category === "sme" ? 3 : 0));
  const rawScore =
    gmpMomentumScore +
    demandScore +
    financialScore +
    valuationScore +
    leadManagerContribution +
    marketMakerScore +
    governanceScore +
    riskAdjustment;
  const score = clamp(Math.round(rawScore), 0, 100);
  const label = score >= 75 ? "Strong apply" : score >= 55 ? "Apply" : score >= 35 ? "Neutral" : "Avoid";
  const partialResult = { score };

  return {
    breakdown: {
      demandScore,
      financialScore,
      gmpScore: gmpMomentumScore,
      governanceScore,
      leadManagerScore: leadManagerContribution,
      marketMakerScore,
      riskAdjustment,
      valuationScore,
    },
    label,
    missingData: getMissingDataWarnings(input),
    potentialScore: getPotentialScore(partialResult, input),
    score,
    scoreColor: scoreColorForLabel(label),
  };
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
    return 15;
  }

  if (pct >= 20) {
    return 12;
  }

  if (pct >= 10) {
    return 8;
  }

  if (pct >= 5) {
    return 5;
  }

  return 2;
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

  if (isSMECategory(input.category)) {
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
  const detailed = calculateDetailedScore(data);

  return {
    score: detailed.score,
    label: detailed.label,
    breakdown: detailed.legacyBreakdown,
    confidence: detailed.confidence,
  };
}

export function calculateDetailedScore(data: ScoringInput): DetailedScoringResult {
  const scoreModel = isSMECategory(data.category) ? "SME" : "MAINBOARD";
  const breakdown = scoreModel === "SME" ? smeScoreItems(data) : mainboardScoreItems(data);
  const dataQualityNotes: string[] = [];
  const missingResearchAreas = [
    data.financials?.length,
    data.peers?.length,
    scoreModel === "MAINBOARD" ? data.anchorSummary || data.anchorInvestors?.length : data.leadManagers?.length,
    data.objectsOfIssue?.length,
  ].filter(Boolean).length;
  let penalties = 0;

  if (scoreModel === "SME") {
    penalties += 3;
    dataQualityNotes.push("SME model applies liquidity, volatility and disclosure caution.");
  }

  if (missingResearchAreas <= 1) {
    penalties += 4;
    dataQualityNotes.push("Several research inputs are missing, reducing score confidence.");
  }

  if (scoreModel === "SME" && !data.leadManagerScores?.length) {
    dataQualityNotes.push("Lead manager history is limited; neutral or conservative SME weighting is used.");
  }

  const rawScore = breakdown.reduce((sum, item) => sum + item.pointsEarned, 0) - penalties;
  const score = clamp(Math.round(rawScore), 0, 100);
  const legacyBreakdown: ScoreBreakdown = {
    anchorInvestorQuality: breakdown.find((item) => item.key === "anchorInvestorQuality")?.pointsEarned ?? 0,
    fundamentals: breakdown.find((item) => item.key === "fundamentals")?.pointsEarned ?? 0,
    gmpMomentum: breakdown.find((item) => item.key === "gmpMomentum")?.pointsEarned ?? 0,
    objectsOfIssue: breakdown.find((item) => item.key === "objectsOfIssue")?.pointsEarned ?? 0,
    penalties,
    riskAndGovernance: breakdown.find((item) => item.key === "riskAndGovernance")?.pointsEarned ?? 0,
    subscriptionDemand: breakdown.find((item) => item.key === "subscriptionDemand")?.pointsEarned ?? 0,
    valuationComfort: breakdown.find((item) => item.key === "valuationComfort")?.pointsEarned ?? 0,
  };
  const confidence = dataConfidence(data);
  const label = getScoreLabel(score);

  return {
    breakdown,
    confidence,
    dataQualityNotes,
    label,
    legacyBreakdown,
    penalties,
    score,
    scoreModel,
    signalLabel: label,
    totalScore: score,
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
