import type {
  IPOAnchorInvestor,
  IPOAnchorSummary,
  IPOCategory,
  IPOFinancialYearly,
  IPOLeadManagerWithManager,
  IPOObjectOfIssue,
  IPOPeerComparison,
  IPOMarketMakerWithMaker,
  LeadManagerIPOHistory,
  LeadManagerTrackRecordScore,
  ResearchSignalLabel,
  ScoreBreakdown,
} from "@/types/ipo";

export type ScoreModel = "MAINBOARD" | "SME";
export type DataConfidence = "Low" | "Medium" | "High";
export type ScoreStatus = "positive" | "neutral" | "negative";

export interface ScoreBreakdownItem {
  dataConfidence: DataConfidence;
  key: string;
  label: string;
  maxPoints: number;
  pointsEarned: number;
  reason: string;
  status: ScoreStatus;
  weight: number;
}

export interface DetailedScoringInput {
  anchorInvestors?: IPOAnchorInvestor[];
  anchorSummary?: IPOAnchorSummary | null;
  category?: IPOCategory | null;
  financials?: IPOFinancialYearly[];
  gmp: number;
  issuePrice: number;
  issueSizeCr: number;
  leadManagerHistory?: LeadManagerIPOHistory[];
  leadManagers?: IPOLeadManagerWithManager[];
  leadManagerScores?: LeadManagerTrackRecordScore[];
  marketMakers?: IPOMarketMakerWithMaker[];
  niiX: number;
  objectsOfIssue?: IPOObjectOfIssue[];
  peers?: IPOPeerComparison[];
  qibX: number;
  retailX: number;
  riskFactors?: string[];
  totalX: number;
}

export interface DetailedScoringResult {
  breakdown: ScoreBreakdownItem[];
  confidence: DataConfidence;
  dataQualityNotes: string[];
  label: ResearchSignalLabel;
  legacyBreakdown: ScoreBreakdown;
  penalties: number;
  score: number;
  scoreModel: ScoreModel;
  signalLabel: ResearchSignalLabel;
  totalScore: number;
}

export const MAINBOARD_WEIGHTS = {
  anchorInvestorQuality: 10,
  fundamentals: 25,
  gmpMomentum: 15,
  objectsOfIssue: 5,
  riskAndGovernance: 10,
  subscriptionDemand: 20,
  valuationComfort: 15,
} as const;

export const SME_WEIGHTS = {
  fundamentals: 20,
  gmpMomentum: 10,
  leadManagerTrackRecord: 18,
  marketMakerLiquidity: 8,
  objectsOfIssue: 5,
  riskAndGovernance: 12,
  subscriptionDemand: 15,
  valuationComfort: 12,
} as const;
