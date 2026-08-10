import type { CleanFact } from "./factLookup";
import {
  getFact,
  getFactValue,
  getFactDisplay,
  getFactJson,
  getFirstUsableFact,
  hasUsableFact,
  normalizePercent,
  normalizeMoney,
  parseIndianNumber,
  cleanLabelText,
  isPlaceholder,
} from "./factLookup";
import { calculateIPOScore, estimateListingGainPct, type IPOScoringInput, type IPOScoringResult } from "@/lib/scoring";
import { estimateAllotmentChance } from "@/lib/allotment";

export type ResearchSectionStatus = "complete" | "partial" | "source_limited" | "needs_review";
export type PublicSignalLabel =
  | "Strong Signal"
  | "Positive Signal"
  | "Neutral Signal"
  | "Weak Signal"
  | "Needs Review"
  | "Partial Data";

export interface ResearchSection<TValues> {
  status: ResearchSectionStatus;
  hasEnoughData: boolean;
  values: TValues;
  missingReasons: string[];
}

export interface ResearchMetricCard {
  key: "gmp" | "demand" | "valuation" | "revenue_growth" | "minimum_investment" | "allotment_chance";
  label: string;
  value: string;
  note: string | null;
  tone: "green" | "amber" | "red" | "neutral";
}

export interface ResearchQuickSignal {
  key: string;
  title: string;
  explanation: string;
  metric: string;
  tone: "green" | "amber" | "red" | "neutral";
}

export interface IPOResearchSections {
  hero: ResearchSection<IPOResearchView["hero"] & {
    sector: string | null;
    documentLinks: Array<{ label: string; url: string }>;
  }>;
  score: ResearchSection<{
    score: number;
    signalLabel: PublicSignalLabel;
    confidence: "High" | "Medium" | "Partial";
    potentialScore: number | null;
    caveat: string | null;
    scoreColor: IPOScoringResult["scoreColor"];
    breakdown: IPOScoringResult["breakdown"];
  }>;
  metrics: ResearchSection<{ cards: ResearchMetricCard[] }>;
  quickSignals: ResearchSection<{ signals: ResearchQuickSignal[] }>;
  company: ResearchSection<IPOResearchView["company"] & {
    productChips: string[];
    employeeCount: string | null;
  }>;
  valuation: ResearchSection<IPOResearchView["valuation"] & {
    conclusion: "Priced below peer average" | "Priced near peer average" | "Priced above peer average" | "Peer comparison source-limited";
    peerTableColumns: Array<"company" | "pe" | "cmp" | "roe">;
    comparisonBars: Array<{ label: string; value: number; tone: "blue" | "slate" | "green" | "amber" }>;
  }>;
  financials: ResearchSection<IPOResearchView["financials"] & {
    trendBars: Array<{ label: string; revenueCr: number; patCr: number | null }>;
    tableRows: Array<{ period: string; revenueCr: number | null; patCr: number | null; patMarginPct: number | null }>;
  }>;
  demand: ResearchSection<IPOResearchView["demand"] & {
    gmp: {
      issuePrice: number | null;
      gmpValue: number | null;
      gmpPercent: number | null;
      listingEstimate: number | null;
    };
    allotmentChancePct: number | null;
    subscriptionBars: Array<{ category: "QIB" | "NII" | "Retail" | "Total"; times: number }>;
    cleanSubscriptionRows: Array<{
      category: "QIB" | "NII" | "Retail" | "Total";
      offered: string | null;
      applied: string | null;
      times: number | null;
    }>;
    showOfferedColumn: boolean;
    showAppliedColumn: boolean;
  }>;
  manager: ResearchSection<IPOResearchView["manager"] & {
    historyState: "tracked history" | "history pending" | "missing";
    trackedIPOCount: number | null;
    positiveListingRatePct: number | null;
    aboveIssueAfter30DaysPct: number | null;
  }>;
  risks: ResearchSection<IPOResearchView["risk"]>;
  detailedAnalysis: ResearchSection<{
    score: number;
    signalLabel: PublicSignalLabel;
    factorPoints: Array<{ label: string; points: number }>;
    missingData: string[];
    notes: string[];
  }>;
  timeline: ResearchSection<{
    rows: Array<{ label: string; value: string }>;
  }>;
  rawAudit: ResearchSection<{
    dataPointCount: number;
    rows: IPOResearchView["rawAudit"];
  }>;
}

export interface IPOResearchView {
  hero: {
    name: string;
    slug: string;
    category: "mainboard" | "sme";
    exchange: string;
    status: "upcoming" | "open" | "closed" | "listed";
    openDate: string | null;
    closeDate: string | null;
    listingDate: string | null;
    allotmentDate: string | null;
    refundDate: string | null;
    priceBand: string | null;
    priceBandLow: number | null;
    priceBandHigh: number | null;
    issuePrice: number | null;
    issueSizeCr: number | null;
    lotSize: number | null;
    minInvestment: number | null;
    gmpValue: number | null;
    gmpPercent: number | null;
    listingEstimate: number | null;
    allotmentChancePct: number | null;
    retailSubscription: number | null;
    totalSubscription: number | null;
    drhpUrl: string | null;
    rhpUrl: string | null;
    prospectusUrl: string | null;
    description: string | null;
    promoterHoldingPre: number | null;
    promoterHoldingPost: number | null;
  };
  score: IPOScoringResult;
  company: {
    description: string | null;
    sector: string | null;
    productsServices: string | null;
    manufacturingFacilities: string | null;
    website: string | null;
    promoters: string | null;
    headquarters: string | null;
    promoterHoldingPre: number | null;
    promoterHoldingPost: number | null;
    employeeCount: string | null;
    contact: {
      address: string | null;
      phone: string | null;
      email: string | null;
      website: string | null;
    } | null;
    status: "Complete" | "Partial" | "Source-limited" | "Needs review";
  };
  valuation: {
    ipoPE: number | null;
    preIpoPE: number | null;
    eps: number | null;
    priceToBook: number | null;
    marketCap: number | null;
    peerRows: Array<{
      companyName: string;
      peRatio: number | null;
      cmp: number | null;
      roePct: number | null;
    }>;
    peerAveragePE: number | null;
    peerHighPE: number | null;
    status: "Complete" | "Partial" | "Source-limited" | "Needs review";
  };
  financials: {
    latestRevenue: number | null;
    latestPAT: number | null;
    latestPATMargin: number | null;
    latestEBITDA: number | null;
    latestEBITDAMargin: number | null;
    latestROE: number | null;
    latestROCE: number | null;
    revenueGrowth: number | null;
    patGrowth: number | null;
    yearlyRows: Array<{
      financialYear: string;
      revenueCr: number | null;
      patCr: number | null;
      ebitdaCr: number | null;
      ebitdaMarginPct: number | null;
      patMarginPct: number | null;
      netWorthCr: number | null;
      totalAssetsCr: number | null;
      totalBorrowingsCr: number | null;
      eps: number | null;
      roePct: number | null;
      rocePct: number | null;
    }>;
    status: "Complete" | "Partial" | "Source-limited" | "Needs review";
  };
  demand: {
    qibTimes: number | null;
    niiTimes: number | null;
    retailTimes: number | null;
    totalTimes: number | null;
    subscriptionTable: Array<{
      category: "QIB" | "NII" | "Retail" | "Total";
      offered: string;
      applied: string;
      times: number | null;
    }>;
    status: "Complete" | "Partial" | "Source-limited" | "Needs review";
  };
  manager: {
    leadManagerName: string | null;
    leadManagerStatus: "linked" | "history pending" | "missing";
    leadManagerScore: number | null;
    leadManagerHistory: Array<{
      ipoName: string;
      listingGainPct: number | null;
      day30ReturnPct: number | null;
      listingDate: string | null;
    }>;
    registrarName: string | null;
    registrarContact: {
      phone: string | null;
      email: string | null;
      website: string | null;
    } | null;
    marketMakerName: string | null;
    marketMakerPortion: string | null;
    marketMakerStatus: "linked" | "portion available; name pending" | "name missing" | "missing";
  };
  risk: {
    risks: Array<{
      title: string;
      description: string;
      severity: "HIGH" | "MEDIUM" | "WATCH";
    }>;
  };
  rawAudit: Array<{
    fieldName: string;
    displayValue: string;
    sourceFactKey: string | null;
    sourceProvider: string | null;
    confidence: string | null;
    usedInSection: string;
    missingReason: string | null;
  }>;
  sections: IPOResearchSections;
}

