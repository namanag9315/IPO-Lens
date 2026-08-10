import type { LeadManagerHistoryInput, LeadManagerScoreOutput } from "@/lib/lead-managers/types";

function cleanNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function average(values: Array<number | null | undefined>) {
  const cleaned = values.map(cleanNumber).filter((value): value is number => value !== null);
  if (cleaned.length === 0) return null;
  return cleaned.reduce((sum, value) => sum + value, 0) / cleaned.length;
}

function median(values: Array<number | null | undefined>) {
  const cleaned = values
    .map(cleanNumber)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (cleaned.length === 0) return null;
  const mid = Math.floor(cleaned.length / 2);
  return cleaned.length % 2 ? cleaned[mid] : (cleaned[mid - 1] + cleaned[mid]) / 2;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function oneDecimal(value: number | null) {
  return value === null ? null : Number(value.toFixed(1));
}

function scoreExperience(count: number) {
  if (count === 0) return 0;
  if (count <= 3) return 5;
  if (count <= 8) return 10;
  return 15;
}

function scorePositiveListingRate(value: number | null) {
  if (value === null) return 0;
  if (value >= 80) return 20;
  if (value >= 60) return 15;
  if (value >= 40) return 10;
  if (value >= 20) return 5;
  return 0;
}

function scoreMedianListingGain(value: number | null) {
  if (value === null) return 0;
  if (value >= 25) return 15;
  if (value >= 15) return 12;
  if (value >= 5) return 8;
  if (value >= 0) return 4;
  return 0;
}

function scoreAverageListingGain(value: number | null) {
  if (value === null) return 0;
  if (value >= 25) return 10;
  if (value >= 15) return 8;
  if (value >= 5) return 5;
  if (value >= 0) return 3;
  return 0;
}

function scoreReturn(value: number | null, maxPoints: number) {
  if (value === null) return maxPoints / 2;
  if (value >= 20) return maxPoints;
  if (value >= 10) return maxPoints * 0.8;
  if (value >= 0) return maxPoints * 0.55;
  if (value >= -10) return maxPoints * 0.25;
  return 0;
}

function scoreSubscription(value: number | null) {
  if (value === null) return 5;
  if (value >= 30) return 10;
  if (value >= 15) return 8;
  if (value >= 5) return 6;
  if (value >= 1) return 4;
  return 2;
}

function scoreLiquidity(value: number | null) {
  if (value === null) return 5;
  if (value >= 75) return 10;
  if (value >= 55) return 7;
  if (value >= 35) return 4;
  return 2;
}

function labelForScore(score: number, count: number): LeadManagerScoreOutput["label"] {
  if (count < 2) return "Insufficient history";
  if (score >= 75) return "Strong track record";
  if (score >= 55) return "Mixed-positive record";
  if (score >= 35) return "Mixed/limited record";
  return "Weak record";
}

export function calculateLeadManagerScore(
  history: LeadManagerHistoryInput[],
  options: { complianceFlagCount?: number | null; liquidityQualityScore?: number | null } = {},
): LeadManagerScoreOutput {
  const validHistory = history.filter((row) => row.ipoName.trim().length > 0);
  const listingReturns = validHistory.map((row) => cleanNumber(row.listingGainPercent)).filter((value): value is number => value !== null);
  const day30Returns = validHistory.map((row) => cleanNumber(row.day30ReturnPercent)).filter((value): value is number => value !== null);
  const day90Returns = validHistory.map((row) => cleanNumber(row.day90ReturnPercent)).filter((value): value is number => value !== null);
  const subscriptionValues = validHistory.map((row) => cleanNumber(row.totalSubscription)).filter((value): value is number => value !== null);

  const totalIposManaged = validHistory.length;
  const positiveListingCount = listingReturns.filter((value) => value > 0).length;
  const flatListingCount = listingReturns.filter((value) => value === 0).length;
  const negativeListingCount = listingReturns.filter((value) => value < 0).length;
  const severeNegativeCount = listingReturns.filter((value) => value <= -20).length;
  const positiveListingPercent = listingReturns.length ? positiveListingCount / listingReturns.length * 100 : null;
  const nonNegativeListingPercent = listingReturns.length ? (positiveListingCount + flatListingCount) / listingReturns.length * 100 : null;
  const averageListingGainPercent = average(listingReturns);
  const medianListingGainPercent = median(listingReturns);
  const average30DayReturnPercent = average(day30Returns);
  const median30DayReturnPercent = median(day30Returns);
  const average90DayReturnPercent = average(day90Returns);
  const median90DayReturnPercent = median(day90Returns);
  const averageSubscription = average(subscriptionValues);
  const medianSubscription = median(subscriptionValues);
  const liquidityQualityScore = cleanNumber(options.liquidityQualityScore);
  const complianceFlagCount = Math.max(0, options.complianceFlagCount ?? 0);

  const warnings: string[] = [];
  const reasons: string[] = [];

  let score = 0;
  score += scoreExperience(totalIposManaged);
  score += scorePositiveListingRate(positiveListingPercent);
  score += scoreMedianListingGain(medianListingGainPercent);
  score += scoreAverageListingGain(averageListingGainPercent);

  if (day30Returns.length === 0) warnings.push("Post-listing 30-day survival data is missing, so score confidence is lower.");
  if (day90Returns.length === 0) warnings.push("Post-listing 90-day survival data is missing, so score confidence is lower.");
  if (subscriptionValues.length === 0) warnings.push("Subscription quality data is missing, so a neutral score is used for demand history.");
  if (liquidityQualityScore === null) warnings.push("Liquidity quality data is missing, so a neutral score is used for liquidity support.");

  score += scoreReturn(median30DayReturnPercent, 10);
  score += scoreReturn(median90DayReturnPercent, 10);
  score += scoreSubscription(medianSubscription ?? averageSubscription);
  score += scoreLiquidity(liquidityQualityScore);

  const severePenalty = Math.min(severeNegativeCount * 3, 10);
  const compliancePenalty = Math.min(complianceFlagCount * 5, 15);
  score -= severePenalty + compliancePenalty;

  if (totalIposManaged > 0) reasons.push(`${totalIposManaged} tracked SME IPO${totalIposManaged === 1 ? "" : "s"} handled.`);
  if (positiveListingPercent !== null) reasons.push(`${oneDecimal(positiveListingPercent)}% listed above issue price.`);
  if (medianListingGainPercent !== null) reasons.push(`Median listing gain is ${oneDecimal(medianListingGainPercent)}%.`);
  if (severeNegativeCount > 0) reasons.push(`${severeNegativeCount} severe negative listing${severeNegativeCount === 1 ? "" : "s"} found.`);

  const finalScore = Number(clamp(score).toFixed(1));
  const missingSurvivalData = day30Returns.length === 0 || day90Returns.length === 0;
  const missingCoreData = listingReturns.length === 0 || totalIposManaged < 2;
  const dataConfidence = missingCoreData ? "Low" : missingSurvivalData || warnings.length >= 2 ? "Medium" : "High";

  return {
    average30DayReturnPercent: oneDecimal(average30DayReturnPercent),
    average90DayReturnPercent: oneDecimal(average90DayReturnPercent),
    averageListingGainPercent: oneDecimal(averageListingGainPercent),
    averageSubscription: oneDecimal(averageSubscription),
    dataConfidence,
    finalScore,
    flatListingCount,
    label: labelForScore(finalScore, totalIposManaged),
    median30DayReturnPercent: oneDecimal(median30DayReturnPercent),
    median90DayReturnPercent: oneDecimal(median90DayReturnPercent),
    medianListingGainPercent: oneDecimal(medianListingGainPercent),
    medianSubscription: oneDecimal(medianSubscription),
    negativeListingCount,
    nonNegativeListingPercent: oneDecimal(nonNegativeListingPercent),
    positiveListingCount,
    positiveListingPercent: oneDecimal(positiveListingPercent),
    reasons,
    severeNegativeCount,
    totalIposManaged,
    warnings,
  };
}
