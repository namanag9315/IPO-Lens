import type { ReactNode } from "react";

export default function IPOPlainEnglishSummary({
  children,
  facts,
  missingFields,
  title,
}: {
  children: ReactNode;
  facts: Array<{ label: string; value: string }>;
  missingFields: string[];
  title: string;
}) {
  return (
    <section className="analysis-section" id="plain-english">
      <div className="analysis-card plain-english-card">
        <div>
          <span className="analysis-badge navy">Simple View</span>
          <h2>{title}</h2>
          <p>{children}</p>
        </div>
        <div className="plain-fact-grid">
          {facts.map((fact) => (
            <div key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
        {missingFields.length > 0 ? (
          <div className="plain-missing-note">
            <strong>Important data still missing</strong>
            <span>{missingFields.slice(0, 6).join(", ")}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
