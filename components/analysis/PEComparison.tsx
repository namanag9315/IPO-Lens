"use client";

function valueLabel(value: number | null) {
  return value === null || !Number.isFinite(value) ? "Being verified" : `${value.toFixed(1)}x`;
}

export default function PEComparison({
  hasPeerData,
  ipoPE,
  sectorPE,
}: {
  ipoPE: number | null;
  sectorPE: number | null;
  hasPeerData: boolean;
}) {
  const sectorHigh = sectorPE ? sectorPE * 1.4 : null;
  const max = Math.max(ipoPE ?? 0, sectorPE ?? 0, sectorHigh ?? 0, 1) * 1.2;
  const rows = [
    { className: "ipo", label: "This IPO", value: ipoPE },
    { className: "sector", label: "Industry average", value: sectorPE },
    { className: "high", label: "Sector high", value: sectorHigh },
  ];

  return (
    <div className="analysis-pe-chart">
      {rows.map((row) => (
        <div className="analysis-pe-row" key={row.label}>
          <span>{row.label}</span>
          <div className="analysis-pe-track">
            <i className={row.className} style={{ width: `${row.value ? Math.min(100, (row.value / max) * 100) : 4}%` }} />
          </div>
          <b className="mono">{valueLabel(row.value)}</b>
        </div>
      ))}
      {!hasPeerData ? <p className="analysis-muted-note">Peer PE data is not verified yet, so this valuation view has lower confidence.</p> : null}
    </div>
  );
}
