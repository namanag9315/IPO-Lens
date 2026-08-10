"use client";

import type { AIResearchSummary } from "@/types/ipo";

interface AIAnalysisBoxProps {
  summary: AIResearchSummary | string | null;
  score: number;
  label: string;
  loading: boolean;
  onGenerate: () => void;
}

function normalizedSummary(summary: AIResearchSummary | string | null): AIResearchSummary | null {
  if (!summary) return null;

  if (typeof summary !== "string") {
    return {
      ...summary,
      negatives: Array.isArray(summary.negatives) ? summary.negatives : [],
      positives: Array.isArray(summary.positives) ? summary.positives : [],
    };
  }

  try {
    const parsed = JSON.parse(summary) as Partial<AIResearchSummary>;

    if (!parsed.summary) return null;

    return {
      anchorInvestorView: parsed.anchorInvestorView ?? "",
      dataQualityNote: parsed.dataQualityNote ?? "Structured AI data quality note is not available.",
      fundamentalsView: parsed.fundamentalsView ?? "",
      gmpView: parsed.gmpView ?? "",
      negatives: Array.isArray(parsed.negatives) ? parsed.negatives.map(String) : [],
      objectsOfIssueView: parsed.objectsOfIssueView ?? "",
      positives: Array.isArray(parsed.positives) ? parsed.positives.map(String) : [],
      retailInvestorView: parsed.retailInvestorView ?? "",
      subscriptionView: parsed.subscriptionView ?? "",
      summary: parsed.summary,
      valuationView: parsed.valuationView ?? "",
      allotmentView: parsed.allotmentView ?? "",
    };
  } catch {
    return {
      anchorInvestorView: "",
      dataQualityNote: "Legacy text summary. Regenerate for structured IPO Lens memo sections.",
      fundamentalsView: "",
      gmpView: "",
      negatives: [],
      objectsOfIssueView: "",
      positives: [],
      retailInvestorView: "Review available data and official source documents before making any decision.",
      subscriptionView: "",
      summary,
      valuationView: "",
      allotmentView: "",
    };
  }
}

function scoreClass(label: string) {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export default function AIAnalysisBox({ summary, score, label, loading, onGenerate }: AIAnalysisBoxProps) {
  if (loading) {
    return (
      <div className="analysis-memo-loading">
        <div className="ai-skeleton-line" style={{ width: "100%" }} />
        <div className="ai-skeleton-line" style={{ width: "82%" }} />
        <div className="ai-skeleton-line" style={{ width: "64%" }} />
      </div>
    );
  }

  const analysis = normalizedSummary(summary);

  if (!analysis) {
    return (
      <div className="analysis-ai-empty">
        <span className="analysis-badge slate">AI memo pending</span>
        <h3>Structured AI research is not available yet.</h3>
        <p>Generate it from the admin panel or use the button below. IPO Lens will use structured data only and will not provide investment advice.</p>
        <button className="ui-button ui-button-primary" onClick={onGenerate} type="button">
          Regenerate research summary
        </button>
      </div>
    );
  }

  const memoSections = [
    ["Demand view", analysis.subscriptionView],
    ["Valuation view", analysis.valuationView],
    ["Allotment view", analysis.allotmentView],
    ["Retail investor view", analysis.retailInvestorView],
  ].filter(([, value]) => value);

  return (
    <div className="analysis-ai-memo">
      <div className="analysis-ai-memo-head">
        <div>
          <span className={`badge ${scoreClass(label)}`}>{label}</span>
          <strong className="mono">{score}/100</strong>
        </div>
        <button className="ui-button ui-button-secondary" onClick={onGenerate} type="button">
          Regenerate research summary
        </button>
      </div>

      <div className="analysis-ai-summary">
        <span>Plain-English Summary</span>
        <p>{analysis.summary}</p>
      </div>

      <div className="analysis-ai-section-grid">
        {memoSections.map(([title, value]) => (
          <div key={title}>
            <span>{title}</span>
            <p>{value}</p>
          </div>
        ))}
      </div>

      <div className="analysis-ai-quality-note">{analysis.dataQualityNote}</div>
    </div>
  );
}
