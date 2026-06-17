import type { AnchorInvestorCategory, IPOAnchorInvestor, IPOAnchorSummary, IPOCategory } from "@/types/ipo";

export interface AnchorInvestorScoringInput {
  investors: IPOAnchorInvestor[];
  summary?: IPOAnchorSummary | null;
  issueSizeCr?: number | null;
  priceBandHigh?: number | null;
  category?: IPOCategory | null;
}

export interface AnchorInvestorScoringResult {
  anchor_quality_score: number;
  interpretation: "Strong signal" | "Positive signal" | "Neutral signal" | "Weak signal";
  positive_signals: string[];
  risk_signals: string[];
  anchor_book_size_cr: number | null;
  number_of_anchor_investors: number;
  domestic_mf_share_pct: number;
  fpi_share_pct: number;
  insurance_pension_share_pct: number;
  top_investor_concentration_pct: number;
  top_five_concentration_pct: number;
  unknown_investor_count: number;
  marquee_investor_count: number;
  source_completeness_pct: number;
}

const REPUTED_DOMESTIC_MF_PATTERNS = [
  /sbi mutual/i,
  /hdfc mutual/i,
  /icici prudential/i,
  /nippon india/i,
  /axis mutual/i,
  /kotak mutual/i,
  /aditya birla sun life/i,
  /mirae asset/i,
  /dsp mutual/i,
  /franklin templeton/i,
  /uti mutual/i,
  /tata mutual/i,
  /canara robeco/i,
  /quant mutual/i,
  /motilal oswal mutual/i,
];