export function shouldShowSection<TValues>(section: ResearchSection<TValues> | null | undefined): boolean {
  return Boolean(section?.hasEnoughData);
}

function sectionStatusFromLegacy(status: "Complete" | "Partial" | "Source-limited" | "Needs review"): ResearchSectionStatus {
  if (status === "Complete") return "complete";
  if (status === "Partial") return "partial";
  if (status === "Needs review") return "needs_review";
  return "source_limited";
}

function buildSection<TValues>(
  values: TValues,
  status: ResearchSectionStatus,
  hasEnoughData: boolean,
  missingReasons: string[] = []
): ResearchSection<TValues> {
  return { status, hasEnoughData, values, missingReasons: missingReasons.filter(Boolean) };
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !isPlaceholder(value);
}

function fmtAmount(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtCr(value: number | null | undefined): string | null {
  const amount = fmtAmount(value);
  return amount ? `${amount} Cr` : null;
}

function fmtPct(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}%`;
}

function fmtX(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}x`;
}

function fmtPE(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}x P/E`;
}

function publicSignalLabel(score: number, missingDataCount: number): PublicSignalLabel {
  if (missingDataCount >= 4) return "Partial Data";
  if (score >= 75) return "Strong Signal";
  if (score >= 55) return "Positive Signal";
  if (score >= 35) return "Neutral Signal";
  if (score >= 20) return "Weak Signal";
  return "Needs Review";
}

function publicScoreConfidence(missingDataCount: number): "High" | "Medium" | "Partial" {
  if (missingDataCount <= 1) return "High";
  if (missingDataCount <= 3) return "Medium";
  return "Partial";
}

function cleanShareText(value: string | null | undefined): string | null {
  if (!hasText(value)) return null;
  const cleaned = value.trim();
  if (cleaned === "-") return null;
  return cleaned;
}

function deriveProductChips(productsServices: string | null, description: string | null): string[] {
  const text = `${productsServices ?? ""} ${description ?? ""}`.toLowerCase();
  const chips: string[] = [];
  const add = (label: string, pattern: RegExp) => {
    if (pattern.test(text) && !chips.includes(label)) chips.push(label);
  };

  add("Winding wires", /winding\s+wires?/);
  add("Power cables", /power\s+cables?|cables?/);
  add("Conductors", /conductors?/);
  add("Aluminium products", /aluminium|aluminum/);
  add("Copper products", /copper/);

  if (chips.length === 0 && hasText(productsServices)) {
    return productsServices
      .split(/[,;/|]/)
      .map((item) => cleanLabelText(item))
      .filter(Boolean)
      .slice(0, 6);
  }

  return chips.slice(0, 6);
}

export function buildIPOResearchView(
  ipo: any,
  factRows: CleanFact[],
  gmpHistory: any[] = [],
  subscriptionHistory: any[] = [],
  leadManagerProfile: any = null,
  marketMakerProfile: any = null
): IPOResearchView {
  const auditList: IPOResearchView["rawAudit"] = [];

  // Helper to get value and log audit trail
  function resolveFact(
    factKey: string,
    fieldName: string,
    usedInSection: string,
    fallbackValue: any = null
  ): any {
    const fact = getFact(factRows, factKey);
    const value = fact && !isPlaceholder(fact.fact_value) ? fact.fact_value : null;

    if (value !== null && value !== undefined) {
      auditList.push({
        fieldName,
        displayValue: typeof value === "object" ? JSON.stringify(value).slice(0, 100) : String(value),
        sourceFactKey: factKey,
        sourceProvider: fact?.source_provider ?? "UNKNOWN",
        confidence: fact?.confidence ?? "medium",
        usedInSection,
        missingReason: null,
      });
      return value;
    }

    if (fallbackValue !== null && fallbackValue !== undefined && !isPlaceholder(fallbackValue)) {
      auditList.push({
        fieldName,
        displayValue: String(fallbackValue),
        sourceFactKey: null,
        sourceProvider: "CANONICAL_IPO",
        confidence: "high",
        usedInSection,
        missingReason: null,
      });
      return fallbackValue;
    }

    auditList.push({
      fieldName,
      displayValue: "Unavailable",
      sourceFactKey: factKey,
      sourceProvider: null,
      confidence: null,
      usedInSection,
      missingReason: `Fact key "${factKey}" was not found in clean facts, or its value is a placeholder.`,
    });
    return null;
  }

  // Helper to extract first match in keys
  function resolveFirstFact(
    factKeys: string[],
    fieldName: string,
    usedInSection: string,
    fallbackValue: any = null
  ): any {
    const matched = getFirstUsableFact(factRows, factKeys);
    if (matched) {
      auditList.push({
        fieldName,
        displayValue: typeof matched.value === "object" ? JSON.stringify(matched.value).slice(0, 100) : String(matched.value),
        sourceFactKey: matched.factKey,
        sourceProvider: matched.fact?.source_provider ?? "UNKNOWN",
        confidence: matched.fact?.confidence ?? "medium",
        usedInSection,
        missingReason: null,
      });
      return matched.value;
    }

    if (fallbackValue !== null && fallbackValue !== undefined && !isPlaceholder(fallbackValue)) {
      auditList.push({
        fieldName,
        displayValue: String(fallbackValue),
        sourceFactKey: null,
        sourceProvider: "CANONICAL_IPO",
        confidence: "high",
        usedInSection,
        missingReason: null,
      });
      return fallbackValue;
    }

    auditList.push({
      fieldName,
      displayValue: "Unavailable",
      sourceFactKey: factKeys.join(" | "),
      sourceProvider: null,
      confidence: null,
      usedInSection,
      missingReason: `None of the keys [${factKeys.join(", ")}] had a valid clean fact.`,
    });
    return null;
  }

  // --- GMP Logic ---
  const latestGmpRecord = gmpHistory && gmpHistory[0];
  const rawGmpValue = latestGmpRecord ? latestGmpRecord.gmp_value : getFactValue(factRows, "latest_gmp")?.gmpValue;
  const gmpValue = parseIndianNumber(rawGmpValue);

  // --- Base details ---
  const rawPriceBand = resolveFact("price_band", "priceBand", "hero", ipo.price_band_high ? `${ipo.price_band_low || ""} - ${ipo.price_band_high}` : null);
  const priceBandHigh = parseIndianNumber(resolveFact("price_band_high", "priceBandHigh", "hero", ipo.price_band_high));
  const priceBandLow = parseIndianNumber(resolveFact("price_band_low", "priceBandLow", "hero", ipo.price_band_low));

  // Issue Price logic
  const issuePrice = parseIndianNumber(resolveFact("issue_price", "issuePrice", "hero") ?? priceBandHigh ?? ipo.price_band_high);

  const lotSize = parseIndianNumber(resolveFact("lot_size", "lotSize", "hero", ipo.lot_size));
  const minInvestment = lotSize && priceBandHigh ? lotSize * priceBandHigh : null;

  let rawIssueSize = resolveFirstFact(["issue_size", "total_issue_size"], "issueSizeCr", "hero", ipo.issue_size_cr);
  const issueSizeCr = (() => {
    if (typeof rawIssueSize === "string") {
      const crMatch = rawIssueSize.match(/(?:up\s+to\s+)?₹\s*([\d,.]+)\s*(?:crore|cr)/i);
      if (crMatch) return parseIndianNumber(crMatch[1]);
      const hasShares = /shares?|equity/i.test(rawIssueSize);
      const hasCr = /₹|crore|cr\b/i.test(rawIssueSize);
      const numVal = parseIndianNumber(rawIssueSize);
      if (hasCr && !hasShares) return numVal;
      if (numVal !== null && numVal < 10000 && !hasShares) return numVal;
      return parseIndianNumber(ipo.issue_size_cr);
    }
    return parseIndianNumber(rawIssueSize);
  })();

  // Clean GMP outputs
  const gmpPercent = gmpValue !== null && issuePrice && issuePrice > 0 ? (gmpValue / issuePrice) * 100 : null;
  const listingEstimate = issuePrice !== null && gmpValue !== null ? issuePrice + gmpValue : null;

  // Audit GMP
  if (gmpValue !== null) {
    auditList.push({
      fieldName: "gmpValue",
      displayValue: `₹${gmpValue}`,
      sourceFactKey: latestGmpRecord ? "gmp_history_clean" : "latest_gmp",
      sourceProvider: latestGmpRecord ? latestGmpRecord.source_provider ?? "IPOWATCH" : "IPOWATCH",
      confidence: "medium",
      usedInSection: "hero",
      missingReason: null,
    });
  }

  // --- Dates ---
  const openDate = resolveFact("open_date", "openDate", "hero", ipo.open_date);
  const closeDate = resolveFact("close_date", "closeDate", "hero", ipo.close_date);
  const listingDate = resolveFact("listing_date", "listingDate", "hero", ipo.listing_date);
  const allotmentDate = resolveFact("allotment_date", "allotmentDate", "hero", ipo.allotment_date);
  const refundDate = resolveFact("refund_date", "refundDate", "hero", null);

  const exchange = resolveFact("listing_exchange", "exchange", "hero", ipo.exchange ?? "NSE/BSE");

  // Links
  const drhpUrl = resolveFact("drhp_url", "drhpUrl", "hero", ipo.drhp_url);
  const rhpUrl = resolveFirstFact(["rhp_url", "rhpUrl"], "rhpUrl", "hero", ipo.rhp_url);
  const prospectusUrl = resolveFirstFact(["prospectus_url", "prospectusUrl"], "prospectusUrl", "hero", ipo.prospectus_url);

  // --- Subscription ---
  const latestSubRecord = subscriptionHistory && subscriptionHistory[0];
  const qibTimes = parseIndianNumber(latestSubRecord ? latestSubRecord.qib_x : getFactValue(factRows, "qib_subscription"));
  const niiTimes = parseIndianNumber(latestSubRecord ? latestSubRecord.nii_x : getFactValue(factRows, "nii_subscription"));
  const retailTimes = parseIndianNumber(latestSubRecord ? latestSubRecord.retail_x : getFactValue(factRows, "retail_subscription"));
  const totalTimes = parseIndianNumber(latestSubRecord ? latestSubRecord.total_x : getFactValue(factRows, "total_subscription"));

  const allotmentChancePct = retailTimes !== null ? estimateAllotmentChance(retailTimes).pct : null;

  // --- Company Description ---
  const companyDescription = resolveFirstFact(
    ["company_description", "business_model"],
    "companyDescription",
    "company",
    ipo.company_profile?.company_overview ?? ipo.company_profile?.business_model
  );

  // --- Sector Clean up ---
  let rawSector = resolveFirstFact(["sector", "industry"], "sector", "company", ipo.company_profile?.sector);
  let sector = cleanLabelText(rawSector);
  if (!sector && companyDescription) {
    const descLower = companyDescription.toLowerCase();
    if (descLower.includes("wire") || descLower.includes("cable") || descLower.includes("electrical")) {
      sector = "Electrical equipment / wires & cables";
      auditList.push({
        fieldName: "sector",
        displayValue: sector,
        sourceFactKey: "derived",
        sourceProvider: "DERIVED_FROM_DESC",
        confidence: "medium",
        usedInSection: "company",
        missingReason: null,
      });
    }
  }

  // --- Products & Services ---
  let productsServices = resolveFact("products_services", "productsServices", "company", ipo.company_profile?.business_model);
  if (!productsServices && companyDescription) {
    const descLower = companyDescription.toLowerCase();
    const derivedList: string[] = [];
    if (descLower.includes("aluminium")) derivedList.push("aluminium winding wires");
    if (descLower.includes("copper")) derivedList.push("copper winding wires");
    if (descLower.includes("conductor")) derivedList.push("conductors");
    if (descLower.includes("power cable") || descLower.includes("cables")) derivedList.push("power cables");
    if (derivedList.length > 0) {
      productsServices = derivedList.join(", ");
      auditList.push({
        fieldName: "productsServices",
        displayValue: productsServices,
        sourceFactKey: "derived",
        sourceProvider: "DERIVED_FROM_DESC",
        confidence: "medium",
        usedInSection: "company",
        missingReason: null,
      });
    }
  }

  const manufacturingFacilities = resolveFact("manufacturing_facilities", "manufacturingFacilities", "company");
  const employeeCount = (() => {
    const raw = resolveFirstFact(["employee_count", "employees", "number_of_employees"], "employeeCount", "company");
    if (typeof raw === "number" && Number.isFinite(raw)) return raw.toLocaleString("en-IN");
    if (hasText(raw)) return raw.trim();
    return null;
  })();
  const headquarters = resolveFact("headquarters", "headquarters", "company", ipo.company_profile?.headquarters);
  const promoters = resolveFact("promoters", "promoters", "company", ipo.company_profile?.promoters);
  const promoterHoldingPre = parseIndianNumber(resolveFact("promoter_holding_pre_ipo", "promoterHoldingPre", "company", ipo.company_profile?.pre_issue_promoter_holding_pct));
  const promoterHoldingPost = parseIndianNumber(resolveFact("promoter_holding_post_ipo", "promoterHoldingPost", "company", ipo.company_profile?.post_issue_promoter_holding_pct));

  const rawContact = resolveFirstFact(["company_contact", "registrar_contact"], "companyContact", "company");
  const contact = rawContact
    ? {
        address: rawContact.address ?? null,
        phone: rawContact.phone ?? null,
        email: rawContact.email ?? null,
        website: rawContact.website ?? null,
      }
    : null;

  // --- Company Section Status ---
  let companyStatus: IPOResearchView["company"]["status"] = "Source-limited";
  if (companyDescription && sector && productsServices) {
    companyStatus = "Complete";
  } else if (companyDescription || sector) {
    companyStatus = "Partial";
  }

  // --- Valuation Section ---
  const pePostIpo = parseIndianNumber(resolveFirstFact(["pe_post_ipo", "ipo_pe"], "pePostIpo", "valuation"));
  const pePreIpo = parseIndianNumber(resolveFact("pe_pre_ipo", "pePreIpo", "valuation"));
  const epsPostIpo = parseIndianNumber(resolveFirstFact(["eps_post_ipo", "ipo_eps", "eps"], "epsPostIpo", "valuation"));
  const epsPreIpo = parseIndianNumber(resolveFact("eps_pre_ipo", "epsPreIpo", "valuation"));
  const priceToBook = parseIndianNumber(resolveFact("price_to_book_value", "priceToBook", "valuation"));
  const marketCap = parseIndianNumber(resolveFact("market_cap", "marketCap", "valuation"));

  // Peer table parsing and normalization
  const peerTableRaw = getFactValue(factRows, "peer_valuation_table") ?? ipo.peer_comparisons ?? [];
  const peerRows: IPOResearchView["valuation"]["peerRows"] = [];

  if (Array.isArray(peerTableRaw)) {
    for (const row of peerTableRaw) {
      if (!row || typeof row !== "object") continue;

      const companyName = String(
        row.company ??
        row.Company ??
        row["Company Name"] ??
        row.company_name ??
        row.peer_name ??
        row.Peer ??
        Object.values(row)[0] ??
        ""
      ).trim();

      if (!companyName) continue;

      const peRatio = parseIndianNumber(
        row.pe ??
        row.PE ??
        row["P/E"] ??
        row["P/E (x)"] ??
        row["PE Ratio"] ??
        row.pe_ratio
      );

      const cmp = parseIndianNumber(
        row.price ??
        row.Price ??
        row.CMP ??
        row["Issue Price"] ??
        row.cmp
      );

      const roePct = parseIndianNumber(
        row.roe ??
        row.RoE ??
        row.RoNW ??
        row.RONW ??
        row.roe_pct ??
        row.ronw
      );

      peerRows.push({
        companyName,
        peRatio,
        cmp,
        roePct,
      });
    }
  }

  // Calculate peer averages and highs
  const peerPEs = peerRows
    .map((p) => p.peRatio)
    .filter((v): v is number => v !== null && v > 0);

  // Prefer the sectorPEAvg fact saved by providers (which exclude the first row / IPO company row)
  const factSectorPEAvg = parseIndianNumber(getFactValue(factRows, "sectorPEAvg") ?? getFactValue(factRows, "peer_average_pe"));
  const computedPeerAvg = peerPEs.length > 0 ? Number((peerPEs.reduce((a, b) => a + b, 0) / peerPEs.length).toFixed(2)) : null;
  const peerAveragePE = factSectorPEAvg ?? computedPeerAvg;
  const peerHighPE = parseIndianNumber(getFactValue(factRows, "peer_high_pe")) ?? (peerPEs.length > 0 ? Math.max(...peerPEs) : null);

  // Valuation Status
  let valuationStatus: IPOResearchView["valuation"]["status"] = "Source-limited";
  if (pePostIpo !== null && peerRows.length > 0) {
    valuationStatus = "Complete";
  } else if (pePostIpo !== null || peerRows.length > 0) {
    valuationStatus = "Partial";
  }

  // --- Financial Section ---
  const rawFinTable = getFactValue(factRows, "financial_table") ?? ipo.financials_yearly ?? [];

  // Data Quality Fix for PAT latest
  const rawPatLatest = getFactValue(factRows, "pat_latest");
  let patLatestAmount: number | null = null;
  let patMarginLatest: number | null = parseIndianNumber(resolveFact("pat_margin_latest", "patMarginLatest", "financials"));

  if (rawPatLatest !== null && rawPatLatest !== undefined) {
    const rawPatStr = String(rawPatLatest);
    const rawPatNumber = parseIndianNumber(rawPatLatest);
    const duplicatesMargin =
      rawPatNumber !== null &&
      patMarginLatest !== null &&
      Math.abs(rawPatNumber - patMarginLatest) < 0.01;
    if (!rawPatStr.includes("%") && rawPatNumber !== null && !duplicatesMargin) {
      patLatestAmount = rawPatNumber;
    }
  }

  // Derive PAT latest amount from table if it is missing or represented as percentage
  // Derive PAT latest amount from table if it is missing or represented as percentage
  const yearlyRows: IPOResearchView["financials"]["yearlyRows"] = [];
  if (Array.isArray(rawFinTable) && rawFinTable.length > 0) {
    const firstRow = rawFinTable[0];
    const keys = Object.keys(firstRow || {});
    const validPeriodKeys = keys.filter((k) => /20\d{2}|fy\d{2}|mar|jun|sep|dec|\bfy\b/i.test(k.trim()));
    const labelKey = keys.find((k) => !validPeriodKeys.includes(k)) || keys[0];
    const isTransposed = validPeriodKeys.length > 0 && !validPeriodKeys.includes(labelKey);

    if (isTransposed) {
      const findRow = (keywords: RegExp[]) =>
        rawFinTable.find((row: any) => {
          const label = String(row[labelKey] ?? "").toLowerCase();
          return keywords.some((keyword) => keyword.test(label));
        });

      const revenueRow = findRow([/revenue/, /income/, /sales/]);
      const patRow = findRow([/profit after tax/, /\bpat\b/, /net profit/]);
      const ebitdaRow = findRow([/ebitda/]);
      const netWorthRow = findRow([/net worth/]);
      const assetsRow = findRow([/assets/, /asset/]);
      const borrowingsRow = findRow([/borrowing/, /debt/]);
      const epsRow = findRow([/\beps\b/]);
      const roeRow = findRow([/\broe\b/, /return on net worth/, /ronw/]);
      const roceRow = findRow([/\broce\b/]);

      // Sort periods ascending
      const yearNum = (h: string) => {
        const m = h.match(/20(\d{2})/);
        return m ? parseInt(m[1], 10) : 0;
      };
      const sortedPeriods = [...validPeriodKeys].sort((a, b) => yearNum(a) - yearNum(b));

      for (const period of sortedPeriods) {
        const revenueCr = parseIndianNumber(revenueRow?.[period]);
        const patCr = parseIndianNumber(patRow?.[period]);
        const ebitdaCr = parseIndianNumber(ebitdaRow?.[period]);
        const netWorthCr = parseIndianNumber(netWorthRow?.[period]);
        const totalAssetsCr = parseIndianNumber(assetsRow?.[period]);
        const totalBorrowingsCr = parseIndianNumber(borrowingsRow?.[period]);
        const eps = parseIndianNumber(epsRow?.[period]);
        const roePct = parseIndianNumber(roeRow?.[period]);
        const rocePct = parseIndianNumber(roceRow?.[period]);
        const patMarginPct = revenueCr && patCr ? (patCr / revenueCr) * 100 : null;

        if (revenueCr !== null || patCr !== null || totalAssetsCr !== null) {
          yearlyRows.push({
            financialYear: period.trim(),
            revenueCr,
            patCr,
            ebitdaCr,
            ebitdaMarginPct: null,
            patMarginPct,
            netWorthCr,
            totalAssetsCr,
            totalBorrowingsCr,
            eps,
            roePct,
            rocePct,
          });
        }
      }
    } else {
      // Standard layout
      for (const row of rawFinTable) {
        if (!row || typeof row !== "object") continue;

        const year = String(row.financial_year ?? row.Particulars ?? row.Particular ?? Object.values(row)[0] ?? "").trim();
        if (!year || /total|assets|revenue|pat|ebitda/i.test(year)) continue;

        const revenueCr = parseIndianNumber(row.revenue_cr ?? row.revenue ?? row.Revenue ?? row["Total Revenue"] ?? row["Total Income"] ?? row.total_income);
        const patCr = parseIndianNumber(row.pat_cr ?? row.pat ?? row.PAT ?? row["Profit After Tax"] ?? row["Profit after Tax"] ?? row["Net Profit"] ?? row.net_profit);
        const ebitdaCr = parseIndianNumber(row.ebitda_cr ?? row.ebitda ?? row.EBITDA);
        const ebitdaMarginPct = parseIndianNumber(row.ebitda_margin_pct ?? row.ebitda_margin ?? row["EBITDA Margin (%)"]);
        const patMarginPct = parseIndianNumber(row.pat_margin_pct ?? row.pat_margin ?? row["PAT Margin (%)"] ?? (revenueCr && patCr ? (patCr / revenueCr) * 100 : null));
        const netWorthCr = parseIndianNumber(row.net_worth_cr ?? row.net_worth ?? row["Net Worth"]);
        const totalAssetsCr = parseIndianNumber(row.total_assets_cr ?? row.total_assets ?? row.assets ?? row["Total Assets"]);
        const totalBorrowingsCr = parseIndianNumber(row.total_borrowings_cr ?? row.total_borrowings ?? row.borrowings ?? row["Total Borrowings"]);
        const eps = parseIndianNumber(row.eps ?? row.EPS);
        const roePct = parseIndianNumber(row.roe_pct ?? row.roe ?? row.ROE ?? row.ronw ?? row.RoNW ?? row.RONW);
        const rocePct = parseIndianNumber(row.roce_pct ?? row.roce ?? row.ROCE);
        const hasUsefulFinancialMetric = [
          revenueCr,
          patCr,
          ebitdaCr,
          netWorthCr,
          totalAssetsCr,
          totalBorrowingsCr,
          eps,
          roePct,
          rocePct,
        ].some((value) => value !== null);

        if (!hasUsefulFinancialMetric) continue;

        yearlyRows.push({
          financialYear: year,
          revenueCr,
          patCr,
          ebitdaCr,
          ebitdaMarginPct,
          patMarginPct,
          netWorthCr,
          totalAssetsCr,
          totalBorrowingsCr,
          eps,
          roePct,
          rocePct,
        });
      }
    }
  }

  // Sort yearlyRows by financial year ascending
  yearlyRows.sort((a, b) => a.financialYear.localeCompare(b.financialYear));

  // Derive latest PAT amount from the last row of the financial table if it was missing or a percent
  if (patLatestAmount === null && yearlyRows.length > 0) {
    patLatestAmount = yearlyRows.at(-1)?.patCr ?? null;
  }
  if (patMarginLatest === null && yearlyRows.length > 0) {
    patMarginLatest = yearlyRows.at(-1)?.patMarginPct ?? null;
  }

  const latestRevenue = parseIndianNumber(resolveFirstFact(["revenue_latest", "total_income_latest"], "latestRevenue", "financials") ?? yearlyRows.at(-1)?.revenueCr);
  if (patLatestAmount === null && latestRevenue !== null && patMarginLatest !== null) {
    patLatestAmount = Number((latestRevenue * patMarginLatest / 100).toFixed(2));
  }
  const latestPAT = patLatestAmount ?? parseIndianNumber(yearlyRows.at(-1)?.patCr);
  const latestEBITDA = parseIndianNumber(resolveFact("ebitda_latest", "latestEBITDA", "financials") ?? yearlyRows.at(-1)?.ebitdaCr);
  const latestEBITDAMargin = yearlyRows.at(-1)?.ebitdaMarginPct ?? null;
  const latestROE = parseIndianNumber(resolveFirstFact(["roe_latest", "ronw_latest"], "latestROE", "financials") ?? yearlyRows.at(-1)?.roePct);
  const latestROCE = parseIndianNumber(resolveFact("roce_latest", "latestROCE", "financials") ?? yearlyRows.at(-1)?.rocePct);

  // --- Dynamic Growth Calculations ---
  // Compute growth from last two sorted yearlyRows, not from static facts
  let revenueGrowth: number | null = null;
  let patGrowth: number | null = null;

  if (yearlyRows.length >= 2) {
    const latestRow = yearlyRows.at(-1)!;
    const prevRow = yearlyRows.at(-2)!;
    if (latestRow.revenueCr !== null && prevRow.revenueCr !== null && prevRow.revenueCr !== 0) {
      revenueGrowth = ((latestRow.revenueCr - prevRow.revenueCr) / prevRow.revenueCr) * 100;
    }
    if (latestRow.patCr !== null && prevRow.patCr !== null && prevRow.patCr !== 0) {
      patGrowth = ((latestRow.patCr - prevRow.patCr) / prevRow.patCr) * 100;
    }
  }
  if (revenueGrowth === null) {
    revenueGrowth = parseIndianNumber(resolveFirstFact(["revenue_growth", "revenue_growth_pct"], "revenueGrowth", "financials"));
  }
  if (patGrowth === null) {
    patGrowth = parseIndianNumber(resolveFirstFact(["pat_growth", "pat_growth_pct", "profit_growth"], "patGrowth", "financials"));
  }

  // Audit these resolves
  if (latestPAT !== null) {
    auditList.push({
      fieldName: "latestPAT",
      displayValue: `₹${latestPAT} Cr`,
      sourceFactKey: "pat_latest",
      sourceProvider: getFact(factRows, "pat_latest")?.source_provider ?? "CHITTORGARH",
      confidence: "high",
      usedInSection: "financials",
      missingReason: null,
    });
  }

  let financialsStatus: IPOResearchView["financials"]["status"] = "Source-limited";
  if (yearlyRows.length >= 2 && latestRevenue && latestPAT) {
    financialsStatus = "Complete";
  } else if (yearlyRows.length > 0 || latestRevenue) {
    financialsStatus = "Partial";
  }

  // --- Demand / Subscription Section ---
  const subTableRaw = getFactValue(factRows, "subscription_table") ?? ipo.subscription_breakup ?? [];
  const subscriptionTable: IPOResearchView["demand"]["subscriptionTable"] = [];

  const categoryMap: Record<string, "QIB" | "NII" | "Retail" | "Total"> = {
    "qib (ex anchor)": "QIB",
    "qib": "QIB",
    "qualified institutional buyers": "QIB",
    "nii": "NII",
    "non-institutional buyers": "NII",
    "non institutional": "NII",
    "hni": "NII",
    "retail": "Retail",
    "retail individual investors": "Retail",
    "retailers": "Retail",
    "riis": "Retail",
    "total": "Total",
    "total*": "Total",
  };

  if (Array.isArray(subTableRaw)) {
    for (const row of subTableRaw) {
      if (!row || typeof row !== "object") continue;
      const rawCat = String(row.category ?? row.Category ?? row.Investor_Category ?? Object.values(row)[0] ?? "").trim();
      const lowerCat = rawCat.toLowerCase();
      let normCat = categoryMap[lowerCat];
      if (!normCat && !lowerCat.startsWith("-")) {
        if (lowerCat.includes("qib") || lowerCat.includes("qualified institutional")) normCat = "QIB";
        else if (lowerCat.includes("nii") || lowerCat.includes("non-institutional") || lowerCat.includes("non institutional")) normCat = "NII";
        else if (lowerCat.includes("retail") || lowerCat.includes("rii")) normCat = "Retail";
        else if (lowerCat.includes("total")) normCat = "Total";
      }
      if (!normCat) continue;

      let offeredVal = String(row.offered ?? row.Offered ?? row["Shares Offered"] ?? row["No of Shares Offered"] ?? row["Reserved"] ?? row["Shares Reserved"] ?? row.reserved_applications ?? "-").trim();
      let appliedVal = String(
        row.applied ??
        row.Applied ??
        row["Shares Applied"] ??
        row["Shares Applied For"] ??
        row["No of Shares Applied"] ??
        row["Shares Bid"] ??
        row["No of Shares Bid"] ??
        row["Bids"] ??
        row["Bidded"] ??
        row.applied_applications ??
        "-"
      ).trim();

      const timesVal = parseIndianNumber(
        row.times ??
        row.Times ??
        row["Times Subscribed"] ??
        row["Subscription (Times)"] ??
        row.times_subscribed ??
        row.subscription ??
        row.total_x ??
        row.retail_x ??
        row.nii_x ??
        row.qib_x
      );

      // Total offered/applied logic
      if (normCat === "Total" && (offeredVal === "-" || !offeredVal)) {
        offeredVal = "-";
        appliedVal = "-";
      }

      subscriptionTable.push({
        category: normCat,
        offered: offeredVal,
        applied: appliedVal,
        times: timesVal ?? (normCat === "QIB" ? qibTimes : normCat === "NII" ? niiTimes : normCat === "Retail" ? retailTimes : totalTimes),
      });
    }
  }

  // Ensure subscriptionTable has standard categories if not populated
  const missingCategories = (["QIB", "NII", "Retail", "Total"] as const).filter(
    (c) => !subscriptionTable.some((row) => row.category === c)
  );

  for (const c of missingCategories) {
    subscriptionTable.push({
      category: c,
      offered: "-",
      applied: "-",
      times: c === "QIB" ? qibTimes : c === "NII" ? niiTimes : c === "Retail" ? retailTimes : totalTimes,
    });
  }

  // Order table standardly
  const orderIndex = { QIB: 0, NII: 1, Retail: 2, Total: 3 };
  subscriptionTable.sort((a, b) => orderIndex[a.category] - orderIndex[b.category]);

  let demandStatus: IPOResearchView["demand"]["status"] = "Source-limited";
  if (totalTimes !== null || retailTimes !== null) {
    demandStatus = "Complete";
  }

  // --- Lead Manager & Registrar ---
  const leadManagerName = resolveFact("lead_manager_name", "leadManagerName", "manager");
  let leadManagerStatus: IPOResearchView["manager"]["leadManagerStatus"] = "missing";
  if (leadManagerName) {
    leadManagerStatus = "history pending";
  }

  let leadManagerScore: number | null = null;
  const leadManagerHistory: IPOResearchView["manager"]["leadManagerHistory"] = [];

  // Registrar details
  const registrarName = resolveFact("registrar_name", "registrarName", "manager", ipo.registrar_name);
  const rawRegistrarContact = getFactValue(factRows, "registrar_contact");
  const registrarContact = rawRegistrarContact
    ? {
        phone: rawRegistrarContact.phone ?? null,
        email: rawRegistrarContact.email ?? null,
        website: rawRegistrarContact.website ?? null,
      }
    : null;

  // Market Maker details
  const marketMakerName = resolveFact("market_maker_name", "marketMakerName", "manager");
  const marketMakerPortion = resolveFact("market_maker_portion", "marketMakerPortion", "manager");

  let marketMakerStatus: IPOResearchView["manager"]["marketMakerStatus"] = "missing";
  if (marketMakerName) {
    marketMakerStatus = "linked";
  } else if (marketMakerPortion) {
    marketMakerStatus = "portion available; name pending";
  }

  // If DB profile was linked, merge its info
  if (leadManagerProfile) {
    leadManagerStatus = "linked";
    leadManagerScore = leadManagerProfile.score ?? null;
    if (Array.isArray(leadManagerProfile.history)) {
      leadManagerProfile.history.forEach((h: any) => {
        leadManagerHistory.push({
          ipoName: h.ipo_name,
          listingGainPct: h.listing_gain_percent ?? h.listing_gain_pct ?? null,
          day30ReturnPct: h.day_30_return_percent ?? h.day30_return_pct ?? null,
          listingDate: h.listing_date ?? h.issue_date ?? null,
        });
      });
    }
  }

  // --- Score calculation ---
  const scoringInput: IPOScoringInput = {
    category: ipo.category === "sme" ? "sme" : "mainboard",
    gmp: gmpValue ?? 0,
    hasCleanGovernance: true, // conservative fallback
    hasMarketMaker: marketMakerName !== null || marketMakerPortion !== null,
    hasObjectsOfIssue: hasUsableFact(factRows, "objects_of_issue"),
    hasPeerData: peerRows.length > 0,
    hasUseOfProceeds: hasUsableFact(factRows, "objects_of_issue"),
    ipoPE: pePostIpo,
    issuePrice: issuePrice ?? 0,
    leadManagerScore,
    marketMakerQuality: marketMakerName ? "average" : null,
    niiX: niiTimes ?? 0,
    patLatest: latestPAT ?? 0,
    patMargin: patMarginLatest ?? 0,
    patPrev: yearlyRows.at(-2)?.patCr ?? 0,
    promoterHolding: promoterHoldingPost ?? promoterHoldingPre ?? 0,
    qibX: qibTimes ?? 0,
    retailX: retailTimes ?? 0,
    revenueLatest: latestRevenue ?? 0,
    revenuePrev: yearlyRows.at(-2)?.revenueCr ?? 0,
    roce: latestROCE ?? 0,
    roe: latestROE ?? 0,
    sectorPE: peerAveragePE,
    totalX: totalTimes ?? 0,
    hasLeadManager: leadManagerName !== null,
  };

  const scoreResult = calculateIPOScore(scoringInput);

  // --- Risks section ---
  const risks: IPOResearchView["risk"]["risks"] = [];
  const isSME = ipo.category === "sme";

  if (isSME) {
    risks.push({
      title: "SME liquidity risk after listing",
      description: "SME shares can have lower trading volume after listing, so exiting may be harder than in large mainboard IPOs.",
      severity: "MEDIUM",
    });
  }

  if (retailTimes !== null) {
    if (retailTimes > 50) {
      risks.push({
        title: "Very low allotment chance",
        description: "Retail subscription is very high, so many valid bids compete for limited retail shares.",
        severity: "HIGH",
      });
    } else if (retailTimes > 10) {
      risks.push({
        title: "Low allotment chance",
        description: "Retail subscription is above available shares, so allotment is not assured.",
        severity: "MEDIUM",
      });
    } else if (retailTimes > 1) {
      risks.push({
        title: "Retail category oversubscription",
        description: "Retail demand is above the shares available in that category.",
        severity: "WATCH",
      });
    }
  }

  if (leadManagerStatus === "history pending" && isSME) {
    risks.push({
      title: "Lead manager track record pending",
      description: "Lead manager is identified but their detailed historical track record has not been calculated yet.",
      severity: "MEDIUM",
    });
  } else if (leadManagerStatus === "missing") {
    risks.push({
      title: "Lead manager track record missing",
      description: "Lead manager details are not verified, lowering overall visibility into quality.",
      severity: "MEDIUM",
    });
  }

  if (gmpPercent !== null && gmpPercent > 40) {
    risks.push({
      title: "GMP volatility risk",
      description: "High unofficial grey market premium indicates strong listing interest but can reverse quickly based on market sentiment.",
      severity: "WATCH",
    });
  }

  const objectsText = getFactValue(factRows, "objects_of_issue");
  if (!objectsText) {
    risks.push({
      title: "Use of proceeds not verified",
      description: "Detailed object of the issue (use of IPO proceeds) is not verified from formal prospectus filings.",
      severity: "WATCH",
    });
  }

  if (pePostIpo !== null && peerAveragePE !== null && pePostIpo > peerAveragePE * 1.1) {
    risks.push({
      title: "Valuation above peer average",
      description: "The IPO P/E is above the peer average, so valuation comfort is lower on this metric.",
      severity: "MEDIUM",
    });
  }

  if ((revenueGrowth !== null && revenueGrowth < 0) || (patGrowth !== null && patGrowth < 0)) {
    risks.push({
      title: "Weak growth trend",
      description: "Latest available growth is negative in revenue or profit after tax.",
      severity: "MEDIUM",
    });
  }

  const category = ipo.category === "sme" ? "sme" : "mainboard";
  const missingFor = (sectionName: string) =>
    auditList
      .filter((entry) => entry.usedInSection === sectionName && entry.missingReason)
      .map((entry) => `${entry.fieldName}: ${entry.missingReason}`);

  const hero: IPOResearchView["hero"] = {
    name: ipo.name,
    slug: ipo.slug,
    category,
    exchange: exchange ?? "NSE/BSE",
    status: ipo.status ?? "upcoming",
    openDate,
    closeDate,
    listingDate,
    allotmentDate,
    refundDate,
    priceBand: rawPriceBand,
    priceBandLow,
    priceBandHigh,
    issuePrice,
    issueSizeCr,
    lotSize,
    minInvestment,
    gmpValue,
    gmpPercent,
    listingEstimate,
    allotmentChancePct,
    retailSubscription: retailTimes,
    totalSubscription: totalTimes,
    drhpUrl,
    rhpUrl,
    prospectusUrl,
    description: companyDescription,
    promoterHoldingPre,
    promoterHoldingPost,
  };

  const company: IPOResearchView["company"] = {
    description: companyDescription,
    sector,
    productsServices,
    manufacturingFacilities,
    website: contact?.website ?? null,
    promoters,
    headquarters,
    promoterHoldingPre,
    promoterHoldingPost,
    employeeCount,
    contact,
    status: companyStatus,
  };

  const valuation: IPOResearchView["valuation"] = {
    ipoPE: pePostIpo,
    preIpoPE: pePreIpo,
    eps: epsPostIpo,
    priceToBook,
    marketCap,
    peerRows,
    peerAveragePE,
    peerHighPE,
    status: valuationStatus,
  };

  const financials: IPOResearchView["financials"] = {
    latestRevenue,
    latestPAT,
    latestPATMargin: patMarginLatest,
    latestEBITDA,
    latestEBITDAMargin,
    latestROE,
    latestROCE,
    revenueGrowth,
    patGrowth,
    yearlyRows,
    status: financialsStatus,
  };

  const demand: IPOResearchView["demand"] = {
    qibTimes,
    niiTimes,
    retailTimes,
    totalTimes,
    subscriptionTable,
    status: demandStatus,
  };

  const manager: IPOResearchView["manager"] = {
    leadManagerName,
    leadManagerStatus,
    leadManagerScore,
    leadManagerHistory,
    registrarName,
    registrarContact,
    marketMakerName,
    marketMakerPortion,
    marketMakerStatus,
  };

  const risk: IPOResearchView["risk"] = { risks };
  const scoreLabel = publicSignalLabel(scoreResult.score, scoreResult.missingData.length);
  const scoreConfidence = publicScoreConfidence(scoreResult.missingData.length);
  const productChips = deriveProductChips(productsServices, companyDescription);
  const documentLinks = [
    drhpUrl ? { label: "DRHP", url: drhpUrl } : null,
    rhpUrl ? { label: "RHP", url: rhpUrl } : null,
    prospectusUrl ? { label: "Prospectus", url: prospectusUrl } : null,
  ].filter((link): link is { label: string; url: string } => link !== null);

  let valuationConclusion: IPOResearchSections["valuation"]["values"]["conclusion"] = "Peer comparison source-limited";
  if (pePostIpo !== null && peerAveragePE !== null && peerAveragePE > 0) {
    if (pePostIpo < peerAveragePE * 0.9) valuationConclusion = "Priced below peer average";
    else if (pePostIpo <= peerAveragePE * 1.1) valuationConclusion = "Priced near peer average";
    else valuationConclusion = "Priced above peer average";
  } else if (pePostIpo !== null || peerRows.length > 0) {
    valuationConclusion = "Peer comparison source-limited";
  }

  const peerRowsWithPE = peerRows.filter((peer) => peer.peRatio !== null);
  const peerTableColumns: Array<"company" | "pe" | "cmp" | "roe"> = ["company", "pe"];
  if (peerRowsWithPE.length > 0 && peerRowsWithPE.every((peer) => peer.cmp !== null)) {
    peerTableColumns.push("cmp");
  }
  if (peerRowsWithPE.length > 0 && peerRowsWithPE.every((peer) => peer.roePct !== null)) {
    peerTableColumns.push("roe");
  }

  const comparisonBars: IPOResearchSections["valuation"]["values"]["comparisonBars"] = [];
  if (pePostIpo !== null) {
    comparisonBars.push({ label: "This IPO", value: pePostIpo, tone: "green" });
  }
  if (peerHighPE !== null) {
    comparisonBars.push({ label: "Peer companies", value: peerHighPE, tone: "slate" });
  }
  if (peerAveragePE !== null) {
    comparisonBars.push({ label: "Peer average", value: peerAveragePE, tone: "blue" });
  }

  const metricCards: ResearchMetricCard[] = [];
  if (gmpValue !== null) {
    metricCards.push({
      key: "gmp",
      label: "GMP",
      value: gmpPercent !== null ? `${fmtAmount(gmpValue)} / ${fmtPct(gmpPercent)}` : fmtAmount(gmpValue) ?? "",
      note: "Unofficial grey market signal",
      tone: gmpPercent !== null && gmpPercent > 0 ? "green" : "neutral",
    });
  }
  if (totalTimes !== null) {
    metricCards.push({
      key: "demand",
      label: "Total demand",
      value: fmtX(totalTimes) ?? "",
      note: "Overall subscription",
      tone: totalTimes > 1 ? "green" : "neutral",
    });
  }
  if (pePostIpo !== null) {
    metricCards.push({
      key: "valuation",
      label: "Valuation",
      value: fmtPE(pePostIpo) ?? "",
      note: peerAveragePE !== null ? `Peer average ${fmtPE(peerAveragePE)}` : "Peer context limited",
      tone: peerAveragePE !== null && pePostIpo <= peerAveragePE ? "green" : peerAveragePE !== null ? "amber" : "neutral",
    });
  }
  if (revenueGrowth !== null) {
    metricCards.push({
      key: "revenue_growth",
      label: "Revenue growth",
      value: fmtPct(revenueGrowth) ?? "",
      note: "Latest year-on-year",
      tone: revenueGrowth >= 0 ? "green" : "amber",
    });
  }
  if (minInvestment !== null) {
    metricCards.push({
      key: "minimum_investment",
      label: "Minimum investment",
      value: fmtAmount(minInvestment) ?? "",
      note: lotSize ? `${lotSize.toLocaleString("en-IN")} shares` : null,
      tone: "neutral",
    });
  }
  if (allotmentChancePct !== null) {
    metricCards.push({
      key: "allotment_chance",
      label: "Allotment chance",
      value: fmtPct(allotmentChancePct) ?? "",
      note: "Estimated from retail demand",
      tone: allotmentChancePct < 5 ? "amber" : "green",
    });
  }

  const quickSignals: ResearchQuickSignal[] = [];
  if (gmpPercent !== null && gmpPercent > 30) {
    quickSignals.push({
      key: "gmp_bullish",
      title: "Grey market is bullish",
      explanation: "GMP is above 30% of the issue price, based on unofficial market quotes.",
      metric: fmtPct(gmpPercent) ?? "",
      tone: "green",
    });
  }
  if (totalTimes !== null && totalTimes > 20) {
    quickSignals.push({
      key: "demand_high",
      title: "Demand is very high",
      explanation: "Total subscription is above 20x, showing strong demand in the available data.",
      metric: fmtX(totalTimes) ?? "",
      tone: "green",
    });
  }
  if (pePostIpo !== null && peerAveragePE !== null && pePostIpo < peerAveragePE) {
    quickSignals.push({
      key: "valuation_below_peer",
      title: "Priced below peer average",
      explanation: "IPO P/E is lower than the available peer average P/E.",
      metric: `${pePostIpo.toFixed(1)}x vs ${peerAveragePE.toFixed(1)}x`,
      tone: "green",
    });
  }
  if (revenueGrowth !== null && revenueGrowth > 0 && patMarginLatest !== null && patMarginLatest < 8) {
    quickSignals.push({
      key: "growth_thin_margin",
      title: "Business is growing but margins are thin",
      explanation: "Revenue growth is positive while the latest PAT margin remains below 8%.",
      metric: fmtPct(patMarginLatest) ?? "",
      tone: "amber",
    });
  }
  if (retailTimes !== null && retailTimes > 50) {
    quickSignals.push({
      key: "allotment_low",
      title: "Very hard to get shares",
      explanation: "Retail subscription is above 50x, so estimated allotment chance is low.",
      metric: allotmentChancePct !== null ? fmtPct(allotmentChancePct) ?? "" : fmtX(retailTimes) ?? "",
      tone: "amber",
    });
  }
  if (category === "sme") {
    quickSignals.push({
      key: "sme_liquidity",
      title: "SME liquidity risk",
      explanation: "SME listings can trade with lower post-listing volume than mainboard IPOs.",
      metric: "SME",
      tone: "amber",
    });
  }

  const trendBars = yearlyRows
    .filter((row) => row.revenueCr !== null)
    .map((row) => ({
      label: row.financialYear,
      revenueCr: row.revenueCr as number,
      patCr: row.patCr,
    }));

  const financialTableRows = yearlyRows.map((row) => ({
    period: row.financialYear,
    revenueCr: row.revenueCr,
    patCr: row.patCr,
    patMarginPct: row.patMarginPct,
  }));

  const subscriptionBars = [
    qibTimes !== null ? { category: "QIB" as const, times: qibTimes } : null,
    niiTimes !== null ? { category: "NII" as const, times: niiTimes } : null,
    retailTimes !== null ? { category: "Retail" as const, times: retailTimes } : null,
    totalTimes !== null ? { category: "Total" as const, times: totalTimes } : null,
  ].filter((bar): bar is { category: "QIB" | "NII" | "Retail" | "Total"; times: number } => bar !== null);

  const cleanSubscriptionRows = subscriptionTable
    .map((row) => ({
      category: row.category,
      offered: cleanShareText(row.offered),
      applied: cleanShareText(row.applied),
      times: row.times,
    }))
    .filter((row) => row.times !== null || row.offered !== null || row.applied !== null);

  const showOfferedColumn =
    cleanSubscriptionRows.length > 0 &&
    cleanSubscriptionRows.filter((row) => row.offered !== null).length >= Math.min(2, cleanSubscriptionRows.length);
  const showAppliedColumn =
    cleanSubscriptionRows.length > 0 &&
    cleanSubscriptionRows.every((row) => row.applied !== null);

  const historyWithListing = leadManagerHistory.filter((row) => row.listingGainPct !== null);
  const historyWithDay30 = leadManagerHistory.filter((row) => row.day30ReturnPct !== null);
  const scoreMeta = leadManagerProfile?.scores ?? null;
  const trackedIPOCount =
    parseIndianNumber(scoreMeta?.total_ipos_managed) ??
    (leadManagerHistory.length > 0 ? leadManagerHistory.length : null);
  const positiveListingRatePct =
    parseIndianNumber(scoreMeta?.positive_listing_percent) ??
    (historyWithListing.length > 0
      ? historyWithListing.filter((row) => (row.listingGainPct ?? 0) > 0).length / historyWithListing.length * 100
      : null);
  const aboveIssueAfter30DaysPct =
    historyWithDay30.length > 0
      ? historyWithDay30.filter((row) => (row.day30ReturnPct ?? 0) > 0).length / historyWithDay30.length * 100
      : null;
  const historyState: "tracked history" | "history pending" | "missing" =
    leadManagerName
      ? trackedIPOCount !== null && trackedIPOCount > 0
        ? "tracked history"
        : "history pending"
      : "missing";

  const timelineRows = [
    openDate ? { label: "Open date", value: String(openDate) } : null,
    closeDate ? { label: "Close date", value: String(closeDate) } : null,
    allotmentDate ? { label: "Allotment date", value: String(allotmentDate) } : null,
    refundDate ? { label: "Refund date", value: String(refundDate) } : null,
    listingDate ? { label: "Listing date", value: String(listingDate) } : null,
    rawPriceBand ? { label: "Price band", value: String(rawPriceBand) } : null,
    issueSizeCr !== null ? { label: "Issue size", value: fmtCr(issueSizeCr) ?? String(issueSizeCr) } : null,
    issuePrice !== null ? { label: "Issue price", value: fmtAmount(issuePrice) ?? String(issuePrice) } : null,
    lotSize !== null ? { label: "Lot size", value: `${lotSize.toLocaleString("en-IN")} shares` } : null,
    leadManagerName ? { label: "Lead manager", value: String(leadManagerName) } : null,
    registrarName ? { label: "Registrar", value: String(registrarName) } : null,
    marketMakerName ? { label: "Market maker", value: String(marketMakerName) } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  const scoreFactors = [
    { label: "GMP", points: scoreResult.breakdown.gmpScore },
    { label: "Demand", points: scoreResult.breakdown.demandScore },
    { label: "Financials", points: scoreResult.breakdown.financialScore },
    { label: "Valuation", points: scoreResult.breakdown.valuationScore },
    { label: "Lead manager", points: scoreResult.breakdown.leadManagerScore },
    { label: "Market maker", points: scoreResult.breakdown.marketMakerScore },
    { label: "Governance", points: scoreResult.breakdown.governanceScore },
    { label: "Risk adjustment", points: scoreResult.breakdown.riskAdjustment },
  ];

  const sections: IPOResearchSections = {
    hero: buildSection(
      { ...hero, sector, documentLinks },
      "complete",
      true,
      missingFor("hero")
    ),
    score: buildSection(
      {
        score: scoreResult.score,
        signalLabel: scoreLabel,
        confidence: scoreConfidence,
        potentialScore: scoreResult.potentialScore > scoreResult.score ? scoreResult.potentialScore : null,
        caveat: scoreResult.missingData[0] ?? null,
        scoreColor: scoreResult.scoreColor,
        breakdown: scoreResult.breakdown,
      },
      scoreConfidence === "Partial" ? "partial" : "complete",
      true,
      scoreResult.missingData
    ),
    metrics: buildSection(
      { cards: metricCards },
      metricCards.length >= 4 ? "complete" : "partial",
      metricCards.length > 0,
      []
    ),
    quickSignals: buildSection(
      { signals: quickSignals },
      quickSignals.length >= 3 ? "complete" : "partial",
      quickSignals.length >= 2,
      []
    ),
    company: buildSection(
      { ...company, productChips, employeeCount },
      sectionStatusFromLegacy(companyStatus),
      hasText(companyDescription) || productChips.length > 0 || hasText(productsServices),
      missingFor("company")
    ),
    valuation: buildSection(
      { ...valuation, conclusion: valuationConclusion, peerTableColumns, comparisonBars },
      sectionStatusFromLegacy(valuationStatus),
      pePostIpo !== null || peerRowsWithPE.length > 0,
      missingFor("valuation")
    ),
    financials: buildSection(
      { ...financials, trendBars, tableRows: financialTableRows },
      sectionStatusFromLegacy(financialsStatus),
      latestRevenue !== null || latestPAT !== null || financialTableRows.length > 0,
      missingFor("financials")
    ),
    demand: buildSection(
      {
        ...demand,
        gmp: { issuePrice, gmpValue, gmpPercent, listingEstimate },
        allotmentChancePct,
        subscriptionBars,
        cleanSubscriptionRows,
        showOfferedColumn,
        showAppliedColumn,
      },
      demandStatus === "Complete" && gmpValue !== null ? "complete" : "partial",
      gmpValue !== null || subscriptionBars.length > 0,
      missingFor("demand")
    ),
    manager: buildSection(
      {
        ...manager,
        historyState,
        trackedIPOCount,
        positiveListingRatePct,
        aboveIssueAfter30DaysPct,
      },
      historyState === "tracked history" ? "complete" : historyState === "history pending" ? "partial" : "source_limited",
      leadManagerName !== null || registrarName !== null,
      missingFor("manager")
    ),
    risks: buildSection(
      risk,
      risks.some((item) => item.severity === "HIGH") ? "needs_review" : "partial",
      risks.length >= 2,
      []
    ),
    detailedAnalysis: buildSection(
      {
        score: scoreResult.score,
        signalLabel: scoreLabel,
        factorPoints: scoreFactors,
        missingData: scoreResult.missingData,
        notes: [
          "The IPO Lens score is rule-based and uses only normalized source data.",
          "GMP is unofficial and can reverse quickly.",
          "P/E compares price with earnings; lower or higher values need sector context.",
        ],
      },
      scoreConfidence === "Partial" ? "partial" : "complete",
      true,
      scoreResult.missingData
    ),
    timeline: buildSection(
      { rows: timelineRows },
      timelineRows.length >= 6 ? "complete" : "partial",
      timelineRows.length >= 2,
      missingFor("hero").concat(missingFor("manager"))
    ),
    rawAudit: buildSection(
      { dataPointCount: auditList.length, rows: auditList },
      "complete",
      auditList.length > 0,
      []
    ),
  };

  return {
    hero,
    score: scoreResult,
    company,
    valuation,
    financials,
    demand,
    manager,
    risk,
    rawAudit: auditList,
    sections,
  };
}
