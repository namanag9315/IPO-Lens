export function estimateAllotmentChance(retailX: number): {
  pct: number;
  label: string;
  color: string;
  tip: string;
} {
  if (!Number.isFinite(retailX) || retailX <= 0) {
    return {
      color: "amber",
      label: "Data pending",
      pct: 0,
      tip: "Retail subscription data is not available yet.",
    };
  }

  const pct = Math.min(100, Number((100 / retailX).toFixed(1)));

  if (pct >= 50) {
    return {
      color: "green",
      label: "High chance",
      pct,
      tip: "Most retail applicants may get allotment if applications are valid.",
    };
  }

  if (pct >= 20) {
    return {
      color: "amber",
      label: "Moderate chance",
      pct,
      tip: "A few valid family demat accounts can improve odds, without guaranteeing allotment.",
    };
  }

  if (pct >= 10) {
    return {
      color: "red",
      label: "Low chance (~1 in 10)",
      pct,
      tip: "Retail demand is high, so allotment may be difficult.",
    };
  }

  return {
    color: "red",
    label: "Very low - lottery odds",
    pct,
    tip: "High retail subscription means many valid applications compete for limited shares.",
  };
}
