import { calculateLeadManagerScore } from "@/lib/lead-managers/calculateLeadManagerScore";
import {
  fundamentalsRaw,
  gmpRaw,
  item,
  objectsRaw,
  riskRaw,
  scalePoints,
  subscriptionRaw,
  valuationRaw,
} from "@/lib/scoring/mainboardScore";
import type { DetailedScoringInput, ScoreBreakdownItem } from "@/lib/scoring/scoreTypes";
import { SME_WEIGHTS } from "@/lib/scoring/scoreTypes";

function leadManagerItem(input: DetailedScoringInput): ScoreBreakdownItem {
  const managerName = input.leadManagers?.find((manager) => manager.is_primary)?.lead_manager?.name ?? input.leadManagers?.[0]?.lead_manager?.name;
  const primaryLeadManagerId = input.leadManagers?.find((manager) => manager.is_primary)?.lead_manager_id ?? input.leadManagers?.[0]?.lead_manager_id;
  const latestScore =
    input.leadManagerScores?.find((score) => score.lead_manager_id === primaryLeadManagerId) ?? input.leadManagerScores?.[0] ?? null;
  const leadManagerExists = Boolean(input.leadManagers?.length);
  const relevantHistory = primaryLeadManagerId
    ? (input.leadManagerHistory ?? []).filter((row) => row.lead_manager_id === primaryLeadManagerId)
    : input.leadManagerHistory ?? [];
  const calculatedFromHistory =
    !latestScore && relevantHistory.length
      ? calculateLeadManagerScore(
          relevantHistory.map((row) => ({
            day30ReturnPercent: row.day_30_return_percent,
            day90ReturnPercent: row.day_90_return_percent,
            ipoName: row.ipo_name,
            listingGainPercent: row.listing_gain_percent,
            totalSubscription: row.total_subscription,
          })),
        )
      : null;
  const trackRecordScore = latestScore?.final_track_record_score ?? calculatedFromHistory?.finalScore ?? null;
  const totalIpos = latestScore?.total_ipos_managed ?? calculatedFromHistory?.totalIposManaged ?? relevantHistory.length;
  const positiveListingPercent = latestScore?.positive_listing_percent ?? calculatedFromHistory?.positiveListingPercent ?? null;
  const medianListingGain = latestScore?.median_listing_gain_percent ?? calculatedFromHistory?.medianListingGainPercent ?? null;
  const severeNegatives = latestScore?.severe_negative_count ?? calculatedFromHistory?.severeNegativeCount ?? 0;

  if (!leadManagerExists) {
    return item(
      "leadManagerTrackRecord",
      "Lead Manager Track Record",
      7,
      SME_WEIGHTS.leadManagerTrackRecord,
      "Lead manager data is missing, so SME score is conservative.",
      "Low",
    );
  }

  if (trackRecordScore === null || trackRecordScore === undefined || totalIpos < 2) {
    return item(
      "leadManagerTrackRecord",
      "Lead Manager Track Record",
      9,
      SME_WEIGHTS.leadManagerTrackRecord,
      `${managerName ?? "Lead manager"} is linked, but verified history is limited. Score uses neutral weighting and lower confidence.`,
      "Low",
    );
  }

  const points = trackRecordScore / 100 * SME_WEIGHTS.leadManagerTrackRecord;
  const reasonParts = [
    `${managerName ?? "Lead manager"} track record score is ${trackRecordScore.toFixed(1)}/100`,
    `${totalIpos} tracked IPO${totalIpos === 1 ? "" : "s"}`,
    positiveListingPercent !== null ? `${positiveListingPercent.toFixed(1)}% positive listing rate` : null,
    medianListingGain !== null ? `${medianListingGain.toFixed(1)}% median listing gain` : null,
    severeNegatives > 0 ? `${severeNegatives} severe negative listing${severeNegatives === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return item(
    "leadManagerTrackRecord",
    "Lead Manager Track Record",
    points,
    SME_WEIGHTS.leadManagerTrackRecord,
    reasonParts.join(", ") + ".",
    latestScore ? "Medium" : calculatedFromHistory?.dataConfidence ?? "Medium",
  );
}

function marketMakerItem(input: DetailedScoringInput): ScoreBreakdownItem {
  const link = input.marketMakers?.[0];
  const maker = link?.market_maker;
  const verifiedDetails = Boolean(link?.obligation_details || link?.liquidity_support_period || link?.source_url || maker?.source_url);
  const points = maker ? (verifiedDetails ? 7 : 5) : 3;

  return item(
    "marketMakerLiquidity",
    "Market Maker / Liquidity Support",
    points,
    SME_WEIGHTS.marketMakerLiquidity,
    maker
      ? `${maker.name} is linked as market maker${verifiedDetails ? " with source-backed liquidity support details" : ", but historical liquidity quality is still limited"}.`
      : "Market maker details are missing. SME liquidity score uses conservative weighting.",
    maker && verifiedDetails ? "Medium" : "Low",
  );
}

export function smeScoreItems(input: DetailedScoringInput): ScoreBreakdownItem[] {
  const fundamentals = fundamentalsRaw(input.financials);
  const subscription = subscriptionRaw(input.totalX, input.qibX, input.retailX);
  const valuation = valuationRaw(input.issuePrice, input.financials, input.peers);
  const gmp = gmpRaw(input.gmp, input.issuePrice);
  const risk = riskRaw(input, SME_WEIGHTS.riskAndGovernance);
  const objects = objectsRaw(input.objectsOfIssue);

  return [
    item("fundamentals", "Fundamentals", scalePoints(fundamentals.points, 25, SME_WEIGHTS.fundamentals), SME_WEIGHTS.fundamentals, fundamentals.reason, fundamentals.confidence),
    item("subscriptionDemand", "Subscription Demand", scalePoints(subscription.points, 20, SME_WEIGHTS.subscriptionDemand), SME_WEIGHTS.subscriptionDemand, subscription.reason, subscription.confidence),
    item("valuationComfort", "Valuation Comfort", scalePoints(valuation.points, 15, SME_WEIGHTS.valuationComfort), SME_WEIGHTS.valuationComfort, valuation.reason, valuation.confidence),
    item("gmpMomentum", "GMP Momentum", scalePoints(gmp.points, 15, SME_WEIGHTS.gmpMomentum), SME_WEIGHTS.gmpMomentum, gmp.reason, gmp.confidence),
    leadManagerItem(input),
    marketMakerItem(input),
    item("riskAndGovernance", "Risk / Governance", risk.points, SME_WEIGHTS.riskAndGovernance, risk.reason, risk.confidence),
    item("objectsOfIssue", "Objects of Issue", objects.points, SME_WEIGHTS.objectsOfIssue, objects.reason, objects.confidence),
  ];
}
