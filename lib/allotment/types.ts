export type AllotmentStatus = "ALLOTTED" | "NOT_ALLOTTED" | "PENDING" | "UNAVAILABLE" | "ERROR";

export type Registrar = "MOCK" | "KFINTECH" | "MUFG_INTIME" | "BIGSHARE" | "BSE" | "NSE";

export type CheckType = "PAN" | "APPLICATION_NO" | "DEMAT";

export interface AllotmentCheckRequest {
  ipoId: string;
  registrar: Registrar;
  checkType: CheckType;
  value: string;
}

export interface AllotmentResult {
  status: AllotmentStatus;
  ipoName: string;
  investorName: string | null;
  allottedShares: number | null;
  applicationNumberMasked: string | null;
  panMasked: string | null;
  source: string;
  checkedAt: string;
  message: string;
}

export interface AllotmentProvider {
  name: string;
  checkAllotment(request: AllotmentCheckRequest): Promise<AllotmentResult>;
}
