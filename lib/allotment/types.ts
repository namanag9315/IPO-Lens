import type { IPOStatus } from "@/types/ipo";

export type AllotmentRegistrar = "MOCK" | "KFINTECH" | "MUFG_INTIME" | "BIGSHARE" | "BSE" | "NSE";
export type AllotmentCheckType = "PAN" | "APPLICATION_NO" | "DEMAT";
export type AllotmentStatus = "ALLOTTED" | "NOT_ALLOTTED" | "PENDING" | "UNAVAILABLE" | "ERROR";
export type Registrar = AllotmentRegistrar;
export type AllotmentChanceLabel = "HIGH" | "MODERATE" | "LOW" | "VERY_LOW" | "LOTTERY_LIKE" | "NOT_AVAILABLE";
export type AllotmentStatusAvailability = "AVAILABLE" | "EXPECTED" | "UNAVAILABLE" | "DELAYED";

export interface AllotmentFallbackAction {
  label: string;
  url: string;
}

export interface OfficialAllotmentLink extends AllotmentFallbackAction {
  description: string;
}

export interface AllotmentCheckRequest {
  ipoId: string;
  registrar: AllotmentRegistrar;
  checkType: AllotmentCheckType;
  value: string;
}

export interface AllotmentCheckResponse {
  status: AllotmentStatus;
  ipoName: string;
  investorName: string | null;
  allottedShares: number | null;
  applicationNumberMasked: string | null;
  panMasked: string | null;
  source: string;
  sourceUrl: string | null;
  checkedAt: string;
  message: string;
  fallbackAction: AllotmentFallbackAction | null;
}

export interface AllotmentIPOOption {
  id: string;
  name: string;
  slug: string;
  registrar: AllotmentRegistrar | null;
  registrarName: string | null;
  allotmentDate: string | null;
  listingDate: string | null;
  exchange: string | null;
  status: IPOStatus;
  retailSubscription: number | null;
}

export interface AllotmentChanceEstimate {
  chancePercent: number | null;
  label: AllotmentChanceLabel;
  displayLabel: string;
  retailSubscription: number | null;
  explanation: string;
}

export interface SavedPANProfile {
  id: string;
  nickname: string;
  panLast4: string;
  panMasked: string;
  createdAt: string;
}

export interface SavedProfileCheckResult {
  panProfileId: string;
  nickname: string;
  panMasked: string;
  status: AllotmentStatus;
  allottedShares: number | null;
  source: string;
  checkedAt: string;
  message: string;
}

export interface AllotmentProviderHealth {
  providerName: AllotmentRegistrar;
  isEnabled: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureReason: string | null;
  updatedAt: string | null;
}
