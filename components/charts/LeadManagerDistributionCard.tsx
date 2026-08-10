import type { LeadManagerIPOHistory, LeadManagerTrackRecordScore } from "@/types/ipo";

function countFromHistory(history: LeadManagerIPOHistory[]) {
  const returns = history.map((row) => row.listing_gain_percent).filter((value): value is number => value !== null);
  return {
    flat: returns.filter((value) => value === 0).length,
    negative: returns.filter((value) => value < 0).length,
    positive: returns.filter((value) => value > 0).length,
    total: returns.length,
  };
}

export default function LeadManagerDistributionCard({
  history,
  score,
}: {
  history: LeadManagerIPOHistory[];
  score: LeadManagerTrackRecordScore | null;
}) {
  const fallback = countFromHistory(history);
  const positive = score?.positive_listing_count ?? fallback.positive;
  const flat = score?.flat_listing_count ?? fallback.flat;
  const negative = score?.negative_listing_count ?? fallback.negative;
  const total = Math.max(positive + flat + negative, 1);

  return (
    <div className="analysis-card lead-distribution-card">
      <div>
        <span>Success distribution</span>
        <h3>Positive / flat / negative listings</h3>
        <p>Listing-day history is useful, but IPO Lens also lowers confidence when 30/90-day survival data is missing.</p>
      </div>
      <div className="lead-distribution-bar" aria-label="Lead manager success distribution">
        <span className="positive" style={{ width: `${positive / total * 100}%` }} />
        <span className="flat" style={{ width: `${flat / total * 100}%` }} />
        <span className="negative" style={{ width: `${negative / total * 100}%` }} />
      </div>
      <div className="lead-distribution-legend">
        <strong><i className="positive" />{positive} positive</strong>
        <strong><i className="flat" />{flat} flat</strong>
        <strong><i className="negative" />{negative} negative</strong>
      </div>
    </div>
  );
}
