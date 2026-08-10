import { isSMECategory } from "@/lib/ipoCategory";
import type { EnrichableFieldName } from "@/lib/enrichment/enrichableFields";
import type { ComputedIPO, IPOCategory } from "@/types/ipo";

export interface MissingFieldIPOData {
  category?: IPOCategory | string | null;
  registrar_name?: string | null;
  exchange?: string | null;
  company_profile?: {
    company_overview?: string | null;
    sector?: string | null;
    industry?: string | null;
    business_model?: string | null;
    products_services?: string | null;
    customers?: string | null;
    risk_factors?: string[] | null;
  } | null;
  lead_managers?: unknown[] | null;
  market_makers?: unknown[] | null;
  peer_comparisons?: unknown[] | null;
  objects_of_issue?: unknown[] | null;
  valuation_metrics?: {
    eps?: number | null;
    pe_ratio?: number | null;
    peer_median_pe?: number | null;
    industry_pe?: number | null;
  } | null;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 2;
}

function hasRows(value: unknown[] | null | undefined) {
  return Array.isArray(value) && value.length > 0;
}

export function detectMissingIPOFields(ipoData: MissingFieldIPOData | ComputedIPO): EnrichableFieldName[] {
  const profile = ipoData.company_profile ?? null;
  const missing: EnrichableFieldName[] = [];
  const sme = isSMECategory(ipoData.category);

  if (!hasText(profile?.company_overview)) missing.push("company_description");
  if (!hasText(profile?.sector)) missing.push("sector");
  if (!hasText(profile?.industry)) missing.push("industry");
  if (!hasText(profile?.business_model)) missing.push("business_model");
  if (!hasText(profile?.products_services)) missing.push("products_services");
  if (!hasText(profile?.customers)) missing.push("customers");
  if (!hasText(ipoData.registrar_name)) missing.push("registrar_name");

  if (sme && !hasRows(ipoData.lead_managers ?? [])) missing.push("lead_manager_name");
  if (sme && !hasRows(ipoData.market_makers ?? [])) missing.push("market_maker_name");

  if (!hasRows(ipoData.peer_comparisons ?? []) && !ipoData.valuation_metrics?.peer_median_pe && !ipoData.valuation_metrics?.industry_pe) {
    missing.push("peer_valuation_table");
  }

  if (!hasRows(ipoData.objects_of_issue ?? [])) missing.push("objects_of_issue");

  if (!Array.isArray(profile?.risk_factors) || profile.risk_factors.length === 0) {
    missing.push("risk_factors");
  }

  if (!ipoData.valuation_metrics?.eps) missing.push("eps_basic");
  if (!ipoData.valuation_metrics?.pe_ratio) missing.push("post_ipo_pe");
  if (!ipoData.exchange) missing.push("listing_exchange");

  return Array.from(new Set(missing));
}
