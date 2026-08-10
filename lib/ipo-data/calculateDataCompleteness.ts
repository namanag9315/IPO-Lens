import { isSMECategory } from "@/lib/ipoCategory";
import type { ComputedIPO } from "@/types/ipo";

export interface IPODataCompleteness {
  completenessPercent: number;
  confidenceNote: string;
  label: "High" | "Medium" | "Low";
  missingCriticalFields: string[];
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function calculateDataCompleteness(ipo: ComputedIPO): IPODataCompleteness {
  const profile = ipo.company_profile;
  const latestFinancial = ipo.financials_yearly?.at(-1);
  const valuation = ipo.valuation_metrics;
  const docs = profile?.source_documents ?? [];
  const isSME = isSMECategory(ipo.category);

  const checks: Array<{ label: string; present: boolean }> = [
    { label: "Company description", present: hasValue(profile?.company_overview) },
    { label: "Sector", present: hasValue(profile?.sector) },
    { label: "Price band", present: hasValue(ipo.price_band_high) },
    { label: "Lot size", present: hasValue(ipo.lot_size) },
    { label: "Issue size", present: hasValue(ipo.issue_size_cr) },
    { label: "Financials", present: Boolean(ipo.financials_yearly?.length) },
    { label: "EPS / P/E", present: hasValue(valuation?.eps ?? latestFinancial?.eps) && hasValue(valuation?.pe_ratio) },
    { label: "Peer comparison", present: Boolean(ipo.peer_comparisons?.length) },
    { label: "GMP", present: hasValue(ipo.latest_gmp) },
    { label: "Subscription", present: hasValue(ipo.latest_subscription?.total_x) },
    { label: "Objects of issue", present: Boolean(ipo.objects_of_issue?.length) },
    { label: "Registrar", present: hasValue(ipo.registrar_name) },
    { label: "RHP/DRHP link", present: docs.some((doc) => /rhp|drhp/i.test(`${doc.type ?? ""} ${doc.title ?? ""}`)) || docs.length > 0 },
  ];

  if (isSME) {
    checks.push(
      { label: "Lead manager", present: Boolean(ipo.lead_managers?.some((item) => item.lead_manager)) },
      { label: "Lead manager track record", present: Boolean(ipo.lead_manager_history?.length || ipo.lead_manager_scores?.length) },
      { label: "Market maker", present: Boolean(ipo.market_makers?.some((item) => item.market_maker)) },
      { label: "Market maker/liquidity support", present: Boolean(ipo.market_makers?.some((item) => item.obligation_details || item.liquidity_support_period)) },
    );
  } else {
    checks.push(
      { label: "Anchor book", present: hasValue(ipo.anchor_summary?.anchor_book_size_cr) },
      { label: "Anchor investors", present: Boolean(ipo.anchor_investors?.length) },
      {
        label: "Anchor category allocation",
        present: hasValue(ipo.anchor_summary?.domestic_mf_share_pct) || hasValue(ipo.anchor_summary?.fpi_share_pct),
      },
    );
  }

  const presentCount = checks.filter((check) => check.present).length;
  const completenessPercent = Math.round((presentCount / checks.length) * 100);
  const missingCriticalFields = checks.filter((check) => !check.present).map((check) => check.label);
  const label = completenessPercent >= 80 ? "High" : completenessPercent >= 60 ? "Medium" : "Low";
  const confidenceNote =
    missingCriticalFields.length === 0
      ? "Core IPO Lens fields are available."
      : `Important missing fields: ${missingCriticalFields.slice(0, 5).join(", ")}${missingCriticalFields.length > 5 ? "." : ""}`;

  return {
    completenessPercent,
    confidenceNote,
    label,
    missingCriticalFields,
  };
}
