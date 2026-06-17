import { calculateAnchorInvestorScore } from "@/lib/anchorInvestorScoring";
import type { IPOAnchorInvestor, IPOAnchorSummary, IPOCategory } from "@/types/ipo";

interface AnchorInvestorSummaryProps {
  investors: IPOAnchorInvestor[];
  summary?: IPOAnchorSummary | null;
  issueSizeCr?: number | null;
  priceBandHigh?: number | null;
  category?: IPOCategory | null;
}

function money(value: number | null | undefined) {
  return value === null || value === undefined ? "NA" : `₹${value.toFixed(value % 1 === 0 ? 0 : 1)}Cr`;
}

function pct(value: number | null | undefined) {
  return value === null || value === undefined ? "NA" : `${value.toFixed(1)}%`;
}

function qualityColor(score: number) {
  if (score >= 80) {
    return "var(--green)";
  }

  if (score >= 65) {
    return "var(--blue)";
  }

  if (score >= 45) {
    return "var(--amber)";
  }

  return "var(--red)";
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card market-card">
      <div className="label">{label}</div>
      <div className="value mono" style={{ color: color ?? "var(--ink)" }}>
        {value}
      </div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

function SignalList({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "risk" }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="subpanel">
      <h3>{title}</h3>
      <ul style={{ color: "var(--text)", display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li
            key={item}
            style={{
              borderLeft: `3px solid ${tone === "positive" ? "var(--green)" : "var(--red)"}`,
              color: "var(--text)",
              fontSize: 13,
              lineHeight: 1.55,
              paddingLeft: 10,
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnchorInvestorSummary({ investors, summary, issueSizeCr, priceBandHigh, category }: AnchorInvestorSummaryProps) {
  const result = calculateAnchorInvestorScore({
    investors,
    summary,
    issueSizeCr,
    priceBandHigh,
    category,
  });
  const color = qualityColor(result.anchor_quality_score);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="market-cards">
        <MetricCard label="Anchor Book Size" value={money(result.anchor_book_size_cr)} sub="Total anchor allocation" />
        <MetricCard label="Anchor Investors" value={String(result.number_of_anchor_investors)} sub="Institution count" />
        <MetricCard label="Domestic MF Share" value={pct(result.domestic_mf_share_pct)} sub="Mutual fund allocation" />
        <MetricCard label="FPI Share" value={pct(result.fpi_share_pct)} sub="Foreign portfolio investors" />
        <MetricCard label="Top Concentration" value={pct(result.top_investor_concentration_pct)} sub="Lower is better" />
        <MetricCard label="Anchor Quality" value={String(result.anchor_quality_score)} sub={result.interpretation} color={color} />
      </div>

      <div
        className="card"
        style={{
          background: "var(--amber-soft)",
          borderColor: "#fde68a",
          color: "var(--amber)",
          fontSize: 13,
          lineHeight: 1.6,
          padding: 14,
        }}
      >
        Anchor investment is a confidence signal, not a guarantee of listing gain.
      </div>

      <div className="subgrid">
        <SignalList items={result.positive_signals} title="Positive anchor signals" tone="positive" />
        <SignalList items={result.risk_signals} title="Anchor risk signals" tone="risk" />
      </div>
    </div>
  );
}
