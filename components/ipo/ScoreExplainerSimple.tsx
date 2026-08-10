import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { IPODataCompleteness } from "@/lib/ipo-data/calculateDataCompleteness";
import type { ScoreBreakdownItem } from "@/lib/scoring/scoreTypes";

function plainReason(item: ScoreBreakdownItem, isSME: boolean) {
  switch (item.key) {
    case "fundamentals":
      return item.pointsEarned / item.maxPoints >= 0.6 ? "Financial growth and profitability are supporting the score." : "Financial quality is not strong enough or data is incomplete.";
    case "subscriptionDemand":
      return item.pointsEarned / item.maxPoints >= 0.5 ? "Demand is visible from subscription data." : "Subscription demand is still weak or incomplete.";
    case "valuationComfort":
      return item.pointsEarned / item.maxPoints >= 0.6 ? "Valuation looks more comfortable based on available data." : "Valuation comparison is incomplete or demanding.";
    case "gmpMomentum":
      return item.pointsEarned / item.maxPoints >= 0.5 ? "GMP sentiment is positive, but it is unofficial." : "GMP sentiment is weak, unavailable, or not a reliable support.";
    case "leadManagerTrackRecord":
      return isSME ? "Lead manager track record matters for SME IPOs and is included in the SME score." : item.reason;
    case "marketMakerLiquidity":
      return "Market maker details affect SME liquidity confidence.";
    case "anchorInvestorQuality":
      return "Anchor investor quality is a confidence signal for mainboard IPOs.";
    case "objectsOfIssue":
      return item.pointsEarned / item.maxPoints >= 0.5 ? "Use of proceeds is partly visible." : "Objects of issue are missing or not clear enough.";
    default:
      return item.reason;
  }
}

export default function ScoreExplainerSimple({
  completeness,
  isSME,
  scoreBreakdown,
}: {
  completeness: IPODataCompleteness;
  isSME: boolean;
  scoreBreakdown: ScoreBreakdownItem[];
}) {
  const usefulItems = scoreBreakdown
    .filter((item) => ["fundamentals", "subscriptionDemand", "valuationComfort", "gmpMomentum", "leadManagerTrackRecord", "marketMakerLiquidity", "anchorInvestorQuality", "objectsOfIssue"].includes(item.key))
    .slice(0, isSME ? 7 : 6);

  return (
    <div className="simple-score-explainer">
      <div>
        <span className={`analysis-badge ${completeness.completenessPercent < 60 ? "amber" : "green"}`}>
          Data completeness {completeness.completenessPercent}%
        </span>
        <h3>Why this score?</h3>
      </div>
      <div className="simple-reason-list">
        {usefulItems.map((item) => (
          <div className={item.status} key={item.key}>
            {item.status === "positive" ? <CheckCircle2 size={16} /> : item.status === "negative" ? <AlertTriangle size={16} /> : <Info size={16} />}
            <span>{plainReason(item, isSME)}</span>
          </div>
        ))}
      </div>
      {completeness.missingCriticalFields.length > 0 ? (
        <p className="simple-score-note">
          Missing data: {completeness.missingCriticalFields.slice(0, 5).join(", ")}. This lowers confidence in the score.
        </p>
      ) : null}
    </div>
  );
}
