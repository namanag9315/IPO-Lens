"use client";

export interface LeadManagerHistoryRow {
  id: string;
  ipo_name: string;
  listing_gain_percent: number | null;
  day_30_return_percent: number | null;
  source_url: string | null;
}

export interface LeadManagerView {
  name: string;
  website?: string | null;
  sourceUrl?: string | null;
  totalIposManaged?: number | null;
  positiveListingPercent?: number | null;
  above30DayPercent?: number | null;
  score?: number | null;
  history?: LeadManagerHistoryRow[];
}

function pct(value: number | null | undefined) {
  return value === null || value === undefined ? "Being verified" : `${value.toFixed(1)}%`;
}

function resultTone(value: number | null | undefined) {
  if (value === null || value === undefined) return "slate";
  if (value > 0) return "green";
  if (value <= -20) return "red";
  return "amber";
}

export default function LeadManagerSection({
  category,
  leadManager,
}: {
  leadManager: LeadManagerView | null;
  category: string | null;
}) {
  if (category !== "sme") {
    return (
      <div className="analysis-empty-state">
        Lead manager track record is most important for SME IPOs. For mainboard IPOs, anchor book quality and institutional demand usually carry more weight.
      </div>
    );
  }

  if (!leadManager) {
    return (
      <div className="analysis-warning-state">
        <strong>Lead manager track record is not linked yet.</strong>
        <p>
          This matters for SME IPOs because the merchant banker&apos;s past listings can reveal pricing quality, liquidity history and post-listing risk. IPO Lens scores this conservatively until verified.
        </p>
        <div className="analysis-example-table">
          <span>Example table after import</span>
          <div>IPO name | Listing gain | 30-day return | Result</div>
        </div>
      </div>
    );
  }

  const rows = leadManager.history?.slice(0, 6) ?? [];

  return (
    <div className="analysis-lead-manager-module">
      <div className="analysis-lead-manager-head">
        <div>
          <span className="analysis-eyebrow">Merchant banker</span>
          <h3>{leadManager.name}</h3>
          <p>
            {leadManager.totalIposManaged ?? rows.length} tracked IPOs. Positive listing rate {pct(leadManager.positiveListingPercent)}.
          </p>
        </div>
        <strong className="mono">{leadManager.score !== null && leadManager.score !== undefined ? `${leadManager.score.toFixed(0)}/100` : "Score pending"}</strong>
      </div>

      <div className="analysis-lead-stats">
        <div><span>Positive listing rate</span><b className="mono">{pct(leadManager.positiveListingPercent)}</b></div>
        <div><span>Above issue after 30 days</span><b className="mono">{pct(leadManager.above30DayPercent)}</b></div>
        <div><span>Track record score</span><b className="mono">{leadManager.score !== null && leadManager.score !== undefined ? `${leadManager.score.toFixed(0)}/100` : "Being verified"}</b></div>
      </div>

      {rows.length > 0 ? (
        <div className="analysis-table-wrap">
          <table className="analysis-table">
            <thead>
              <tr>
                <th>IPO name</th>
                <th>Listing gain</th>
                <th>30-day return</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.ipo_name}</td>
                  <td className="mono">{pct(row.listing_gain_percent)}</td>
                  <td className="mono">{pct(row.day_30_return_percent)}</td>
                  <td><span className={`analysis-badge ${resultTone(row.listing_gain_percent)}`}>{row.listing_gain_percent === null ? "Pending" : row.listing_gain_percent > 0 ? "Positive" : row.listing_gain_percent <= -20 ? "Severe negative" : "Watch"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="analysis-empty-state">Lead manager profile is linked, but historical IPO rows are still being imported.</div>
      )}
    </div>
  );
}
