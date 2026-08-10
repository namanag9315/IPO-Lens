export type PublicDataType = "gmp" | "subscription";

export type GMPDataPoint = {
  category?: "mainboard" | "sme" | null;
  closeDate?: string | null;
  detailUrl?: string | null;
  ipoName: string;
  gmp: number | null;
  gmpPercent: number | null;
  issuePrice: number | null;
  estimatedListingPrice: number | null;
  openDate?: string | null;
  status: string | null;
  source: string;
  sourceUrl: string;
  capturedAt: string;
};

export type IPOFinancialDataPoint = {
  debtEquity?: number | null;
  ebitdaCr: number | null;
  ebitdaMarginPct?: number | null;
  eps: number | null;
  financialYear: string;
  netWorthCr?: number | null;
  patCr: number | null;
  patMarginPct: number | null;
  revenueCr: number | null;
  rocePct: number | null;
  roePct: number | null;
  totalBorrowingsCr: number | null;
};

export type IPOValuationDataPoint = {
  eps: number | null;
  patMarginPct: number | null;
  peRatio: number | null;
  rocePct: number | null;
  ronwPct: number | null;
  source?: string | null;
  sourceUrl?: string | null;
};

export type DiscoveredSourceName = "IPO_PREMIUM" | "CHITTORGARH" | "IPO_GURU" | "OTHER";

export type DiscoveryConfidence = "high" | "medium" | "low";

export type DiscoveredLeadManager = {
  confidence: DiscoveryConfidence;
  name: string;
  role: string;
  source: string;
  sourceUrl: string;
  url: string | null;
};

export type DiscoveredRegistrar = {
  confidence: DiscoveryConfidence;
  name: string;
  source?: string | null;
  sourceUrl?: string | null;
  url: string | null;
};

export type DiscoveredMarketMaker = {
  confidence: DiscoveryConfidence;
  name: string;
  source?: string | null;
  sourceUrl?: string | null;
};

export type DiscoveredCompanyContact = {
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
};

export type IPOResearchDataPoint = {
  allotmentDate: string | null;
  businessModel: string | null;
  category: "mainboard" | "sme" | null;
  closeDate: string | null;
  companyContact?: DiscoveredCompanyContact | null;
  companyOverview: string | null;
  detailUrl: string;
  financials: IPOFinancialDataPoint[];
  ipoName: string;
  issueSizeCr: number | null;
  leadManagers?: DiscoveredLeadManager[];
  listingDate: string | null;
  lotSize: number | null;
  marketMaker?: DiscoveredMarketMaker | null;
  minInvestment: number | null;
  objectsOfIssue: Array<{
    amountCr: number | null;
    objectName: string;
  }>;
  openDate: string | null;
  postIssuePromoterHoldingPct: number | null;
  preIssuePromoterHoldingPct: number | null;
  priceBandHigh: number | null;
  priceBandLow: number | null;
  registrar?: DiscoveredRegistrar | null;
  source: string;
  sourceParsedJson?: unknown;
  sourceRawHtml?: string | null;
  sourceRawText?: string | null;
  sourceUrl: string;
  updatedAt: string;
  valuation: IPOValuationDataPoint | null;
};

export type SubscriptionDataPoint = {
  ipoName: string;
  qibTimes: number | null;
  niiTimes: number | null;
  retailTimes: number | null;
  employeeTimes: number | null;
  shareholderTimes: number | null;
  totalTimes: number | null;
  source: string;
  sourceUrl: string;
  capturedAt: string;
};

export interface ProviderResult<T> {
  data: T[];
  provider: string;
  sourceUrl: string;
}

export interface PublicDataProvider<T> {
  dataType: PublicDataType;
  name: string;
  sourceUrl: string;
  fetch(): Promise<ProviderResult<T>>;
}

export const PUBLIC_PROVIDER_USER_AGENT = `IPO Lens Research App/1.0 (${
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"
}; public-reference-data; contact: admin)`;
