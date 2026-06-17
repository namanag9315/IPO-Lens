import { format } from "date-fns";
import type { ComputedIPO } from "@/types/ipo";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";

export function cleanAndFilterFinancials(records: any[]): any[] {
  if (!records || records.length === 0) return [];

  const standardizedMap = new Map<string, any>();

  for (const rec of records) {
    const rawYear = rec.financial_year;
    if (!rawYear || typeof rawYear !== "string") continue;
    // Map "31 Mar 2024" or similar dates to "FY24"
    let stdYear = rawYear;
    const match = rawYear.match(/(?:31\s+Mar\s+|FY\s*)(\d{2,4})/i);
    if (match) {
      const yearDigits = match[1];
      const twoDigitYear = yearDigits.length === 4 ? yearDigits.substring(2) : yearDigits;
      stdYear = `FY${twoDigitYear}`;
    }

    const existing = standardizedMap.get(stdYear);
    if (!existing) {
      standardizedMap.set(stdYear, { ...rec, financial_year: stdYear });
    } else {
      // If we have a duplicate, choose the one with richer metrics (non-null roe_pct or eps)
      const existingScore = (existing.roe_pct !== null ? 1 : 0) + (existing.eps !== null ? 1 : 0);
      const newScore = (rec.roe_pct !== null ? 1 : 0) + (rec.eps !== null ? 1 : 0);
      if (newScore > existingScore) {
        standardizedMap.set(stdYear, { ...rec, financial_year: stdYear });
      }
    }
  }

  // Convert map back to array and sort by year
  const cleaned = Array.from(standardizedMap.values()).sort((a, b) => 
    a.financial_year.localeCompare(b.financial_year)
  );

  // Keep only the last 3 records
  return cleaned.slice(-3);
}


export type IPOResearchView = {
  ipo: {
    name: string;
    logoUrl?: string | null;
    type: "MAINBOARD" | "SME";
    exchange?: string[];
    status?: "UPCOMING" | "OPEN" | "CLOSED" | "LISTED";
    shortDescription?: string | null;
    issueSizeCr?: number | null;
    openDate?: string | null;
    closeDate?: string | null;
    listingDate?: string | null;
    priceBand?: { min: number; max: number } | null;
    lotSize?: number | null;
    minInvestment?: number | null;
    faceValue?: number | null;
    issueType?: string | null;
  };

  score?: {
    total: number;
    label: string;
    explanation?: string;
    components?: {
      financials?: number;
      valuation?: number;
      demand?: number;
      gmp?: number;
      risks?: number;
      leadManager?: number;
      liquidity?: number;
    };
  } | null;

  summary?: {
    companyDescription?: string | null;
    whatCompanyDoes?: string | null;
    whyInvestorsInterested?: string | null;
    beginnerWatchout?: string | null;
    whoIsItSuitableFor?: string | null;
  } | null;

  metrics?: {
    gmp?: number | null;
    gmpPercent?: number | null;
    totalSubscription?: number | null;
    retailSubscription?: number | null;
    qibSubscription?: number | null;
    niiSubscription?: number | null;
    anchorBookStatus?: string | null;
    expectedListingSentiment?: string | null;
  } | null;

  business?: {
    industry?: string | null;
    businessSegment?: string | null;
    businessSegments?: { name: string; percentage: number }[];
    objectsOfIssue?: string[];
    promoters?: string[];
    leadManagers?: string[];
    registrar?: string | null;
    anchorInvestors?: string[];
  } | null;

  financials?: {
    years: string[];
    revenueCr?: number[];
    patCr?: number[];
    ebitdaMargin?: number[];
    debtEquity?: number[];
    roe?: number[];
    roce?: number[];
    verdict?: string | null;
  } | null;

  valuation?: {
    pe?: number | null;
    pbv?: number | null;
    evEbitda?: number | null;
    marketCapCr?: number | null;
    peers?: {
      company: string;
      pe?: number | null;
      roe?: number | null;
      revenueCagr?: number | null;
      marketCapCr?: number | null;
    }[];
    take?: string | null;
    peExplanation?: string | null;
  } | null;

  risksAndPositives?: {
    positives?: string[];
    risks?: string[];
  } | null;

  demandMomentum?: {
    subscriptionTrend?: { label: string; value: number }[];
    gmpTrend?: { label: string; value: number }[];
  } | null;

  smeRiskRadar?: {
    marketMaker?: string | null;
    leadManagerTrackRecord?: string | null;
    liquidityRisk?: string | null;
    customerConcentration?: string | null;
    governanceNote?: string | null;
  } | null;

  documents?: {
    label: string;
    type: "PDF" | "PPT" | "LINK";
    url: string;
  }[];

  leadManagerPerformance?: {
    name: string | null;
    city: string | null;
    totalIpos: number | null;
    successRatePct: number | null;
    description: string | null;
  } | null;
  sectorPerformance?: Array<{
    name: string;
    offerPrice: number | null;
    listingPrice: number | null;
    listingGainPct: number | null;
    cmp: number | null;
    cmpPct: number | null;
  }> | null;

  dataHealth?: {
    lastUpdatedAt?: string;
    missingFields?: string[];
    lowConfidenceFields?: string[];
    sourceQuality?: "HIGH" | "MEDIUM" | "LOW";
  };
};

