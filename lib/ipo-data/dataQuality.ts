export type PublicDataConfidence = "high" | "medium" | "low";

type GMPComparable = {
  gmp?: number | null;
};

type SubscriptionComparable = {
  total_times?: number | null;
  totalTimes?: number | null;
};

export function dataConfidence(matchScore: number, hasValue: boolean): PublicDataConfidence {
  if (!hasValue || matchScore < 0.72) {
    return "low";
  }

  if (matchScore >= 0.95) {
    return "high";
  }

  return "medium";
}

export function gmpValuesDifferSignificantly(left: GMPComparable | null | undefined, right: GMPComparable | null | undefined) {
  if (left?.gmp === null || left?.gmp === undefined || right?.gmp === null || right?.gmp === undefined) {
    return false;
  }

  return Math.abs(left.gmp - right.gmp) >= Math.max(10, Math.abs(left.gmp) * 0.2);
}

export function subscriptionValuesDifferSignificantly(
  left: SubscriptionComparable | null | undefined,
  right: SubscriptionComparable | null | undefined,
) {
  const leftTotal = left?.total_times ?? left?.totalTimes;
  const rightTotal = right?.total_times ?? right?.totalTimes;

  if (leftTotal === null || leftTotal === undefined || rightTotal === null || rightTotal === undefined) {
    return false;
  }

  return Math.abs(leftTotal - rightTotal) >= Math.max(1, Math.abs(leftTotal) * 0.2);
}
