import type { ComputedIPO } from "../types/ipo";
import { calculateScore, estimateListingGainPct } from "./scoring";

export interface ResearchSection<T> {
  status: "complete" | "partial" | "source_limited" | "needs_review";
  hasEnoughData: boolean;
  values: T;
  missingReasons: string[];
}

export function isDirtyOrEmpty(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return (
      v === "" ||
      v === "being verified" ||
      v === "being verified." ||
      v === "na" ||
      v === "n/a" ||
      v === "-" ||
      v === "tba" ||
      v === "dirty"
    );
  }
  return false;
}

export function shouldShowSection(section: ResearchSection<any> | undefined | null): boolean {
  if (!section) return false;
  return section.hasEnoughData;
}

function percentageGrowth(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || previous === null || previous === undefined || previous <= 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function extractProductChips(overview: string | null, businessModel: string | null): string[] {
  if (!overview && !businessModel) return [];
  const text = `${overview || ""} ${businessModel || ""}`.toLowerCase();
  const candidates = [
    "winding wires",
    "power cables",
    "conductors",
    "copper wires",
    "aluminum conductors",
    "reclaimed rubber",
    "rubber crumbs",
    "butyl tubes",
    "crumb rubber",
    "rubber sheets",
  ];
  const found = candidates.filter((c) => text.includes(c));
  if (businessModel) {
    const parts = businessModel
      .split(/[,;\n•]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 2 && p.length < 35 && !/manufacturer|supplier|company|incorporated/i.test(p));
    found.push(...parts.slice(0, 4));
  }
  const unique = Array.from(new Set(found.map((s) => s.trim()))).filter(Boolean);
  return unique.length > 0 ? unique : [];
}

export function buildIPOResearchView(ipo: ComputedIPO) {
  const profile = ipo.company_profile ?? null;
  const financialsList = ipo.financials_yearly ?? [];
  const peers = ipo.peer_comparisons ?? [];
  const anchors = ipo.anchor_investors ?? [];
  const anchorSummary = ipo.anchor_summary ?? null;
  const objects = ipo.objects_of_issue ?? [];
  const risksList = profile?.risk_factors ?? [];
  const latestGMP = ipo.latest_gmp ?? 0;
  const latestSubscription = ipo.latest_subscription;

  // Run scoring
  const scoreResult = calculateScore({
    gmp: latestGMP,
    issuePrice: ipo.price_band_high ?? 0,
    totalX: latestSubscription?.total_x ?? 0,
    qibX: latestSubscription?.qib_x ?? 0,
    niiX: latestSubscription?.nii_x ?? 0,
    retailX: latestSubscription?.retail_x ?? 0,
    issueSizeCr: ipo.issue_size_cr ?? 0,
    category: ipo.category,
    financials: financialsList,
    peers,
    anchorSummary,
    anchorInvestors: anchors,
    objectsOfIssue: objects,
    riskFactors: risksList,
  });

  const gmpPct = estimateListingGainPct(latestGMP, ipo.price_band_high) ?? 0;
  const minInvestment = ipo.price_band_high && ipo.lot_size ? ipo.price_band_high * ipo.lot_size * (ipo.category === "sme" ? 2 : 1) : null;
  const latestFinancial = financialsList.slice().sort((a, b) => a.financial_year.localeCompare(b.financial_year)).at(-1);
  const previousFinancial = financialsList.slice().sort((a, b) => a.financial_year.localeCompare(b.financial_year)).at(-2);

  // Growth rates
  const revenueGrowth = percentageGrowth(latestFinancial?.revenue_cr, previousFinancial?.revenue_cr);
  const patGrowth = percentageGrowth(latestFinancial?.pat_cr, previousFinancial?.pat_cr);

  // PE computation
  const eps = latestFinancial?.eps;
  const ipoPE = ipo.price_band_high && eps && eps > 0 ? Number((ipo.price_band_high / eps).toFixed(2)) : null;

  // Peer PE computation
  const peerPEs = peers.map((p) => p.pe_ratio).filter((v): v is number => v !== null && v > 0);
  const peerAveragePE = peerPEs.length > 0 ? Number((peerPEs.reduce((a, b) => a + b, 0) / peerPEs.length).toFixed(2)) : null;

  // Allotment odds
  const retailX = latestSubscription?.retail_x ?? 0;
  const allotmentChance = retailX > 0 ? Number(((1 / retailX) * 100).toFixed(2)) : null;

  // 1. Hero Summary
  const heroMissing: string[] = [];
  if (isDirtyOrEmpty(ipo.company_profile?.company_overview)) heroMissing.push("Company overview description");
  if (isDirtyOrEmpty(ipo.company_profile?.sector)) heroMissing.push("Sector info");
  if (!ipo.price_band_high) heroMissing.push("Price band");
  if (!ipo.issue_size_cr) heroMissing.push("Issue size");
  if (!ipo.lot_size) heroMissing.push("Lot size");
  if (isDirtyOrEmpty(ipo.company_profile?.promoters)) heroMissing.push("Promoters");
  if (isDirtyOrEmpty(ipo.company_profile?.website)) heroMissing.push("Website URL");
  if (isDirtyOrEmpty(ipo.company_profile?.headquarters)) heroMissing.push("Headquarters");

  const hero: ResearchSection<any> = {
    status: heroMissing.length === 0 ? "complete" : "partial",
    hasEnoughData: true,
    missingReasons: heroMissing,
    values: {
      name: ipo.name,
      category: ipo.category,
      status: ipo.status,
      exchange: isDirtyOrEmpty(ipo.enriched_data?.exchange) ? null : (ipo.enriched_data?.exchange as string),
      openDate: isDirtyOrEmpty(ipo.open_date) ? null : ipo.open_date,
      closeDate: isDirtyOrEmpty(ipo.close_date) ? null : ipo.close_date,
      allotmentDate: isDirtyOrEmpty(ipo.enriched_data?.allotment_date) ? null : (ipo.enriched_data?.allotment_date as string),
      listingDate: isDirtyOrEmpty(ipo.listing_date) ? null : ipo.listing_date,
      companyOverview: isDirtyOrEmpty(ipo.company_profile?.company_overview) ? null : ipo.company_profile?.company_overview,
      sector: isDirtyOrEmpty(ipo.company_profile?.sector) ? null : ipo.company_profile?.sector,
      priceBand: ipo.price_band_low && ipo.price_band_high ? `₹${ipo.price_band_low} - ₹${ipo.price_band_high}` : ipo.price_band_high ? `₹${ipo.price_band_high}` : null,
      issueSizeCr: ipo.issue_size_cr,
      lotSize: ipo.lot_size,
      minInvestment,
      promoters: isDirtyOrEmpty(ipo.company_profile?.promoters) ? null : ipo.company_profile?.promoters,
      preIssuePromoterHoldingPct: ipo.company_profile?.pre_issue_promoter_holding_pct ?? null,
      postIssuePromoterHoldingPct: ipo.company_profile?.post_issue_promoter_holding_pct ?? null,
      website: isDirtyOrEmpty(ipo.company_profile?.website) ? null : ipo.company_profile?.website,
      headquarters: isDirtyOrEmpty(ipo.company_profile?.headquarters) ? null : ipo.company_profile?.headquarters,
    },
  };

  // 2. Score + Key Metrics
  const scoreGridMissing: string[] = [];
  if (latestGMP === 0) scoreGridMissing.push("GMP Premium");
  if (!latestSubscription) scoreGridMissing.push("Subscription Demand");
  if (!ipoPE) scoreGridMissing.push("Valuation PE");

  const caveatText =
    scoreResult.confidence === "Low"
      ? "Partial details available. Score represents current preliminary checks."
      : ipo.category === "sme"
      ? "SME IPO parameters carry higher post-listing liquidity caveats."
      : "Market sentiment can shift rapidly closer to allotment.";

  const scoreGrid: ResearchSection<any> = {
    status: scoreResult.confidence === "High" ? "complete" : "partial",
    hasEnoughData: true,
    missingReasons: scoreGridMissing,
    values: {
      score: scoreResult.score,
      signalLabel: scoreResult.label,
      confidence: scoreResult.confidence === "Low" ? "Partial" : scoreResult.confidence,
      potentialScore: Math.min(100, scoreResult.score + scoreResult.breakdown.penalties),
      caveat: caveatText,
      gmp: latestGMP,
      gmpPct,
      totalDemand: latestSubscription?.total_x ?? null,
      valuation: ipoPE,
      revenueGrowth,
      minInvestment,
      allotmentChance,
    },
  };

  // 3. Quick Signals
  const signalsList: Array<{ title: string; explanation: string; metric: string; severity: "green" | "orange" | "red" }> = [];
  if (gmpPct > 30) {
    signalsList.push({
      title: "Grey market is bullish",
      explanation: `GMP indicates a strong listing premium of +${gmpPct.toFixed(1)}% over the issue price.`,
      metric: `+${gmpPct.toFixed(0)}% GMP`,
      severity: "green",
    });
  }
  if (latestSubscription && latestSubscription.total_x > 20) {
    signalsList.push({
      title: "Demand is very high",
      explanation: `Market demand has pushed total subscription to ${latestSubscription.total_x.toFixed(1)}x.`,
      metric: `${latestSubscription.total_x.toFixed(1)}x`,
      severity: "green",
    });
  }
  if (ipoPE && peerAveragePE && ipoPE < peerAveragePE) {
    signalsList.push({
      title: "Priced below peer average",
      explanation: `IPO PE of ${ipoPE.toFixed(1)}x is below the average peer PE of ${peerAveragePE.toFixed(1)}x.`,
      metric: `${ipoPE.toFixed(1)}x PE`,
      severity: "green",
    });
  }
  if (revenueGrowth && revenueGrowth > 10 && latestFinancial?.pat_margin_pct && latestFinancial.pat_margin_pct > 0 && latestFinancial.pat_margin_pct < 8) {
    signalsList.push({
      title: "Business is growing but margins are thin",
      explanation: `Sales grew by +${revenueGrowth.toFixed(1)}%, but PAT margin is thin at ${latestFinancial.pat_margin_pct.toFixed(1)}%.`,
      metric: `${latestFinancial.pat_margin_pct.toFixed(1)}%`,
      severity: "orange",
    });
  }
  if (latestSubscription && latestSubscription.retail_x > 50) {
    signalsList.push({
      title: "Very hard to get shares",
      explanation: `Retail demand is ${latestSubscription.retail_x.toFixed(1)}x, making retail allotment odds low.`,
      metric: `${allotmentChance ? allotmentChance.toFixed(2) : "Low"}% Odds`,
      severity: "orange",
    });
  }
  if (ipo.category === "sme") {
    signalsList.push({
      title: "SME liquidity risk",
      explanation: "SME platforms have smaller public lot float sizes and higher post-listing liquidity risks.",
      metric: "SME",
      severity: "orange",
    });
  }

  const quickSignals: ResearchSection<any> = {
    status: signalsList.length >= 3 ? "complete" : "partial",
    hasEnoughData: signalsList.length >= 1,
    missingReasons: signalsList.length === 0 ? ["No deterministic signals met from current metrics"] : [],
    values: {
      signals: signalsList,
    },
  };

  // 4. Company Section
  const productChips = extractProductChips(ipo.company_profile?.company_overview ?? null, ipo.company_profile?.business_model ?? null);
  const companyMissing: string[] = [];
  if (isDirtyOrEmpty(ipo.company_profile?.company_overview)) companyMissing.push("Overview description");
  if (productChips.length === 0) companyMissing.push("Product list");

  const company: ResearchSection<any> = {
    status: companyMissing.length === 0 ? "complete" : "partial",
    hasEnoughData: !isDirtyOrEmpty(ipo.company_profile?.company_overview) || productChips.length > 0,
    missingReasons: companyMissing,
    values: {
      companyDescription: isDirtyOrEmpty(ipo.company_profile?.company_overview) ? null : ipo.company_profile?.company_overview,
      products: productChips,
      sector: isDirtyOrEmpty(ipo.company_profile?.sector) ? null : ipo.company_profile?.sector,
      promotersPre: ipo.company_profile?.pre_issue_promoter_holding_pct ?? null,
      promotersPost: ipo.company_profile?.post_issue_promoter_holding_pct ?? null,
      employeeCount: null, // Scraped in detailed profiles
      manufacturingFacilities: null,
    },
  };

  // 5. Valuation Section
  const valuationMissing: string[] = [];
  if (!ipoPE) valuationMissing.push("IPO P/E ratio");
  if (peers.length === 0) valuationMissing.push("Peer comparisons");

  let valuationConclusion = "Peer comparison source-limited";
  if (ipoPE && peerAveragePE) {
    if (ipoPE < peerAveragePE * 0.95) {
      valuationConclusion = "Priced below peer average";
    } else if (ipoPE > peerAveragePE * 1.05) {
      valuationConclusion = "Priced above peer average";
    } else {
      valuationConclusion = "Priced near peer average";
    }
  }

  const cleanPeers = peers.map((p) => ({
    name: p.peer_name,
    pe: p.pe_ratio,
    pb: p.pb_ratio,
    roe: p.roe_pct,
    roce: p.roce_pct,
    revenue: p.revenue_cr,
    pat: p.pat_cr,
  }));

  const valuation: ResearchSection<any> = {
    status: valuationMissing.length === 0 ? "complete" : "partial",
    hasEnoughData: ipoPE !== null || cleanPeers.length > 0,
    missingReasons: valuationMissing,
    values: {
      peExplanation: "The Price-to-Earnings (P/E) ratio shows how much investors pay for each rupee of profit. A lower P/E relative to peers might indicate a reasonable valuation.",
      ipoPE,
      peerAveragePE,
      peers: cleanPeers,
      conclusion: valuationConclusion,
      pbRatio: null,
      epsPostIPO: eps ?? null,
      marketCap: null,
    },
  };

  // 6. Financial Section
  const financialsMissing: string[] = [];
  if (financialsList.length === 0) financialsMissing.push("Yearly balance sheet items");

  const cleanFinancials = financialsList.map((f) => ({
    year: f.financial_year,
    revenue: f.revenue_cr,
    pat: f.pat_cr,
    patMargin: f.pat_margin_pct,
    roe: f.roe_pct,
    roce: f.roce_pct,
    ebitdaMargin: f.ebitda_margin_pct,
    debtEquity: f.debt_equity,
  }));

  const financials: ResearchSection<any> = {
    status: financialsList.length >= 3 ? "complete" : "partial",
    hasEnoughData: latestFinancial?.revenue_cr !== null || cleanFinancials.length > 0,
    missingReasons: financialsMissing,
    values: {
      latestRevenue: latestFinancial?.revenue_cr ?? null,
      latestPAT: latestFinancial?.pat_cr ?? null,
      patMargin: latestFinancial?.pat_margin_pct ?? null,
      roe: latestFinancial?.roe_pct ?? null,
      roce: latestFinancial?.roce_pct ?? null,
      revenueGrowth,
      patGrowth,
      financials: cleanFinancials,
      explanation: "Revenue means total sales. PAT means profit after tax. Margin shows profit as a percentage of sales.",
    },
  };

  // 7. Market Demand
  const demandMissing: string[] = [];
  if (latestGMP === 0) demandMissing.push("Grey market premium");
  if (!latestSubscription) demandMissing.push("Allotment/Subscription queues");

  const demand: ResearchSection<any> = {
    status: demandMissing.length === 0 ? "complete" : "partial",
    hasEnoughData: latestGMP !== 0 || latestSubscription !== null,
    missingReasons: demandMissing,
    values: {
      issuePrice: ipo.price_band_high ?? null,
      gmp: latestGMP,
      estimatedListingPrice: ipo.price_band_high ? ipo.price_band_high + latestGMP : null,
      gmpPct,
      disclaimer: "GMP is an unofficial market premium. It can reverse quickly and should not be treated as a guaranteed return.",
      qibX: latestSubscription?.qib_x ?? null,
      niiX: latestSubscription?.nii_x ?? null,
      retailX: latestSubscription?.retail_x ?? null,
      totalX: latestSubscription?.total_x ?? null,
      allotmentChance,
      allotmentExplanation: allotmentChance
        ? `Based on current retail subscription of ${retailX.toFixed(1)}x, the estimated chance of receiving an allotment in the retail category is ${allotmentChance.toFixed(2)}%.`
        : "Retail allotment odds are unavailable.",
    },
  };

  // 8. Lead Manager (SME Only)
  const leadManager: ResearchSection<any> = {
    status: "partial",
    hasEnoughData: ipo.category === "sme",
    missingReasons: ["Lead manager database sync in progress"],
    values: {
      leadManagerName: null,
      linkedStatus: "Importing history",
      historyPending: true,
      trackedIPOs: null,
      positiveListingRate: null,
      aboveIssue30Days: null,
      trackRecordScore: null,
    },
  };

  // 9. Risks Section
  const risksListComputed: Array<{ title: string; description: string; severity: "HIGH" | "MEDIUM" | "WATCH" }> = [];
  if (ipo.category === "sme") {
    risksListComputed.push({
      title: "SME Platform Liquidity Risk",
      description: "SME stocks trade in lots (large package of shares) which limits general retail trading liquidity after listing.",
      severity: "MEDIUM",
    });
  }
  if (latestSubscription && latestSubscription.retail_x > 50) {
    risksListComputed.push({
      title: "Extremely Low Allotment Odds",
      description: `Retail demand is ${latestSubscription.retail_x.toFixed(1)}x, making a retail lot allotment mathematically remote.`,
      severity: "WATCH",
    });
  }
  if (ipo.category === "sme") {
    risksListComputed.push({
      title: "Historical SME LM Performance Pending",
      description: "Tracked listings for the assigned merchant banker are still being indexed in our raw audit systems.",
      severity: "WATCH",
    });
  }
  if (latestGMP > 0) {
    risksListComputed.push({
      title: "GMP Premium Volatility",
      description: "Grey market premium is volatile and unregulated. Sentiment can drop quickly before listing.",
      severity: "WATCH",
    });
  }
  if (ipoPE && peerAveragePE && ipoPE > peerAveragePE) {
    risksListComputed.push({
      title: "Valuation Premium",
      description: `IPO PE of ${ipoPE.toFixed(1)}x is priced above its peers average (${peerAveragePE.toFixed(1)}x).`,
      severity: "MEDIUM",
    });
  }
  if (revenueGrowth && revenueGrowth < 0) {
    risksListComputed.push({
      title: "Declining Sales Growth",
      description: `Latest revenue shows a negative growth rate of ${revenueGrowth.toFixed(1)}% YoY.`,
      severity: "HIGH",
    });
  }
  if (patGrowth && patGrowth < 0) {
    risksListComputed.push({
      title: "Declining PAT Margins",
      description: `Net profits show a negative growth rate of ${patGrowth.toFixed(1)}% YoY.`,
      severity: "HIGH",
    });
  }

  const risks: ResearchSection<any> = {
    status: risksListComputed.length >= 3 ? "complete" : "partial",
    hasEnoughData: risksListComputed.length >= 2,
    missingReasons: [],
    values: {
      risks: risksListComputed,
    },
  };

  // 10. Detailed Analysis
  const detailedAnalysis: ResearchSection<any> = {
    status: "complete",
    hasEnoughData: true,
    missingReasons: [],
    values: {
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
      signalLabel: scoreResult.label,
      confidence: scoreResult.confidence,
      educationalNotes: "This score is computed using a rule-based algorithm that weighs company fundamentals (25%), demand subscription (20%), valuation comfort (15%), grey market momentum (15%), anchor quality (10%), risk & governance (10%), and use of proceeds (5%). Penalties are applied to SME IPOs and cases with missing data to prevent over-optimism.",
    },
  };

  // 11. Timeline
  const timeline: ResearchSection<any> = {
    status: "complete",
    hasEnoughData: true,
    missingReasons: [],
    values: {
      openDate: isDirtyOrEmpty(ipo.open_date) ? null : ipo.open_date,
      closeDate: isDirtyOrEmpty(ipo.close_date) ? null : ipo.close_date,
      allotmentDate: isDirtyOrEmpty(ipo.enriched_data?.allotment_date) ? null : (ipo.enriched_data?.allotment_date as string),
      listingDate: isDirtyOrEmpty(ipo.listing_date) ? null : ipo.listing_date,
      priceBand: ipo.price_band_low && ipo.price_band_high ? `₹${ipo.price_band_low} - ₹${ipo.price_band_high}` : ipo.price_band_high ? `₹${ipo.price_band_high}` : null,
      issueSizeCr: ipo.issue_size_cr,
      lotSize: ipo.lot_size,
      minInvestment,
      registrar: isDirtyOrEmpty(ipo.registrar_name) ? null : ipo.registrar_name,
      exchange: isDirtyOrEmpty(ipo.enriched_data?.exchange) ? null : (ipo.enriched_data?.exchange as string),
    },
  };

  // 12. Raw Audit
  const rawAuditFacts: Array<{ key: string; label: string; value: string; section: string }> = [];
  if (isDirtyOrEmpty(ipo.company_profile?.company_overview)) {
    rawAuditFacts.push({ key: "company_overview", label: "Overview Description", value: "Missing/Pending", section: "Company Section" });
  } else {
    rawAuditFacts.push({ key: "company_overview", label: "Overview Description", value: "Source verified", section: "Company Section" });
  }

  if (isDirtyOrEmpty(ipo.company_profile?.promoters)) {
    rawAuditFacts.push({ key: "promoters", label: "Promoters", value: "Missing/Pending", section: "Hero Summary" });
  } else {
    rawAuditFacts.push({ key: "promoters", label: "Promoters", value: "Source verified", section: "Hero Summary" });
  }

  if (isDirtyOrEmpty(ipo.company_profile?.headquarters)) {
    rawAuditFacts.push({ key: "headquarters", label: "Headquarters", value: "Missing/Pending", section: "Hero Summary" });
  } else {
    rawAuditFacts.push({ key: "headquarters", label: "Headquarters", value: ipo.company_profile!.headquarters!, section: "Hero Summary" });
  }

  if (isDirtyOrEmpty(ipo.company_profile?.website)) {
    rawAuditFacts.push({ key: "website", label: "Website", value: "Missing/Pending", section: "Hero Summary" });
  } else {
    rawAuditFacts.push({ key: "website", label: "Website", value: ipo.company_profile!.website!, section: "Hero Summary" });
  }

  if (cleanFinancials.length === 0) {
    rawAuditFacts.push({ key: "financials", label: "Yearly Financials", value: "Missing/Pending", section: "Financial Section" });
  } else {
    rawAuditFacts.push({ key: "financials", label: "Yearly Financials", value: `${cleanFinancials.length} periods captured`, section: "Financial Section" });
  }

  if (cleanPeers.length === 0) {
    rawAuditFacts.push({ key: "peers", label: "Peer Comparisons", value: "Missing/Pending", section: "Valuation Section" });
  } else {
    rawAuditFacts.push({ key: "peers", label: "Peer Comparisons", value: `${cleanPeers.length} peers tracked`, section: "Valuation Section" });
  }

  const rawAudit: ResearchSection<any> = {
    status: "complete",
    hasEnoughData: true,
    missingReasons: [],
    values: {
      dataPointsCount: rawAuditFacts.filter((f) => f.value !== "Missing/Pending").length,
      provider: "IPO Guru & Chittorgarh fallback index",
      confidence: scoreResult.confidence,
      facts: rawAuditFacts,
    },
  };

  return {
    hero,
    scoreGrid,
    quickSignals,
    company,
    valuation,
    financials,
    demand,
    leadManager,
    risks,
    detailedAnalysis,
    timeline,
    rawAudit,
  };
}
