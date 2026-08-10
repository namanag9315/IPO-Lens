export interface ValuationSimpleInput {
  eps: number | null;
  industryPE?: number | null;
  ipoPE: number | null;
  issuePrice: number | null;
  marketCap?: number | null;
  patMargin?: number | null;
  peerMedianPE?: number | null;
  priceToBook?: number | null;
  roce?: number | null;
  roe?: number | null;
}

export interface ValuationSimpleResult {
  explanation: string;
  label: "Cheap vs peers" | "Fair vs peers" | "Expensive vs peers" | "Cannot conclude";
  tone: "green" | "amber" | "red" | "blue" | "slate";
}

function numberLabel(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined ? "NA" : `${value.toFixed(1)}${suffix}`;
}

function money(value: number | null | undefined) {
  return value === null || value === undefined ? "NA" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function calculateValuationSimple(input: ValuationSimpleInput): ValuationSimpleResult {
  if (!input.ipoPE) {
    return {
      explanation: "IPO P/E is not available yet, so valuation cannot be judged from structured data.",
      label: "Cannot conclude",
      tone: "slate",
    };
  }

  const benchmark = input.peerMedianPE ?? input.industryPE ?? null;
  const benchmarkLabel = input.peerMedianPE ? "peer median P/E" : "industry P/E";

  if (!benchmark) {
    return {
      explanation: `IPO P/E is ${input.ipoPE.toFixed(1)}x, but peer and industry comparison are missing. This means valuation confidence is low.`,
      label: "Cannot conclude",
      tone: "slate",
    };
  }

  if (input.ipoPE < 0.8 * benchmark) {
    return {
      explanation: `IPO P/E is ${input.ipoPE.toFixed(1)}x versus ${benchmarkLabel} of ${benchmark.toFixed(1)}x, suggesting the issue is priced below comparable benchmarks. Growth quality and liquidity risk still matter.`,
      label: "Cheap vs peers",
      tone: "green",
    };
  }

  if (input.ipoPE <= 1.2 * benchmark) {
    return {
      explanation: `IPO P/E is ${input.ipoPE.toFixed(1)}x versus ${benchmarkLabel} of ${benchmark.toFixed(1)}x, suggesting valuation is broadly comparable on available data.`,
      label: "Fair vs peers",
      tone: "blue",
    };
  }

  return {
    explanation: `IPO P/E is ${input.ipoPE.toFixed(1)}x versus ${benchmarkLabel} of ${benchmark.toFixed(1)}x, suggesting valuation is demanding if growth slows.`,
    label: "Expensive vs peers",
    tone: "red",
  };
}

export default function ValuationSimpleView({ input }: { input: ValuationSimpleInput }) {
  const result = calculateValuationSimple(input);

  return (
    <div className="analysis-card valuation-simple-card">
      <div className="valuation-simple-head">
        <div>
          <span>Valuation view</span>
          <h3>{result.label}</h3>
        </div>
        <span className={`analysis-badge ${result.tone}`}>{result.label}</span>
      </div>
      <p>{result.explanation}</p>
      <div className="valuation-simple-grid">
        <div>
          <span>Issue price</span>
          <strong>{money(input.issuePrice)}</strong>
        </div>
        <div>
          <span>EPS</span>
          <strong>{numberLabel(input.eps)}</strong>
        </div>
        <div>
          <span>IPO P/E</span>
          <strong>{numberLabel(input.ipoPE, "x")}</strong>
        </div>
        <div>
          <span>Peer median P/E</span>
          <strong>{numberLabel(input.peerMedianPE, "x")}</strong>
        </div>
        <div>
          <span>Industry P/E</span>
          <strong>{numberLabel(input.industryPE, "x")}</strong>
        </div>
        <div>
          <span>Market cap</span>
          <strong>{input.marketCap === null || input.marketCap === undefined ? "NA" : `₹${input.marketCap.toFixed(1)}Cr`}</strong>
        </div>
      </div>
    </div>
  );
}
