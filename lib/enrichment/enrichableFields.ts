export const COMPANY_PROFILE_FIELDS = [
  "company_description",
  "sector",
  "industry",
  "business_model",
  "products_services",
  "customers",
  "manufacturing_facilities",
  "revenue_model",
  "promoter_summary",
] as const;

export const IPO_DETAIL_FIELDS = [
  "registrar_name",
  "registrar_website",
  "registrar_email",
  "registrar_phone",
  "registrar_address",
  "lead_manager_name",
  "lead_manager_url",
  "market_maker_name",
  "market_maker_reserved_shares",
  "market_maker_reserved_amount",
  "fresh_issue_amount",
  "ofs_amount",
  "face_value",
  "issue_type",
  "listing_exchange",
  "pre_issue_shares",
  "post_issue_shares",
] as const;

export const VALUATION_FIELDS = [
  "eps_basic",
  "eps_diluted",
  "pre_ipo_pe",
  "post_ipo_pe",
  "peer_companies",
  "peer_median_pe",
  "peer_valuation_table",
  "peer_financial_table",
] as const;

export const OBJECT_FIELDS = [
  "objects_of_issue",
  "objects_categories",
  "objects_amounts",
] as const;

export const RISK_STRENGTH_FIELDS = [
  "strengths",
  "risk_factors",
] as const;

export const ENRICHABLE_FIELDS = [
  ...COMPANY_PROFILE_FIELDS,
  ...IPO_DETAIL_FIELDS,
  ...VALUATION_FIELDS,
  ...OBJECT_FIELDS,
  ...RISK_STRENGTH_FIELDS,
] as const;

export type EnrichableFieldName = (typeof ENRICHABLE_FIELDS)[number];
export type EnrichmentConfidence = "high" | "medium" | "low";
export type EnrichmentFieldStatus = "auto_applied" | "needs_review" | "rejected" | "superseded";
export type EnrichmentJobStatus = "queued" | "running" | "completed" | "partial" | "failed" | "skipped";
export type EnrichmentTrigger = "sync" | "admin_manual" | "cron";

const DISALLOWED = new Set([
  "current_gmp",
  "gmp",
  "live_subscription",
  "subscription",
  "listing_price",
  "allotment_result",
  "target_price",
  "recommendation",
]);

export const CRITICAL_ENRICHABLE_FIELDS = new Set<EnrichableFieldName>([
  "company_description",
  "sector",
  "registrar_name",
  "lead_manager_name",
  "market_maker_name",
  "peer_valuation_table",
  "objects_of_issue",
]);

export const DESCRIPTIVE_AUTO_APPLY_FIELDS = new Set<EnrichableFieldName>([
  "company_description",
  "business_model",
  "products_services",
  "customers",
  "manufacturing_facilities",
  "revenue_model",
  "promoter_summary",
  "sector",
  "industry",
]);

export const NEVER_AUTO_APPLY_FIELDS = new Set<EnrichableFieldName>([
  "lead_manager_url",
  "market_maker_reserved_amount",
  "market_maker_reserved_shares",
  "objects_of_issue",
  "peer_valuation_table",
  "peer_financial_table",
]);

export function isEnrichableField(value: string): value is EnrichableFieldName {
  return (ENRICHABLE_FIELDS as readonly string[]).includes(value) && !DISALLOWED.has(value);
}

export function isCriticalField(value: string) {
  return isEnrichableField(value) && CRITICAL_ENRICHABLE_FIELDS.has(value);
}