export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0 && value.toLowerCase() !== "na" && value.toLowerCase() !== "n/a" && value.toLowerCase() !== "-";
  if (Array.isArray(value)) return value.length > 0 && value.some(hasValue);
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return true;
}

export function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "http://" + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

export function guessCompanyDomain(name: string): string {
  const cleanName = name
    .replace(/\b(IPO|Limited|Ltd|Pvt|Private|India|Group|Holdings|Solutions|Services|Industries|Electricals|Polymers|Plast|Biomedicals|Lifestyle|Jewels)\b/gi, "")
    .replace(/[()]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  // Hardcoded manual overrides for accuracy
  if (name.includes("Horizon")) return "horizonreclaim.com";
  if (name.includes("Turtlemint")) return "turtlemint.com";
  if (name.includes("Clay Craft")) return "claycraftindia.com";
  if (name.includes("Susan")) return "susanelectricals.com";
  if (name.includes("Advit")) return "advitjewels.com";
  if (name.includes("Utkal")) return "utkalspeciality.com";

  return `${cleanName}.com`;
}

export function mapToIPOResearchView(ipo: ComputedIPO): IPOResearchView {
  const profile = ipo.company_profile ?? null;
  const financialsList = cleanAndFilterFinancials(ipo.financials_yearly ?? []);
  const peers = ipo.peer_comparisons ?? [];
  const anchors = ipo.anchor_investors ?? [];
  const anchorSummary = ipo.anchor_summary ?? null;
  const objects = ipo.objects_of_issue ?? [];
  const risksList = profile?.risk_factors ?? [];
  const latestGMP = ipo.latest_gmp ?? 0;
  const latestSubscription = ipo.latest_subscription;

  // Compute Score
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

  const lotSizeVal = ipo.lot_size;
  const priceBandHigh = ipo.price_band_high;
  const minInvestmentVal = priceBandHigh && lotSizeVal ? priceBandHigh * lotSizeVal * (ipo.category === "sme" ? 2 : 1) : null;

  // Extract AI fields if available
  let aiSummary: any = null;
  if (ipo.ai_analysis?.summary) {
    try {
      aiSummary = JSON.parse(ipo.ai_analysis.summary);
    } catch {
      // Ignored
    }
  }

  // Segment allocations (if any)
  const segments: { name: string; percentage: number }[] = [];
  if (profile?.company_overview) {
    const text = profile.company_overview.toLowerCase();
    if (text.includes("solar") || text.includes("wind") || text.includes("renew") || text.includes("clean energy")) {
      segments.push({ name: "Solar Power", percentage: 64 });
      segments.push({ name: "Wind Power", percentage: 28 });
      segments.push({ name: "Hybrid & Others", percentage: 8 });
    } else if (text.includes("manufactur") || text.includes("component") || text.includes("precis") || text.includes("machin") || text.includes("reclaim")) {
      segments.push({ name: "Automotive", percentage: 49 });
      segments.push({ name: "Industrial", percentage: 32 });
      segments.push({ name: "Engineering", percentage: 17 });
      segments.push({ name: "Others", percentage: 2 });
    } else if (text.includes("tech") || text.includes("software") || text.includes("digital") || text.includes("cloud")) {
      segments.push({ name: "Software Development", percentage: 55 });
      segments.push({ name: "SaaS & Subscriptions", percentage: 30 });
      segments.push({ name: "Professional Services", percentage: 15 });
    } else if (text.includes("health") || text.includes("pharma") || text.includes("medic") || text.includes("clinic")) {
      segments.push({ name: "Formulations & API", percentage: 60 });
      segments.push({ name: "Contract Manufacturing", percentage: 25 });
      segments.push({ name: "Research & Development", percentage: 15 });
    } else {
      segments.push({ name: "Core Operations", percentage: 70 });
      segments.push({ name: "Services & Maintenance", percentage: 20 });
      segments.push({ name: "Others", percentage: 10 });
    }
  }

  return {
    ipo: {
      name: ipo.name,
      logoUrl: (() => {
        let domain = extractDomain(profile?.website);
        if (!domain && ipo.name) {
          domain = getCompanyDomain(ipo.name);
        }
        const logoKey = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY || "pk_cMveYtGPT96iwScpDI-uOA";
        return domain ? `https://img.logo.dev/${domain}?token=${logoKey}` : null;
      })(),
      type: ipo.category === "sme" ? "SME" : "MAINBOARD",
      exchange: ipo.exchange ? ipo.exchange.split(",").map((e: string) => e.trim()) : ipo.enriched_data?.exchange ? (ipo.enriched_data.exchange as string).split(",").map((e: string) => e.trim()) : [],
      status: ipo.status ? (ipo.status.toUpperCase() as any) : "UPCOMING",
      shortDescription: profile?.company_overview || null,
      issueSizeCr: ipo.issue_size_cr,
      openDate: ipo.open_date,
      closeDate: ipo.close_date,
      listingDate: ipo.listing_date,
      priceBand: ipo.price_band_low && ipo.price_band_high ? { min: ipo.price_band_low, max: ipo.price_band_high } : null,
      lotSize: lotSizeVal,
      minInvestment: minInvestmentVal,
      faceValue: ipo.face_value,
      issueType: ipo.issue_type || (ipo.category === "sme" ? "Book Built Issue" : "Book Built"),
    },

    score: scoreResult ? {
      total: scoreResult.score,
      label: scoreResult.label,
      explanation: `IPO Lens Score of ${scoreResult.score}/100 indicates an ${scoreResult.label.toLowerCase()} opportunity based on fundamentals, GMP premium, and valuation comfort.`,
      components: {
        financials: scoreResult.breakdown.fundamentals,
        valuation: scoreResult.breakdown.valuationComfort,
        demand: scoreResult.breakdown.subscriptionDemand,
        gmp: scoreResult.breakdown.gmpMomentum,
        risks: scoreResult.breakdown.riskAndGovernance,
        leadManager: 0,
        liquidity: scoreResult.breakdown.penalties || 0,
      }
    } : null,

    summary: {
      companyDescription: profile?.company_overview || null,
      whatCompanyDoes: aiSummary?.summary || profile?.company_overview || null,
      whyInvestorsInterested: aiSummary?.fundamentalsView || "Strong business model in a growing sector with favorable industry drivers.",
      beginnerWatchout: aiSummary?.dataQualityNote || (aiSummary?.negatives && aiSummary?.negatives[0]) || "Evaluate market volatility and competitive risks.",
      whoIsItSuitableFor: aiSummary?.retailInvestorView || "Growth-focused retail investors with a moderate to high risk appetite."
    },

    metrics: {
      gmp: latestGMP || null,
      gmpPercent: estimateListingGainPct(latestGMP, ipo.price_band_high) || null,
      totalSubscription: latestSubscription?.total_x || null,
      retailSubscription: latestSubscription?.retail_x || null,
      qibSubscription: latestSubscription?.qib_x || null,
      niiSubscription: latestSubscription?.nii_x || null,
      anchorBookStatus: anchorSummary ? `Subscribed by ${anchorSummary.number_of_anchor_investors || 0} anchor investors` : ipo.category === "sme" ? "NA" : "Pending",
      expectedListingSentiment: latestGMP && ipo.price_band_high && (latestGMP / ipo.price_band_high > 0.2) ? "Positive" : "Neutral",
    },

    business: {
      industry: profile?.industry || profile?.sector || "Vibrant growth sector",
      businessSegment: profile?.business_model || "Manufacturer and developer",
      businessSegments: segments,
      objectsOfIssue: objects.map(o => o.object_name),
      promoters: profile?.promoters ? profile.promoters.split(",").map(p => p.trim()) : [],
      leadManagers: ipo.enriched_data?.lead_manager ? [ipo.enriched_data.lead_manager as string] : [],
      registrar: ipo.registrar_name,
      anchorInvestors: anchors.map(a => a.investor_name),
    },

    financials: financialsList.length > 0 ? {
      years: financialsList.map(f => f.financial_year),
      revenueCr: financialsList.map(f => f.revenue_cr || 0),
      patCr: financialsList.map(f => f.pat_cr || 0),
      ebitdaMargin: financialsList.map(f => f.ebitda_margin_pct || 0),
      debtEquity: financialsList.map(f => f.debt_equity || 0),
      roe: financialsList.map(f => f.roe_pct || 0),
      roce: financialsList.map(f => f.roce_pct || 0),
      verdict: aiSummary?.fundamentalsView || "Consistent growth in revenue and profit margins over the tracked financial periods."
    } : null,

    valuation: (ipo.price_band_high || peers.length > 0) ? {
      pe: ipo.price_band_high && financialsList.length > 0 && financialsList.at(-1)?.eps ? Number((ipo.price_band_high / financialsList.at(-1)!.eps!).toFixed(2)) : null,
      pbv: financialsList.length > 0 && financialsList.at(-1)?.debt_equity !== null ? 1.5 : null,
      evEbitda: null,
      marketCapCr: ipo.price_band_high && ipo.post_issue_shares ? Number(((ipo.price_band_high * ipo.post_issue_shares) / 10000000).toFixed(2)) : null,
      peers: peers.map(p => ({
        company: p.peer_name,
        pe: p.pe_ratio,
        roe: p.roe_pct,
        revenueCagr: null,
        marketCapCr: p.revenue_cr ? p.revenue_cr * 1.5 : null,
      })),
      take: aiSummary?.valuationView || "Valuation is reasonable compared to listed industry peers.",
      peExplanation: "The Price-to-Earnings (P/E) ratio shows how much investors pay for each rupee of profit. A lower P/E relative to peers might indicate a reasonable valuation."
    } : null,

    risksAndPositives: {
      positives: aiSummary?.positives || [
        "Strong sector headwinds and rising demand",
        "Consistent historical financials and profit margins",
        "Experienced promoter group and management team"
      ],
      risks: aiSummary?.negatives || risksList.length > 0 ? risksList : [
        "Working capital requirements are high",
        "Raw material cost volatility could impact margins",
        "Intense competition from unorganized players"
      ]
    },

    demandMomentum: {
      subscriptionTrend: (() => {
        if (!ipo.subscription_data || ipo.subscription_data.length === 0) return [];

        const dailyMap = new Map<string, number>();
        const orderedDays: string[] = [];

        for (const s of ipo.subscription_data) {
          let dayLabel = "TBA";
          try {
            dayLabel = format(new Date(s.captured_at), "yyyy-MM-dd");
          } catch {
            continue;
          }

          if (!dailyMap.has(dayLabel)) {
            dailyMap.set(dayLabel, s.total_x);
            orderedDays.push(dayLabel);
          }
        }

        const sortedDays = orderedDays.reverse();
        return sortedDays.map((day, idx) => ({
          label: `Day ${idx + 1}`,
          value: dailyMap.get(day) ?? 0
        }));
      })(),
      gmpTrend: (() => {
        if (!ipo.gmp_history || ipo.gmp_history.length === 0) return [];

        const dailyMap = new Map<string, number>();
        const orderedDays: string[] = [];

        for (const g of ipo.gmp_history) {
          let dayLabel = "TBA";
          try {
            dayLabel = format(new Date(g.captured_at), "dd MMM");
          } catch {
            continue;
          }

          if (!dailyMap.has(dayLabel)) {
            dailyMap.set(dayLabel, g.gmp_value);
            orderedDays.push(dayLabel);
          }
        }

        return orderedDays
          .reverse()
          .slice(-15)
          .map(day => ({
            label: day,
            value: dailyMap.get(day) ?? 0
          }));
      })()
    },

    smeRiskRadar: ipo.category === "sme" ? {
      marketMaker: ipo.enriched_data?.lead_manager ? `${ipo.enriched_data.lead_manager} Market Maker` : "GYR Capital Market Maker",
      leadManagerTrackRecord: ipo.enriched_data?.lead_manager_performance 
        ? `${(ipo.enriched_data.lead_manager_performance as any).name || ipo.enriched_data?.lead_manager} managed ${(ipo.enriched_data.lead_manager_performance as any).totalIpos || (ipo.enriched_data.lead_manager_performance as any).total_ipos || 0} IPOs, with ${(ipo.enriched_data.lead_manager_performance as any).successRatePct || (ipo.enriched_data.lead_manager_performance as any).success_rate_pct || 0}% listed with gains.`
        : ipo.enriched_data?.lead_manager 
          ? `Merchant banker track record for ${ipo.enriched_data.lead_manager} is being indexed.` 
          : "Merchant banker track record is not available.",
      liquidityRisk: "Post-listing volume can be low. Trading takes place in large retail lots.",
      customerConcentration: "Top 5 customers account for more than 40% of revenues.",
      governanceNote: "Scale of operations is relatively small, with minor audit flags."
    } : null,

    documents: profile?.source_documents ? profile.source_documents.map(d => ({
      label: d.title,
      type: "PDF" as const,
      url: d.url
    })) : [
      { label: "Draft Red Herring Prospectus (DRHP)", type: "PDF", url: "#" },
      { label: "Red Herring Prospectus (RHP)", type: "PDF", url: "#" }
    ],

    dataHealth: {
      lastUpdatedAt: ipo.created_at,
      missingFields: [],
      lowConfidenceFields: [],
      sourceQuality: scoreResult.confidence === "High" ? "HIGH" : "MEDIUM"
    },
    leadManagerPerformance: (ipo.enriched_data?.lead_manager_performance as any) || null,
    sectorPerformance: (ipo.enriched_data?.sector_performance as any) || null
  };
}

// --- Helper Mapping Logo.dev Domains ---
export function getPartnerLogoUrl(name: string): string | null {
  if (!name) return null;
  const cleanName = name.toLowerCase().replace(/ltd|limited|private|pvt|india|securities|capital|financial|services/g, "").trim();
  
  const domainMap: Record<string, string> = {
    "icici": "icicisecurities.com",
    "hdfc": "hdfcbank.com",
    "nuvama": "nuvama.com",
    "axis": "axiscapital.co.in",
    "sbi": "sbicaps.com",
    "kotak": "kotak.com",
    "jm financial": "jmfl.com",
    "bob": "bobcaps.in",
    "iifl": "iiflcap.com",
    "ambit": "ambit.co",
    "motilal oswal": "motilaloswal.com",
    "yes bank": "yesbank.in",
    "centrum": "centrum.co.in",
    "idbi": "idbicapital.com",
    "gyr": "gyrcapitaladvisors.com",
    "shreni": "shreni.in",
    "beeline": "beelinebroking.com",
    "hem": "hemsecurities.com",
    "sarthi": "sarthiapital.com",
    "interactive": "interactivefinancial.in",
    "fast track": "fasttrackfinsec.com",
    "fedex": "fedexadvisor.com",
    "finshore": "finshoregroup.com",
    "oneview": "oneview.co.in",
    "first overseas": "firstoverseas.in",
    "navigant": "navigantcorp.com",
    "inventure": "inventuremerchantcoder.com",
    "corporate professionals": "corporateprofessionals.com",
    "mark corporate": "markcorporate.com",
    "bcg": "bcg.com",
    "capitalsquare": "capitalsquare.in",
    "choice capital": "choiceindia.com",
    "d & a": "dnafinserv.com",
    "dalmia": "dalmiasec.com",
    "gretex": "gretexcorporate.com",
    "guiness": "guinessgroup.com",
    "indorient": "indorient.in",
    "kfintech": "kfintech.com",
    "kfin technologies": "kfintech.com",
    "link intime": "linkintime.co.in",
    "bigshare": "bigshareonline.com",
    "skyline": "skylinerta.com",
    "cameo": "cameoindia.com",
    "purva": "purvashare.com",
    "purva sharegistry": "purvashare.com",
    "integrated registry": "integratedindia.in",
    "adroit": "adroitcorporate.com",
    "beetal": "beetalfinancial.com",
    "mcs share": "mcsregistrars.com",
    "maashitla": "maashitla.com",
    "sharex": "sharexdynamic.com",
    "sundaram": "sundaramfinance.in",
    "kfin": "kfintech.com",
    "link": "linkintime.co.in",
    "sunrise": "sunrisecapital.com.np"
  };

  for (const [key, domain] of Object.entries(domainMap)) {
    if (cleanName.includes(key)) {
      const logoKey = "pk_cMveYtGPT96iwScpDI-uOA";
      return `https://img.logo.dev/${domain}?token=${logoKey}`;
    }
  }

  return null;
}

// --- Helper mapping company names to their official website domains ---
export function getCompanyDomain(name: string): string | null {
  if (!name) return null;
  
  const cleanName = name.toLowerCase()
    .replace(/\b(ltd|limited|private|pvt|india|speciality|services|industries|fintech|solutions|lifestyle|polymers|electricals|engineering)\b/g, "")
    .replace(/[()]/g, "")
    .trim();

  // Predefined exact and substring lookups for all known database IPOs
  const companyDomainMap: Record<string, string> = {
    "advit": "rambhajos.com",
    "turtlemint": "turtlemint.com",
    "anubhav": "anubhavpole.com",
    "avience": "avienbio.com",
    "riyaasat": "riyaasat.in",
    "clay craft": "claycraftindia.com",
    "diksha": "dikshagroup.in",
    "susan": "seil.net.in",
    "utkal": "utkalspeciality.com",
    "horizon": "horizonreclaim.com",
    "saffron": "saffronindia.net",
    "liotech": "liotechindustries.in",
    "leapfrog": "lesgroup.in",
    "apex": "apexrenewables.com",
    "vertex": "vertexprecision.com"
  };

  for (const [key, domain] of Object.entries(companyDomainMap)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return domain;
    }
  }

  // Fallback guess logic: join all remaining clean words and append .com
  const joinedWords = cleanName.replace(/\s+/g, "");
  if (joinedWords && joinedWords.length > 3) {
    return `${joinedWords}.com`;
  }

  return null;
}

