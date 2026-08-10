export type CleanProvider =
  | "IPO_GURU_API"
  | "CHITTORGARH"
  | "IPOPLATFORM"
  | "FINOLOGY_TICKER"
  | "INVESTORGAIN"
  | "IPOWATCH"
  | "NSE"
  | "BSE"
  | "BSE_SME"
  | "ADMIN";

export type CleanRecordType = "ipo_list" | "detail" | "gmp" | "subscription";
export type CleanSyncType = "full" | "ipo_list" | "detail" | "gmp" | "subscription";
export type CleanSyncStatus = "success" | "partial" | "failed" | "skipped";

export interface CleanSyncResult {
  errors: string[];
  failed: number;
  found: number;
  matched: number;
  provider?: string;
  saved: number;
  skipped: number;
  status: CleanSyncStatus;
  success: boolean;
  syncType: CleanSyncType | "disabled";
  warnings: string[];
}

export interface CleanSourceRecord {
  payload: Record<string, unknown>;
  rawName: string;
  recordType: CleanRecordType;
  sourceUrl: string | null;
}

export interface FactCandidate {
  confidence?: "high" | "medium" | "low";
  displayValue?: string | null;
  factKey: string;
  factValue: unknown;
  isOfficial?: boolean;
  sourceEvidence?: string | null;
}

export interface GMPRecord extends CleanSourceRecord {
  gmpPct?: number | null;
  gmpValue: number | null;
  issuePrice?: number | null;
  estimatedListingPrice?: number | null;
}

export interface SubscriptionRecord extends CleanSourceRecord {
  niiX: number | null;
  qibX: number | null;
  retailX: number | null;
  totalX: number | null;
}
