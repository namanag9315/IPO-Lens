"use client";

function displayLabel(label: string) {
  if (/strong apply/i.test(label)) return "Strong signal";
  if (/^apply$/i.test(label)) return "Positive signal";
  if (/avoid/i.test(label)) return "Weak signal";
  return label;
}

function toneForLabel(label: string) {
  if (/strong/i.test(label)) return "green";
  if (/apply|positive/i.test(label)) return "amber";
  if (/avoid|weak/i.test(label)) return "red";
  return "yellow";
}

export default function ScoreBox({
  label,
  missingData,
  score,
}: {
  score: number;
  label: string;
  missingData: string[];
}) {
  const tone = toneForLabel(label);

  return (
    <aside className={`analysis-score-box ${tone}`}>
      <span className="analysis-eyebrow">IPO Lens Score</span>
      <div className="analysis-score-box-main">
        <strong className="mono">{score}</strong>
        <span>/100</span>
      </div>
      <p>{displayLabel(label).toUpperCase()}</p>
      {missingData.length > 0 ? (
        <small>
          Conservative score. Missing: {missingData.slice(0, 2).join(", ")}
          {missingData.length > 2 ? ` +${missingData.length - 2} more` : ""}.
        </small>
      ) : (
        <small>Score uses the currently verified IPO Lens data set.</small>
      )}
    </aside>
  );
}
