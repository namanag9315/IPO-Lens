import {
  DESCRIPTIVE_AUTO_APPLY_FIELDS,
  NEVER_AUTO_APPLY_FIELDS,
  type EnrichableFieldName,
  type EnrichmentConfidence,
  type EnrichmentFieldStatus,
} from "@/lib/enrichment/enrichableFields";

const TABLE_VALUE_FIELDS = new Set<EnrichableFieldName>(["peer_valuation_table", "peer_financial_table", "objects_of_issue"]);
const URL_FIELDS = new Set<EnrichableFieldName>(["lead_manager_url"]);
const AMOUNT_FIELDS = new Set<EnrichableFieldName>(["market_maker_reserved_amount", "market_maker_reserved_shares"]);

function evidenceLooksSpecific(fieldName: EnrichableFieldName, evidenceText: string) {
  if (TABLE_VALUE_FIELDS.has(fieldName)) {
    return /\d/.test(evidenceText) && /table|peer|object|proceeds|utili[sz]ation|amount|p\/e|pe/i.test(evidenceText);
  }

  if (URL_FIELDS.has(fieldName)) {
    return /^https?:\/\//i.test(evidenceText) || /href|profile|website/i.test(evidenceText);
  }

  if (AMOUNT_FIELDS.has(fieldName)) {
    return /\d/.test(evidenceText) && /share|₹|rs|amount|cr|crore/i.test(evidenceText);
  }

  return evidenceText.trim().length >= 20;
}

export function scoreEnrichmentConfidence({
  confidence,
  evidenceText,
  fieldName,
}: {
  fieldName: EnrichableFieldName;
  confidence: EnrichmentConfidence;
  evidenceText: string;
}) {
  if (!evidenceLooksSpecific(fieldName, evidenceText)) {
    return confidence === "high" ? "medium" : "low";
  }

  return confidence;
}

export function statusForEnrichedField({
  confidence,
  evidenceText,
  fieldName,
}: {
  fieldName: EnrichableFieldName;
  confidence: EnrichmentConfidence;
  evidenceText: string;
}): EnrichmentFieldStatus {
  const scored = scoreEnrichmentConfidence({ confidence, evidenceText, fieldName });

  if (NEVER_AUTO_APPLY_FIELDS.has(fieldName)) {
    return "needs_review";
  }

  if (scored === "high") {
    return "auto_applied";
  }

  if (scored === "medium" && DESCRIPTIVE_AUTO_APPLY_FIELDS.has(fieldName)) {
    return "auto_applied";
  }

  return "needs_review";
}
