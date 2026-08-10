"use client";

import type { IPOScoreBreakdown } from "@/lib/scoring";

const rows: Array<{ key: keyof IPOScoreBreakdown; label: string; max: number; note: string }> = [
  { key: "gmpScore", label: "GMP Momentum", max: 10, note: "Unofficial sentiment, capped in score" },
  { key: "demandScore", label: "Subscription Demand", max: 15, note: "QIB, NII and total subscription" },
  { key: "financialScore", label: "Financial Quality", max: 20, note: "Growth, margin and return ratios" },
  { key: "valuationScore", label: "Valuation Comfort", max: 15, note: "IPO P/E versus sector/peers" },
  { key: "leadManagerScore", label: "Lead Manager", max: 15, note: "More important for SME IPOs" },
  { key: "marketMakerScore", label: "Market Maker / Liquidity", max: 8, note: "SME liquidity support" },
  { key: "governanceScore", label: "Promoter & Governance", max: 12, note: "Holding, proceeds and governance" },
  { key: "riskAdjustment", label: "Risk Adjustment", max: 7, note: "SME and missing-data deductions" },
];

export default function ScoreBreakdown({
  breakdown,
  currentScore,
  missingData,
  potentialScore,
}: {
  breakdown: IPOScoreBreakdown;
  potentialScore: number;
  currentScore: number;
  missingData?: string[];
}) {
  return (
    <div className="analysis-score-breakdown">
      {rows.map((row) => {
        const raw = breakdown[row.key] ?? 0;
        const value = row.key === "riskAdjustment" ? Math.abs(raw) : raw;
        const pct = Math.min(100, Math.max(0, (value / row.max) * 100));

        return (
          <div className={row.key === "riskAdjustment" ? "analysis-score-row deduction" : "analysis-score-row"} key={row.key}>
            <div>
              <strong>{row.label}</strong>
              <span>{row.note}</span>
            </div>
            <b className="mono">{row.key === "riskAdjustment" ? raw.toFixed(0) : `${value.toFixed(1)}/${row.max}`}</b>
            <i><em style={{ width: `${pct}%` }} /></i>
          </div>
        );
      })}
      {missingData?.length ? (
        <div className="analysis-missing-list">
          {missingData.map((item) => <span key={item}>{item}</span>)}
        </div>
      ) : null}
      <div className="analysis-score-summary-grid">
        <div><span>Current score</span><strong className="mono">{currentScore}/100</strong></div>
        <div><span>Potential after missing data</span><strong className="mono">{potentialScore}/100</strong></div>
      </div>
      <p className="analysis-muted-note">Thresholds: 0-34 weak signal · 35-54 neutral · 55-74 positive · 75-100 strong signal.</p>
    </div>
  );
}
