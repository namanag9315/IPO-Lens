import type { AIResearchSummary } from "@/types/ipo";

export interface DeterministicMemoInput {
  allotmentChanceLabel: string;
  allotmentChancePercent: number | null;
  businessSummary: string;
  cautions: string[];
  dataQualityNote: string;
  demandSummary: string;
  gmpSummary: string;
  isSME: boolean;
  positives: string[];
  smeSummary?: string;
  valuationSummary: string;
}

export function deterministicResearchMemo(input: DeterministicMemoInput): AIResearchSummary {
  return {
    allotmentView:
      input.allotmentChancePercent === null
        ? "Retail allotment chance cannot be estimated because retail subscription data is not available."
        : `Estimated retail allotment chance is ${input.allotmentChanceLabel.toLowerCase()} at around ${input.allotmentChancePercent}%. This is only an estimate.`,
    anchorInvestorView: input.isSME ? "Anchor data is optional for SME IPOs and is not part of the SME score model." : "Anchor quality should be reviewed when anchor book data is available.",
    dataQualityNote: input.dataQualityNote,
    fundamentalsView: input.businessSummary,
    gmpView: input.gmpSummary,
    negatives: input.cautions,
    objectsOfIssueView: "Objects of issue should be reviewed once use-of-proceeds data is available.",
    positives: input.positives,
    retailInvestorView: "This memo is educational. It explains signals and missing data without giving action instructions.",
    subscriptionView: input.demandSummary,
    summary: `${input.businessSummary} ${input.valuationSummary} ${input.demandSummary}`,
    valuationView: input.valuationSummary,
  };
}
