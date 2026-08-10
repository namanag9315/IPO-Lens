"use client";

export interface Risk {
  title: string;
  severity: "HIGH" | "MEDIUM" | "WATCH";
  description: string;
}

export default function RiskSection({ risks }: { risks: Risk[] }) {
  if (risks.length === 0) {
    return <div className="analysis-empty-state">No specific risk flags are available yet. Read the RHP before forming a view.</div>;
  }

  return (
    <div className="analysis-risk-list">
      {risks.map((risk) => (
        <div className={`analysis-risk-item ${risk.severity.toLowerCase()}`} key={`${risk.severity}-${risk.title}`}>
          <span>{risk.severity}</span>
          <div>
            <strong>{risk.title}</strong>
            <p>{risk.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
