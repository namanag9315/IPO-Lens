"use client";

import { estimateAllotmentChance } from "@/lib/allotment";

function xLabel(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? "Being verified" : `${value.toFixed(1)}x`;
}

export default function DemandSection({
  nii,
  qib,
  retail,
  total,
}: {
  qib: number;
  nii: number;
  retail: number;
  total: number;
}) {
  const chance = estimateAllotmentChance(retail);

  return (
    <div className="analysis-demand-grid">
      {[
        ["QIB", qib, "Big institutions"],
        ["NII", nii, "High-value applicants"],
        ["Retail", retail, "Individual applicants"],
        ["Total", total, "Overall demand"],
      ].map(([label, value, note]) => (
        <div className="analysis-demand-card" key={label}>
          <span>{label}</span>
          <strong className="mono">{xLabel(value as number)}</strong>
          <p>{note}</p>
        </div>
      ))}
      <div className={`analysis-allotment-callout ${chance.color}`}>
        <div>
          <span>Estimated retail allotment chance</span>
          <strong className="mono">{chance.pct > 0 ? `${chance.pct}%` : "Being verified"}</strong>
          <p>{chance.label}. {chance.tip}</p>
        </div>
        <div className="analysis-progress-track">
          <i style={{ width: `${Math.max(3, Math.min(100, chance.pct))}%` }} />
        </div>
      </div>
    </div>
  );
}
