import { calculateAnchorInvestorScore } from "@/lib/anchorInvestorScoring";
import { isSMECategory } from "@/lib/ipoCategory";
import type { DetailedScoringInput, ScoreBreakdownItem } from "@/lib/scoring/scoreTypes";
import { MAINBOARD_WEIGHTS } from "@/lib/scoring/scoreTypes";
import type { IPOFinancialYearly, IPOObjectOfIssue, IPOPeerComparison } from "@/types/ipo";

export function clampScore(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

export function latestFinancials(financials: IPOFinancialYearly[] = []) {
  return financials
    .slice()
    .sort((a, b) => a.financial_year.localeCompare(b.financial_year))
    .at(-1);
}

export function previousFinancials(financials: IPOFinancialYearly[] = []) {
  return financials
    .slice()
    .sort((a, b) => a.financial_year.localeCompare(b.financial_year))
    .at(-2);
}

export function percentageGrowth(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || previous === null || previous === undefined || previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

export function scalePoints(rawPoints: number, rawMax: number, targetMax: number) {
  return Number((clampScore(rawPoints, 0, rawMax) / rawMax * targetMax).toFixed(1));
}

function status(points: number, max: number) {
  const ratio = max > 0 ? points / max : 0;
  if (ratio >= 0.68) return "positive" as const;
  if (ratio >= 0.38) return "neutral" as const;
  return "negative" as const;
}

export function fundamentalsRaw(financials: IPOFinancialYearly[] = []) {
  if (financials.length === 0) {
    return {
      confidence: "Low" as const,
      points: 6,
      reason: "Financial history is limited, so fundamentals receive conservative points.",
    };
  }

  const latest = latestFinancials(financials);
  const previous = previousFinancials(financials);

  if (!latest) {
    return {
      confidence: "Low" as const,
      points: 6,
      reason: "Financial history is limited, so fundamentals receive conservative points.",
    };
  }

  let points = 0;
  const revenueGrowth = percentageGrowth(latest.revenue_cr, previous?.revenue_cr);
  const patGrowth = percentageGrowth(latest.pat_cr, previous?.pat_cr);

  if ((latest.pat_cr ?? 0) > 0) points += 5;
  if ((latest.revenue_cr ?? 0) > 0) points += 3;
  if (revenueGrowth !== null) points += revenueGrowth >= 25 ? 5 : revenueGrowth >= 10 ? 3 : revenueGrowth >= 0 ? 1 : 0;
  else points += 1;
  if (patGrowth !== null) points += patGrowth >= 25 ? 4 : patGrowth >= 10 ? 3 : patGrowth >= 0 ? 1 : 0;
  if ((latest.pat_margin_pct ?? 0) >= 10) points += 3;
  else if ((latest.pat_margin_pct ?? 0) > 0) points += 1;
  if ((latest.roe_pct ?? 0) >= 15 || (latest.roce_pct ?? 0) >= 15) points += 3;
  else if ((latest.roe_pct ?? 0) >= 8 || (latest.roce_pct ?? 0) >= 8) points += 1;
  if (latest.debt_equity !== null && latest.debt_equity !== undefined) points += latest.debt_equity <= 0.5 ? 2 : latest.debt_equity <= 1.5 ? 1 : -2;
  if ((latest.pat_cr ?? 0) < 0) points -= 6;

  const reasonParts = [
    revenueGrowth !== null ? `Revenue ${revenueGrowth >= 0 ? "grew" : "fell"} ${Math.abs(revenueGrowth).toFixed(1)}% YoY` : "Revenue trend is incomplete",
    patGrowth !== null ? `PAT ${patGrowth >= 0 ? "grew" : "fell"} ${Math.abs(patGrowth).toFixed(1)}% YoY` : "PAT trend is incomplete",
    latest.pat_margin_pct !== null ? `latest PAT margin is ${latest.pat_margin_pct}%` : "margin data is limited",
  ];

  return {
    confidence: financials.length >= 3 ? ("High" as const) : ("Medium" as const),
    points: clampScore(points, 0, 25),
    reason: `${reasonParts.join("; ")}.`,
  };
}

export function subscriptionRaw(totalX: number, qibX: number, retailX: number) {
  let points = 0;
  points += clampScore(totalX, 0, 50) / 50 * 8;
  points += qibX >= 20 ? 7 : qibX >= 5 ? 5 : qibX >= 1 ? 2 : 0;
  points += retailX >= 10 ? 5 : retailX >= 3 ? 3 : retailX >= 1 ? 1 : 0;

  return {
    confidence: totalX > 0 ? ("Medium" as const) : ("Low" as const),
    points: clampScore(points, 0, 20),
    reason: totalX > 0 ? `Total subscription is ${totalX.toFixed(1)}x with retail at ${retailX.toFixed(1)}x and QIB at ${qibX.toFixed(1)}x.` : "Subscription data is not available yet.",
  };
}

export function valuationRaw(issuePrice: number, financials: IPOFinancialYearly[] = [], peers: IPOPeerComparison[] = []) {
  const latest = latestFinancials(financials);
  const eps = latest?.eps ?? null;
  const peerPEs = peers.map((peer) => peer.pe_ratio).filter((value): value is number => value !== null && value > 0);

  if (!eps || eps <= 0) {
    return {
      confidence: peerPEs.length > 0 ? ("Medium" as const) : ("Low" as const),
      points: peerPEs.length > 0 ? 5 : 6,
      reason: "EPS or issue PE is not available, so valuation is scored conservatively.",
    };
  }

  const issuePE = issuePrice / eps;

  if (peerPEs.length === 0) {
    const points = issuePE <= 20 ? 11 : issuePE <= 35 ? 8 : issuePE <= 50 ? 5 : 2;
    return {
      confidence: "Medium" as const,
      points,
      reason: `Post-issue PE is around ${issuePE.toFixed(1)}x. Peer PE data is not available.`,
    };
  }

  const averagePeerPE = peerPEs.reduce((sum, value) => sum + value, 0) / peerPEs.length;
  const relative = issuePE / averagePeerPE;
  const points = relative <= 0.75 ? 15 : relative <= 1 ? 12 : relative <= 1.25 ? 8 : relative <= 1.6 ? 5 : 2;

  return {
    confidence: "High" as const,
    points,
    reason: `Post-issue PE is ${issuePE.toFixed(1)}x versus peer average near ${averagePeerPE.toFixed(1)}x.`,
  };
}

export function gmpRaw(gmp: number, issuePrice: number) {
  const pct = issuePrice > 0 ? (gmp / issuePrice) * 100 : 0;
  const points = pct < 0 ? 0 : pct >= 35 ? 15 : pct >= 20 ? 12 : pct >= 10 ? 8 : pct >= 5 ? 5 : 2;

  return {
    confidence: gmp !== 0 ? ("Medium" as const) : ("Low" as const),
    points,
    reason: `GMP is ${pct.toFixed(1)}% of issue price and remains capped in the score.`,
  };
}

export function objectsRaw(objects: IPOObjectOfIssue[] = []) {
  if (objects.length === 0) {
    return {
      confidence: "Low" as const,
      points: 2,
      reason: "Objects of issue are not fully available.",
    };
  }

  let points = 2;
  const categories = objects.map((object) => `${object.category ?? ""} ${object.object_name}`.toLowerCase());
  const growthUse = categories.some((text) => /capex|expansion|working capital|technology|manufactur|growth|product/.test(text));
  const debtUse = categories.some((text) => /debt|repay|prepay/.test(text));
  const offerForSaleHeavy = objects
    .filter((object) => /offer for sale|ofs/i.test(`${object.category ?? ""} ${object.object_name}`))
    .reduce((sum, object) => sum + (object.percentage ?? 0), 0);

  if (growthUse) points += 2;
  if (debtUse) points += 1;
  if (offerForSaleHeavy > 60) points -= 2;

  return {
    confidence: "Medium" as const,
    points: clampScore(points, 0, 5),
    reason: growthUse ? "Proceeds include growth or working-capital use." : "Use of proceeds appears limited or generic.",
  };
}

export function riskRaw(input: DetailedScoringInput, maxPoints: number) {
  let points = maxPoints;
  const latest = latestFinancials(input.financials);
  const risks = input.riskFactors ?? [];
  const notes: string[] = [];

  if (isSMECategory(input.category)) {
    points -= 2;
    notes.push("SME liquidity and volatility risk apply.");
  }

  if ((latest?.pat_cr ?? 0) < 0) {
    points -= 3;
    notes.push("Latest PAT is negative.");
  }

  if ((latest?.debt_equity ?? 0) > 2) {
    points -= 2;
    notes.push("Debt-to-equity is elevated.");
  }

  if (risks.length >= 8) {
    points -= 2;
    notes.push("Multiple risk factors are present.");
  } else if (risks.length >= 4) {
    points -= 1;
  }

  return {
    confidence: risks.length > 0 || latest ? ("Medium" as const) : ("Low" as const),
    points: clampScore(points, 0, maxPoints),
    reason: notes.length ? notes.join(" ") : "No severe structured risk flag is present in current data.",
  };
}

export function mainboardScoreItems(input: DetailedScoringInput): ScoreBreakdownItem[] {
  const fundamentals = fundamentalsRaw(input.financials);
  const subscription = subscriptionRaw(input.totalX, input.qibX, input.retailX);
  const valuation = valuationRaw(input.issuePrice, input.financials, input.peers);
  const gmp = gmpRaw(input.gmp, input.issuePrice);
  const anchorAnalysis = calculateAnchorInvestorScore({
    category: input.category,
    investors: input.anchorInvestors ?? [],
    issueSizeCr: input.issueSizeCr,
    priceBandHigh: input.issuePrice,
    summary: input.anchorSummary,
  });
  const anchorPoints = clampScore(Math.round(anchorAnalysis.anchor_quality_score / 10), 0, 10);
  const risk = riskRaw(input, MAINBOARD_WEIGHTS.riskAndGovernance);
  const objects = objectsRaw(input.objectsOfIssue);

  return [
    item("fundamentals", "Fundamentals", fundamentals.points, MAINBOARD_WEIGHTS.fundamentals, fundamentals.reason, fundamentals.confidence),
    item("subscriptionDemand", "Subscription Demand", subscription.points, MAINBOARD_WEIGHTS.subscriptionDemand, subscription.reason, subscription.confidence),
    item("valuationComfort", "Valuation Comfort", valuation.points, MAINBOARD_WEIGHTS.valuationComfort, valuation.reason, valuation.confidence),
    item("gmpMomentum", "GMP Momentum", gmp.points, MAINBOARD_WEIGHTS.gmpMomentum, gmp.reason, gmp.confidence),
    item("anchorInvestorQuality", "Anchor Investor Quality", anchorPoints, MAINBOARD_WEIGHTS.anchorInvestorQuality, anchorAnalysis.interpretation, input.anchorSummary || input.anchorInvestors?.length ? "Medium" : "Low"),
    item("riskAndGovernance", "Risk / Governance", risk.points, MAINBOARD_WEIGHTS.riskAndGovernance, risk.reason, risk.confidence),
    item("objectsOfIssue", "Objects of Issue", objects.points, MAINBOARD_WEIGHTS.objectsOfIssue, objects.reason, objects.confidence),
  ];
}

export function item(
  key: string,
  label: string,
  pointsEarned: number,
  maxPoints: number,
  reason: string,
  dataConfidence: ScoreBreakdownItem["dataConfidence"],
): ScoreBreakdownItem {
  return {
    dataConfidence,
    key,
    label,
    maxPoints,
    pointsEarned: Number(clampScore(pointsEarned, 0, maxPoints).toFixed(1)),
    reason,
    status: status(pointsEarned, maxPoints),
    weight: maxPoints,
  };
}
