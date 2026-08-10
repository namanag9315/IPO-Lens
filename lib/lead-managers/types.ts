export type LeadManagerDataConfidence = "high" | "medium" | "low";

export interface LeadManagerProfileInput {
  address?: string | null;
  dataConfidence?: LeadManagerDataConfidence;
  discoveryConfidence?: LeadManagerDataConfidence;
  description?: string | null;
  email?: string | null;
  importStatus?: "not_started" | "queued" | "imported" | "failed" | "needs_review" | null;
  leadManagerProfileUrl?: string | null;
  name: string;
  phone?: string | null;
  sebiRegistrationNo?: string | null;
  slug?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  type?: string | null;
  website?: string | null;
}

export interface LeadManagerHistoryInput {
  currentPrice?: number | null;
  currentReturnPercent?: number | null;
  dataConfidence?: LeadManagerDataConfidence;
  day30Close?: number | null;
  day30ReturnPercent?: number | null;
  day90Close?: number | null;
  day90ReturnPercent?: number | null;
  exchange?: string | null;
  ipoName: string;
  ipoSlug?: string | null;
  ipoType?: string | null;
  issueDate?: string | null;
  issuePrice?: number | null;
  issueSizeCr?: number | null;
  listingDate?: string | null;
  listingGainAmount?: number | null;
  listingGainPercent?: number | null;
  listingPrice?: number | null;
  lotSize?: number | null;
  marketMaker?: string | null;
  priceBand?: string | null;
  retailSubscription?: number | null;
  source?: string | null;
  sourceUrl?: string | null;
  status?: string | null;
  totalSubscription?: number | null;
}

export interface LeadManagerScoreOutput {
  average30DayReturnPercent: number | null;
  average90DayReturnPercent: number | null;
  averageListingGainPercent: number | null;
  averageSubscription: number | null;
  dataConfidence: "High" | "Medium" | "Low";
  finalScore: number;
  flatListingCount: number;
  label: "Strong track record" | "Mixed-positive record" | "Mixed/limited record" | "Weak record" | "Insufficient history";
  median30DayReturnPercent: number | null;
  median90DayReturnPercent: number | null;
  medianListingGainPercent: number | null;
  medianSubscription: number | null;
  negativeListingCount: number;
  nonNegativeListingPercent: number | null;
  positiveListingCount: number;
  positiveListingPercent: number | null;
  reasons: string[];
  severeNegativeCount: number;
  totalIposManaged: number;
  warnings: string[];
}

export interface LeadManagerImportResult {
  errors: string[];
  history: LeadManagerHistoryInput[];
  profile: LeadManagerProfileInput | null;
  recordsFound: number;
  status: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
}
