import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function PositivesRisksSummary({
  positives,
  risks,
}: {
  positives: string[];
  risks: string[];
}) {
  return (
    <div className="retail-positive-risk-grid">
      <div className="analysis-card retail-list-card positive">
        <h3>What looks good</h3>
        {(positives.length ? positives : ["No clear positive signal is available from structured data yet."]).slice(0, 5).map((item) => (
          <div key={item}>
            <CheckCircle2 size={16} />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="analysis-card retail-list-card caution">
        <h3>What needs caution</h3>
        {(risks.length ? risks : ["Risk details are still being verified. Read source documents before forming a view."]).slice(0, 5).map((item) => (
          <div key={item}>
            <AlertTriangle size={16} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