const REPUTED_FPI_PATTERNS = [
  /goldman/i,
  /morgan stanley/i,
  /nomura/i,
  /aberdeen/i,
  /fidelity/i,
  /capital group/i,
  /blackrock/i,
  /vanguard/i,
  /government of singapore/i,
  /gic/i,
  /abrdn/i,
  /ubs/i,
  /jp morgan/i,
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export function getAnchorInvestorCategory(investor: IPOAnchorInvestor): AnchorInvestorCategory {
  if (investor.investor_category) {
    return investor.investor_category;
  }

  const legacy = (investor.investor_type ?? "").toLowerCase();

  if (/mutual|mf|fund house/.test(legacy)) {
    return "Domestic Mutual Fund";
  }

  if (/foreign|fpi|fii|portfolio/.test(legacy)) {
    return "Foreign Portfolio Investor";
  }

  if (/insurance/.test(legacy)) {
    return "Insurance Company";
  }

  if (/pension/.test(legacy)) {
    return "Pension Fund";
  }

  if (/\bbank\b/.test(legacy)) {
    return "Bank";
  }

  if (/\baif\b|alternative/.test(legacy)) {
    return "AIF";
  }

  if (/institution|trust|fund/.test(legacy)) {
    return "Other Institution";
  }

  return "Unknown";
}

export function getAnchorAllocationPct(investor: IPOAnchorInvestor) {
  return investor.percent_of_anchor_book ?? investor.allocation_pct ?? 0;
}

export function getAnchorShares(investor: IPOAnchorInvestor) {
  return investor.shares_allotted ?? investor.shares_allocated ?? null;
}

function isReputedDomesticMF(investor: IPOAnchorInvestor) {
  const name = `${investor.investor_name} ${investor.scheme_name ?? ""}`;

  return (
    getAnchorInvestorCategory(investor) === "Domestic Mutual Fund" &&
    (investor.is_marquee || investor.is_reputed || REPUTED_DOMESTIC_MF_PATTERNS.some((pattern) => pattern.test(name)))
  );
}

function isReputedFPI(investor: IPOAnchorInvestor) {
  const name = `${investor.investor_name} ${investor.scheme_name ?? ""}`;

  return (
    getAnchorInvestorCategory(investor) === "Foreign Portfolio Investor" &&
    (investor.is_marquee || investor.is_reputed || REPUTED_FPI_PATTERNS.some((pattern) => pattern.test(name)))
  );
}

function hasSource(investor: IPOAnchorInvestor) {
  return Boolean(investor.source || investor.source_url);
}

function summarizeInvestors(investors: IPOAnchorInvestor[], summary?: IPOAnchorSummary | null) {
  const totalAmount = investors.reduce((sum, investor) => sum + (investor.amount_cr ?? 0), 0);
  const sortedByAllocation = investors.slice().sort((a, b) => getAnchorAllocationPct(b) - getAnchorAllocationPct(a));
  const count = investors.length;
  const domesticMFShare = investors
    .filter((investor) => getAnchorInvestorCategory(investor) === "Domestic Mutual Fund")
    .reduce((sum, investor) => sum + getAnchorAllocationPct(investor), 0);
  const fpiShare = investors
    .filter((investor) => getAnchorInvestorCategory(investor) === "Foreign Portfolio Investor")
    .reduce((sum, investor) => sum + getAnchorAllocationPct(investor), 0);
  const insurancePensionShare = investors
    .filter((investor) => ["Insurance Company", "Pension Fund"].includes(getAnchorInvestorCategory(investor)))
    .reduce((sum, investor) => sum + getAnchorAllocationPct(investor), 0);
  const unknownCount = investors.filter((investor) => getAnchorInvestorCategory(investor) === "Unknown").length;
  const sourceCompleteness = count === 0 ? 0 : (investors.filter(hasSource).length / count) * 100;

  return {
    anchorBookSizeCr: summary?.anchor_book_size_cr ?? summary?.total_anchor_amount_cr ?? (totalAmount > 0 ? totalAmount : null),
    count: summary?.number_of_anchor_investors ?? summary?.anchor_investor_count ?? count,
    domesticMFShare: summary?.domestic_mf_share_pct ?? round(domesticMFShare),
    fpiShare: summary?.fpi_share_pct ?? round(fpiShare),
    insurancePensionShare: summary?.insurance_pension_share_pct ?? round(insurancePensionShare),
    topConcentration: summary?.top_investor_concentration_pct ?? round(getAnchorAllocationPct(sortedByAllocation[0] ?? ({} as IPOAnchorInvestor))),
    topFiveConcentration:
      summary?.top_five_concentration_pct ??
      round(sortedByAllocation.slice(0, 5).reduce((sum, investor) => sum + getAnchorAllocationPct(investor), 0)),
    unknownCount: summary?.unknown_investor_count ?? unknownCount,
    marqueeCount: summary?.marquee_investor_count ?? investors.filter((investor) => investor.is_marquee || investor.is_reputed).length,
    sourceCompleteness: summary?.source_completeness_pct ?? round(sourceCompleteness),
    sortedByAllocation,
  };
}

export function calculateAnchorInvestorScore(input: AnchorInvestorScoringInput): AnchorInvestorScoringResult {
  const investors = input.investors ?? [];
  const positiveSignals: string[] = [];
  const riskSignals: string[] = [];
  const metrics = summarizeInvestors(investors, input.summary);
  let score = 50;

  if (investors.length === 0 && !input.summary) {
    return {
      anchor_quality_score: 35,
      interpretation: "Weak signal",
      positive_signals: [],
      risk_signals: ["Anchor investor data is not available."],
      anchor_book_size_cr: null,
      number_of_anchor_investors: 0,
      domestic_mf_share_pct: 0,
      fpi_share_pct: 0,
      insurance_pension_share_pct: 0,
      top_investor_concentration_pct: 0,
      top_five_concentration_pct: 0,
      unknown_investor_count: 0,
      marquee_investor_count: 0,
      source_completeness_pct: 0,
    };
  }

  if (investors.some(isReputedDomesticMF) || metrics.domesticMFShare >= 10) {
    score += 15;
    positiveSignals.push("Reputed domestic mutual funds are present in the anchor book.");
  }

  if (investors.some(isReputedFPI) || metrics.fpiShare >= 10) {
    score += 10;
    positiveSignals.push("Reputed FPIs or meaningful FPI allocation are present.");
  }

  if (metrics.insurancePensionShare > 0) {
    score += 10;
    positiveSignals.push("Insurance or pension institutions add long-horizon participation.");
  }

  const healthyCount = input.category === "sme" ? metrics.count >= 5 : metrics.count >= 10;

  if (healthyCount) {
    score += 10;
    positiveSignals.push("Anchor investor count is healthy for the issue category.");
  }

  if (metrics.topConcentration <= 20 && metrics.topFiveConcentration <= 50 && metrics.count >= 5) {
    score += 10;
    positiveSignals.push("Anchor allocation is diversified across investors.");
  }

  const upperPriceBandCount = input.priceBandHigh
    ? investors.filter((investor) => (investor.allocation_price ?? 0) >= (input.priceBandHigh ?? 0)).length
    : 0;

  if (investors.length > 0 && upperPriceBandCount / investors.length >= 0.7) {
    score += 5;
    positiveSignals.push("Most anchor allocation happened at the upper price band.");
  }

  if (metrics.topConcentration > 20) {
    score -= 10;
    riskSignals.push("Top investor concentration is above 20% of the anchor book.");
  }

  if (metrics.topFiveConcentration > 50) {
    score -= 10;
    riskSignals.push("Top five investors hold more than 50% of the anchor book.");
  }

  if (metrics.count > 0 && metrics.unknownCount / metrics.count >= 0.3) {
    score -= 10;
    riskSignals.push("A large share of investors are unknown or uncategorised entities.");
  }

  if (input.issueSizeCr && input.issueSizeCr > 0 && metrics.anchorBookSizeCr !== null && metrics.anchorBookSizeCr / input.issueSizeCr < 0.05) {
    score -= 10;
    riskSignals.push("Anchor book is very small relative to total issue size.");
  }

  if (metrics.sourceCompleteness < 80) {
    score -= 5;
    riskSignals.push("Source data is incomplete for some anchor rows.");
  }

  if (input.category === "sme") {
    score -= 5;
    riskSignals.push("SME IPOs carry additional liquidity and governance risk.");
  }

  const anchorQualityScore = clamp(Math.round(score), 0, 100);
  const interpretation =
    anchorQualityScore >= 80 ? "Strong signal" : anchorQualityScore >= 65 ? "Positive signal" : anchorQualityScore >= 45 ? "Neutral signal" : "Weak signal";

  return {
    anchor_quality_score: anchorQualityScore,
    interpretation,
    positive_signals: positiveSignals,
    risk_signals: riskSignals,
    anchor_book_size_cr: metrics.anchorBookSizeCr,
    number_of_anchor_investors: metrics.count,
    domestic_mf_share_pct: round(metrics.domesticMFShare),
    fpi_share_pct: round(metrics.fpiShare),
    insurance_pension_share_pct: round(metrics.insurancePensionShare),
    top_investor_concentration_pct: round(metrics.topConcentration),
    top_five_concentration_pct: round(metrics.topFiveConcentration),
    unknown_investor_count: metrics.unknownCount,
    marquee_investor_count: metrics.marqueeCount,
    source_completeness_pct: round(metrics.sourceCompleteness),
  };
}
