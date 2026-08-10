import { deterministicResearchMemo } from "./deterministicResearchMemo";
import { estimateRetailAllotmentChance } from "@/lib/allotment/estimateRetailAllotmentChance";
import type { AnalysisInput } from "@/lib/groq";
import type { AIResearchSummary } from "@/types/ipo";
import { isSMECategory } from "@/lib/ipoCategory";

export function generateDeterministicIPOSummary(input: AnalysisInput): AIResearchSummary {
  const isSME = isSMECategory(input.ipo.category);
  const latestSubscription = input.subscriptionHistory[0] ?? null;
  const retailX = latestSubscription?.retail_x ?? null;
  const allotmentChance = estimateRetailAllotmentChance(retailX);

  const hasPeers = input.peers.length > 0;
  const hasFinancials = input.financials.length > 0;

  const gmpVal = input.gmpHistory[0]?.gmp_value ?? 0;

  const positives = [];
  const cautions = [];

  if (hasFinancials) {
    positives.push("Financial history is available for trend review.");
  } else {
    cautions.push("Financial history is missing.");
  }

  if (gmpVal > 0) {
    positives.push("GMP indicates positive unofficial market sentiment.");
  } else if (gmpVal < 0) {
    cautions.push("GMP indicates negative unofficial market sentiment.");
  }

  if (retailX !== null && retailX > 10) {
    positives.push("High retail demand observed.");
    cautions.push("High retail subscription makes allotment chance very low.");
  } else if (retailX !== null && retailX < 1) {
    cautions.push("Retail subscription is currently under-subscribed.");
  }

  const businessSummary = input.companyProfile?.company_overview ||
                          input.companyProfile?.business_model ||
                          `${input.ipo.name} business details are being verified from source documents.`;

  const valuationSummary = hasPeers ?
                           "Peer comparison data is available to evaluate the issue pricing." :
                           "Peer comparison data is not available, making valuation harder to judge.";

  const demandSummary = latestSubscription ?
                        `Current total subscription is ${latestSubscription.total_x}x, with retail at ${retailX}x.` :
                        "Subscription data is not yet available for this IPO.";

  const gmpSummary = input.gmpHistory.length > 0 ?
                     `The latest unofficial GMP is ₹${gmpVal}. Note that GMP is not a guaranteed listing premium.` :
                     "GMP history is not currently available for this IPO.";

  const smeSummary = isSME ? "This is an SME IPO, which typically carries higher liquidity and volatility risks." : undefined;

  return deterministicResearchMemo({
    allotmentChanceLabel: allotmentChance.label,
    allotmentChancePercent: allotmentChance.chancePercent,
    businessSummary,
    cautions,
    dataQualityNote: "This summary uses only structured deterministic data. Missing fields reduce confidence.",
    demandSummary,
    gmpSummary,
    isSME,
    positives,
    smeSummary,
    valuationSummary
  });
}
