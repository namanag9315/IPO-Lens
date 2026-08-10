"use client";

function signalTone(kind: "good" | "watch" | "risk") {
  return kind === "good" ? "green" : kind === "risk" ? "red" : "amber";
}

function pctLabel(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? "Being verified" : `${value.toFixed(1)}%`;
}

function xLabel(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? "Being verified" : `${value.toFixed(1)}x`;
}

export default function SignalStrip({
  category,
  gmp,
  gmpPct,
  ipoPE,
  revGrowth,
  sectorPE,
  totalX,
}: {
  gmp: number;
  gmpPct: number;
  totalX: number;
  ipoPE: number | null;
  sectorPE: number | null;
  revGrowth: number | null;
  category: string | null;
}) {
  const valuationTone = ipoPE === null || sectorPE === null ? "watch" : ipoPE <= sectorPE ? "good" : "risk";
  const signals = [
    {
      label: "GMP",
      note: gmp > 0 ? "Unofficial premium is positive." : "No public premium signal yet.",
      tone: signalTone(gmp > 0 ? "good" : "watch"),
      value: pctLabel(gmpPct),
    },
    {
      label: "Demand",
      note: totalX >= 10 ? "Subscription demand is strong." : totalX >= 1 ? "Demand is visible but still building." : "Demand data is still pending.",
      tone: signalTone(totalX >= 10 ? "good" : totalX >= 1 ? "watch" : "risk"),
      value: xLabel(totalX),
    },
    {
      label: "Valuation",
      note:
        ipoPE === null || sectorPE === null
          ? "Peer comparison is incomplete."
          : ipoPE <= sectorPE
            ? "P/E is below or near sector average."
            : "P/E is above sector average.",
      tone: signalTone(valuationTone),
      value: ipoPE === null ? "Being verified" : `${ipoPE.toFixed(1)}x`,
    },
    {
      label: "Growth",
      note: revGrowth === null ? "Financial growth needs more data." : revGrowth >= 25 ? "Revenue growth is strong." : "Growth is moderate.",
      tone: signalTone(revGrowth === null ? "watch" : revGrowth >= 25 ? "good" : "watch"),
      value: pctLabel(revGrowth),
    },
    {
      label: "Risk",
      note: category === "sme" ? "SME liquidity and volatility need extra caution." : "Mainboard issue risk depends on fundamentals and demand.",
      tone: signalTone(category === "sme" ? "watch" : "good"),
      value: category === "sme" ? "SME" : "Mainboard",
    },
  ];

  return (
    <div className="analysis-signal-strip">
      {signals.map((signal) => (
        <div className="analysis-signal-cell" key={signal.label}>
          <div>
            <span className={`analysis-dot ${signal.tone}`} />
            <strong>{signal.label}</strong>
          </div>
          <b className="mono">{signal.value}</b>
          <p>{signal.note}</p>
        </div>
      ))}
    </div>
  );
}
