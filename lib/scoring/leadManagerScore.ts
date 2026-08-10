export interface LeadManagerTrackRecordInput {
  average30DayReturnPercent?: number | null;
  average90DayReturnPercent?: number | null;
  averageSubscription?: number | null;
  complianceFlagCount?: number | null;
  liquidityQualityScore?: number | null;
  median30DayReturnPercent?: number | null;
  median90DayReturnPercent?: number | null;
  medianListingGainPercent?: number | null;
  positiveListingPercent?: number | null;
  severeNegativeCount?: number | null;
  totalIposManaged?: number | null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function scorePositivePercent(value: number | null | undefined, maxPoints: number) {
  if (value === null || value === undefined) return maxPoints * 0.5;
  return clamp(value, 0, 100) / 100 * maxPoints;
}

function scoreReturn(value: number | null | undefined, maxPoints: number) {
  if (value === null || value === undefined) return maxPoints * 0.5;
  if (value >= 50) return maxPoints;
  if (value >= 25) return maxPoints * 0.85;
  if (value >= 10) return maxPoints * 0.7;
  if (value >= 0) return maxPoints * 0.5;
  if (value >= -15) return maxPoints * 0.25;
  return 0;
}

function scoreExperience(count: number | null | undefined) {
  if (count === null || count === undefined) return 7.5;
  if (count >= 20) return 15;
  if (count >= 12) return 12;
  if (count >= 6) return 9;
  if (count >= 2) return 6;
  return 3;
}

function scoreSubscription(value: number | null | undefined) {
  if (value === null || value === undefined) return 5;
  if (value >= 20) return 10;
  if (value >= 10) return 8;
  if (value >= 3) return 6;
  if (value >= 1) return 4;
  return 2;
}

export function calculateLeadManagerTrackRecordScore(input: LeadManagerTrackRecordInput) {
  let score = 0;

  score += scoreExperience(input.totalIposManaged);
  score += scorePositivePercent(input.positiveListingPercent, 20);
  score += scoreReturn(input.medianListingGainPercent, 15);
  score += scoreReturn(input.median30DayReturnPercent ?? input.average30DayReturnPercent, 15);
  score += scoreReturn(input.median90DayReturnPercent ?? input.average90DayReturnPercent, 10);
  score += scoreSubscription(input.averageSubscription);
  score += scorePositivePercent(input.liquidityQualityScore, 10);

  const compliancePenalty = Math.min(input.complianceFlagCount ?? 0, 3) * 5;
  const severeNegativePenalty = Math.min(input.severeNegativeCount ?? 0, 2) * 5;

  score -= compliancePenalty;
  score -= severeNegativePenalty;

  return Number(clamp(score).toFixed(1));
}

export function leadManagerScoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return "Insufficient history";
  if (score >= 75) return "Strong track record";
  if (score >= 55) return "Mixed-positive record";
  if (score >= 35) return "Mixed/limited record";
  return "Weak record";
}
