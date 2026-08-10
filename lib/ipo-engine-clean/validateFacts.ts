import type { FactCandidate } from "@/lib/ipo-engine-clean/types";

const PLACEHOLDERS = new Set(["", "-", "na", "n/a", "null", "pending", "not available", "being verified"]);
const ALLOWED_FACT_KEYS = new Set([
  "company_description",
  "sector",
  "products_services",
  "manufacturing_facilities",
  "lead_manager_name",
  "lead_managers_table",
  "registrar_name",
  "registrar_contact",
  "market_maker_name",
  "company_contact",
  "ipo_details_table",
  "issue_reservation_table",
  "lot_size_table",
  "financial_table",
  "kpi_table",
  "peer_valuation_table",
  "objects_of_issue",
  "strengths",
  "risks",
  "subscription_table",
  "price_band",
  "price_band_low",
  "price_band_high",
  "issue_price",
  "issue_size",
  "total_issue_size",
  "fresh_issue",
  "offer_for_sale",
  "face_value",
  "issue_type",
  "sale_type",
  "lot_size",
  "market_maker_portion",
  "listing_exchange",
  "open_date",
  "close_date",
  "allotment_date",
  "refund_date",
  "credit_of_shares_date",
  "listing_date",
  "market_cap",
  "pe_ratio",
  "eps",
  "ronw_latest",
  "debt_equity_latest",
  "pat_margin_latest",
  "ebitda_margin_latest",
  "price_to_book_value",
  "eps_pre_ipo",
  "eps_post_ipo",
  "pe_pre_ipo",
  "pe_post_ipo",
  "promoter_holding_pre_ipo",
  "promoter_holding_post_ipo",
  "assets_latest",
  "revenue_latest",
  "total_income_latest",
  "pat_latest",
  "ebitda_latest",
  "net_worth_latest",
  "reserves_latest",
  "borrowing_latest",
  "promoter_holding",
  "roe_latest",
  "roce_latest",
  "roe",
  "roce",
  "qib_subscription",
  "nii_subscription",
  "retail_subscription",
  "total_subscription",
  "latest_gmp",
  "latest_subscription",
  "ipo_review_summary",
  "revenue_growth",
  "pat_growth",
  "peer_average_pe",
  "peer_high_pe",
  "sectorPEAvg",
  "ipo_pe",
  "ipo_eps",
]);

function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function isPlaceholder(value: unknown) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return PLACEHOLDERS.has(stringValue(value).toLowerCase());
}

function hasTableColumn(rows: unknown, pattern: RegExp) {
  return Array.isArray(rows) && rows.some((row) => row && typeof row === "object" && Object.keys(row).some((key) => pattern.test(key)));
}

function tableContains(rows: unknown, pattern: RegExp) {
  return Array.isArray(rows) && rows.some((row) => {
    if (!row || typeof row !== "object") return false;
    return Object.entries(row).some(([key, value]) => pattern.test(`${key} ${String(value)}`));
  });
}

function uniqueRows(rows: unknown) {
  if (!Array.isArray(rows)) return rows;
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validateFacts(facts: FactCandidate[]) {
  const accepted: FactCandidate[] = [];
  const rejected: Array<{ fact: FactCandidate; reason: string }> = [];

  for (const fact of facts) {
    const key = fact.factKey;
    let value = uniqueRows(fact.factValue);

    if (!ALLOWED_FACT_KEYS.has(key)) {
      rejected.push({ fact, reason: "Fact key is not whitelisted." });
      continue;
    }

    if (isPlaceholder(value)) {
      rejected.push({ fact, reason: "Fact value is empty or a placeholder." });
      continue;
    }

    if (key === "company_description") {
      const description = stringValue(value);
      const lower = description.toLowerCase();
      if (description.length < 80 || !/(manufactur|provid|engaged|business|product|service|company)/.test(lower)) {
        rejected.push({ fact, reason: "Company description is too short or unrelated." });
        continue;
      }
    }

    if (key === "lead_manager_name" && !/(capital|advisors|merchant|securities|financial|broking|corporate)/i.test(stringValue(value))) {
      if (!/lead manager|merchant banker|brlm/i.test(fact.sourceEvidence ?? "")) {
        rejected.push({ fact, reason: "Lead manager name does not look like a merchant banker." });
        continue;
      }
    }

    if (key === "registrar_name" && !/(rta|registrar|link intime|kfin|bigshare|mufg|cameo|skyline|maashitla|purva)/i.test(stringValue(value))) {
      if (!/registrar/i.test(fact.sourceEvidence ?? "")) {
        rejected.push({ fact, reason: "Registrar name does not look like a registrar/RTA." });
        continue;
      }
    }

    if (key === "market_maker_name") {
      const name = stringValue(value);
      if (/shares|agg\.|aggregating|%|₹/.test(name) || !/(broking|securities|stock|capital|financial|merchant|advisors|markets|pvt|private|limited|ltd)/i.test(name)) {
        rejected.push({ fact, reason: "Market maker name does not look like a market participant." });
        continue;
      }
    }

    if (key === "subscription_table" && (!hasTableColumn(value, /category|investor|qib|retail|individual/i) || !hasTableColumn(value, /times|x|subscription/i))) {
      rejected.push({ fact, reason: "Subscription table lacks category/times columns." });
      continue;
    }

    if (
      key === "financial_table" &&
      (!Array.isArray(value) ||
        value.length < 2 ||
        !tableContains(value, /period|year|date|assets|income|revenue|sales|profit after tax|\bpat\b|net worth|reserves|borrowing|debt/i) ||
        !tableContains(value, /income|revenue|sales|profit after tax|\bpat\b|assets|net worth/i))
    ) {
      rejected.push({ fact, reason: "Financial table lacks recognizable financial rows." });
      continue;
    }

    if (key === "kpi_table") {
      const kpiHits = [/roe/i, /roce/i, /ronw/i, /\beps\b/i, /\bp\/?e\b/i, /\bnav\b/i, /debt\/?equity/i].filter((pattern) => tableContains(value, pattern)).length;
      if (!Array.isArray(value) || kpiHits < 2) {
        rejected.push({ fact, reason: "KPI table lacks enough KPI labels." });
        continue;
      }
    }

    if (key === "ipo_details_table" && (!Array.isArray(value) || value.length < 2 || !tableContains(value, /ipo date|open date|close date|price band|lot size|issue size|registrar|lead manager|listing/i))) {
      rejected.push({ fact, reason: "IPO details table lacks recognizable IPO detail rows." });
      continue;
    }

    if (key === "peer_valuation_table" && (!Array.isArray(value) || !tableContains(value, /company|peer|name/i) || !tableContains(value, /p\/?e|eps|ronw|nav/i))) {
      rejected.push({ fact, reason: "Peer table lacks company and valuation columns." });
      continue;
    }

    accepted.push({ ...fact, factValue: value });
  }

  return { accepted, rejected };
}
