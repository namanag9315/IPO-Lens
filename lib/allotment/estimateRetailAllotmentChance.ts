import type { AllotmentChanceEstimate, AllotmentChanceLabel } from "@/lib/allotment/types";

function displayLabel(label: AllotmentChanceLabel) {
  switch (label) {
    case "HIGH":
      return "High chance";
    case "MODERATE":
      return "Moderate chance";
    case "LOW":
      return "Low chance";
    case "VERY_LOW":
      return "Very low chance";
    case "LOTTERY_LIKE":
      return "Lottery-like chance";
    default:
      return "Not available";
  }
}

function labelForChance(chancePercent: number): AllotmentChanceLabel {
  if (chancePercent >= 50) {
    return "HIGH";
  }

  if (chancePercent >= 25) {
    return "MODERATE";
  }

  if (chancePercent >= 10) {
    return "LOW";
  }

  if (chancePercent >= 3) {
    return "VERY_LOW";
  }

  return "LOTTERY_LIKE";
}

export function estimateRetailAllotmentChance(retailSubscription: number | null | undefined): AllotmentChanceEstimate {
  if (!retailSubscription || retailSubscription <= 0) {
    return {
      chancePercent: null,
      displayLabel: displayLabel("NOT_AVAILABLE"),
      explanation: "Retail subscription data is not available yet.",
      label: "NOT_AVAILABLE",
      retailSubscription: retailSubscription ?? null,
    };
  }

  if (retailSubscription <= 1) {
    return {
      chancePercent: 100,
      displayLabel: displayLabel("HIGH"),
      explanation: "Retail portion is not oversubscribed yet. Valid applications may have a high chance of allotment.",
      label: "HIGH",
      retailSubscription,
    };
  }

  const chancePercent = Number(Math.max(1, Math.min(100, 100 / retailSubscription)).toFixed(1));
  const label = labelForChance(chancePercent);

  return {
    chancePercent,
    displayLabel: displayLabel(label),
    explanation: `Estimated chance is based on ${retailSubscription.toFixed(1)}x retail subscription. Final allotment depends on valid applications, cancellations, category-wise demand and basis of allotment.`,
    label,
    retailSubscription,
  };
}
