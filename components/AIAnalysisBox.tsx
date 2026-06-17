"use client";

import type { AIResearchSummary } from "@/types/ipo";

interface AIAnalysisBoxProps {
  summary: AIResearchSummary | string | null;
  score: number;
  label: string;
  loading: boolean;
  onGenerate: () => void;
}

function defaultAnalysis(summary = "Analysis not yet generated."): AIResearchSummary {
  return {
    summary,
    positives: [],
    negatives: [],
    fundamentalsView: "Fundamentals analysis is not available.",
    valuationView: "Valuation analysis is not available.",
    subscriptionView: "Subscription analysis is not available.",
    gmpView: "GMP analysis is not available.",
    anchorInvestorView: "Anchor investor analysis is not available.",
    objectsOfIssueView: "Objects of issue analysis is not available.",
    retailInvestorView: "Review available data and source documents before deciding.",
    dataQualityNote: "Structured AI fields are not available for this row.",
  };
}

function normalizedSummary(summary: AIResearchSummary | string | null): AIResearchSummary | null {
  if (!summary) {
    return null;
  }

  if (typeof summary !== "string") {
    return {
      ...defaultAnalysis(summary.summary),
      ...summary,
      positives: Array.isArray(summary.positives) ? summary.positives : [],
      negatives: Array.isArray(summary.negatives) ? summary.negatives : [],
    };
  }

  try {
    const parsed = JSON.parse(summary) as Partial<AIResearchSummary>;

    return {
      ...defaultAnalysis(parsed.summary),
      ...parsed,
      summary: parsed.summary ?? "Analysis not yet generated.",
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
      negatives: Array.isArray(parsed.negatives) ? parsed.negatives : [],
    };
  } catch {
    return {
      ...defaultAnalysis(summary),
      dataQualityNote: "Legacy text summary. Structured AI fields are not available for this row.",
    };
  }
}

function scoreClass(label: string) {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export default function AIAnalysisBox({ summary, score, label, loading, onGenerate }: AIAnalysisBoxProps) {
  if (loading) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div className="ai-skeleton-line" style={{ width: "100%" }} />
        <div className="ai-skeleton-line" style={{ width: "85%" }} />
        <div className="ai-skeleton-line" style={{ width: "60%" }} />
      </div>
    );
  }

  const analysis = normalizedSummary(summary);

  if (analysis) {
    return (
      <div>
        <div style={{ alignItems: "center", display: "flex", gap: 10, marginBottom: 12 }}>
          <span className={`badge ${scoreClass(label)}`}>{label}</span>
          <span className="mono" style={{ color: "var(--ink)", fontSize: 13, fontWeight: 900 }}>
            {score}/100
          </span>
        </div>
        <p>{analysis.summary}</p>
        <div className="subgrid" style={{ marginTop: 14 }}>
          <div>
            <h3 style={{ fontSize: 14 }}>Positives</h3>
            <ul style={{ color: "var(--text)", display: "grid", fontSize: 13, gap: 6, lineHeight: 1.5, margin: 0, paddingLeft: 18 }}>
              {(analysis.positives.length ? analysis.positives : ["No clear positives available from structured data."]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: 14 }}>Negatives</h3>
            <ul style={{ color: "var(--text)", display: "grid", fontSize: 13, gap: 6, lineHeight: 1.5, margin: 0, paddingLeft: 18 }}>
              {(analysis.negatives.length ? analysis.negatives : ["No clear negatives available from structured data."]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="metrics" style={{ marginTop: 14 }}>
          <div className="metric">
            <div className="metric-label">Fundamentals View</div>
            <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{analysis.fundamentalsView}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Valuation View</div>
            <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{analysis.valuationView}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Subscription View</div>
            <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{analysis.subscriptionView}</div>
          </div>
          <div className="metric">
            <div className="metric-label">GMP View</div>
            <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{analysis.gmpView}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Anchor View</div>
            <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{analysis.anchorInvestorView}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Objects View</div>
            <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{analysis.objectsOfIssueView}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Retail View</div>
            <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>{analysis.retailInvestorView}</div>
          </div>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>{analysis.dataQualityNote}</p>
        <button
          onClick={onGenerate}
          style={{
            alignItems: "center",
            background: "none",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            gap: 4,
            marginTop: 12,
            padding: 0,
          }}
          type="button"
        >
          Regenerate research summary →
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onGenerate}
        style={{
          alignItems: "center",
          background: "none",
          border: "none",
          color: "var(--ink)",
          cursor: "pointer",
          display: "flex",
          fontSize: 13,
          fontWeight: 800,
          gap: 6,
          padding: 0,
        }}
        type="button"
      >
        Generate AI research summary →
      </button>
      <p className="mono" style={{ color: "var(--muted)", fontSize: 11, marginTop: 4 }}>
        Uses Groq Llama 3.3 · structured data only
      </p>
    </div>
  );
}
