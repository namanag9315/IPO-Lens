import { estimateRetailAllotmentChance } from "@/lib/allotment/estimateRetailAllotmentChance";

interface AllotmentProbabilityCardProps {
  compact?: boolean;
  retailSubscription: number | null;
}

function tone(label: string) {
  if (label === "HIGH") {
    return "green";
  }

  if (label === "MODERATE" || label === "LOW" || label === "VERY_LOW") {
    return "amber";
  }

  if (label === "LOTTERY_LIKE") {
    return "red";
  }

  return "slate";
}

export default function AllotmentProbabilityCard({ compact = false, retailSubscription }: AllotmentProbabilityCardProps) {
  const estimate = estimateRetailAllotmentChance(retailSubscription);
  const value = estimate.chancePercent === null ? "NA" : `~${estimate.chancePercent.toFixed(estimate.chancePercent % 1 === 0 ? 0 : 1)}%`;

  return (
    <div className={`premium-card allotment-probability-card ${compact ? "compact" : ""}`}>
      <div>
        <span className="allotment-card-label">Estimated Retail Allotment Chance</span>
        <strong className="mono">{value}</strong>
      </div>
      <span className={`allotment-status-pill ${tone(estimate.label)}`}>{estimate.displayLabel}</span>
      <p>
        {estimate.retailSubscription ? `Based on ${estimate.retailSubscription.toFixed(1)}x retail subscription. ` : ""}
        {estimate.explanation}
      </p>
      {!compact ? (
        <small>
          This is an estimate based on retail subscription data. Final allotment depends on valid applications, cancellations, category-wise demand
          and basis of allotment.
        </small>
      ) : null}
    </div>
  );
}
