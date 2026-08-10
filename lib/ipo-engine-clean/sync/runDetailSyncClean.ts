import { detectIPOPageContent, type IPOPageContentDetection } from "@/lib/ipo-engine-clean/detectSourceContent";
import { fetchSource } from "@/lib/ipo-engine-clean/fetchSource";
import { parseChittorgarhDetail } from "@/lib/ipo-engine-clean/providers/chittorgarhProvider";
import * as cheerio from "cheerio";
import { parseIPOWatchReview } from "@/lib/scrapers/ipowatchReview";
import { parseFinologyTickerDetail } from "@/lib/ipo-engine-clean/providers/finologyTickerProvider";
import { parseIPOPlatformDetail, deriveIPOPlatformSiblingUrls } from "@/lib/ipo-engine-clean/providers/ipoPlatformProvider";
import { resolveDetailUrlClean } from "@/lib/ipo-engine-clean/resolveDetailUrlClean";
import { saveFactsClean } from "@/lib/ipo-engine-clean/saveFactsClean";
import { linkLeadManagerForIPO } from "@/lib/ipo-engine-clean/sync/linkLeadManagersClean";
import {
  createRun,
  disabledResult,
  emptyCleanResult,
  finishRun,
  loadMatchingContext,
  shouldSkipForKillSwitch,
  stageSourceRecord,
} from "@/lib/ipo-engine-clean/sync/common";
import { supabaseAdmin } from "@/lib/supabase";
import type { CleanProvider, CleanSourceRecord, CleanSyncResult, FactCandidate } from "@/lib/ipo-engine-clean/types";
import { validateFacts } from "@/lib/ipo-engine-clean/validateFacts";
import { isIPOGuruConfigured } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruClient";
import { fetchIPOListFromIPOGuru } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruProvider";
import { mapIPOGuruEntry } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruMapper";
import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { scoreIPONameCandidate } from "@/lib/ipo-engine-clean/matchIPONameClean";
import type { IPOGuruIPOEntry } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruTypes";
import { resolveSourceUrlForIPO } from "@/lib/ipo-engine-clean/source-discovery/resolveSourceUrlForIPO";
import { verifySourceIdentity } from "@/lib/ipo-engine-clean/verifySourceIdentity";
import { materializeFinancialTable } from "@/lib/ipo-engine-clean/financials/materializeFinancials";
import { extractFinancialsWithGroq, isGroqFinancialFallbackEnabled } from "@/lib/ipo-engine-clean/financials/extractFinancialsWithGroq";
import { detectFinancialUnitFromHTML } from "@/lib/ipo-engine-clean/financials/detectFinancialUnit";
import { normalizeFinancialTable, type NormalizedFinancialRow } from "@/lib/ipo-engine-clean/financials/normalizeFinancialTable";

type DetailProvider = Extract<CleanProvider, "IPO_GURU_API" | "CHITTORGARH" | "IPOPLATFORM" | "FINOLOGY_TICKER" | "IPOWATCH" | "INVESTORGAIN">;

type DetailIPO = {
  admin_verified?: boolean | null;
  category?: string | null;
  close_date?: string | null;
  exchange?: string | null;
  id: string;
  issue_size_cr?: number | null;
  is_duplicate?: boolean | null;
  listing_date?: string | null;
  name: string;
  open_date?: string | null;
  price_band_high?: number | null;
  price_band_low?: number | null;
  slug?: string | null;
  status?: string | null;
};

type ParsedDetail = {
  debug: Record<string, unknown>;
  facts: FactCandidate[];
  warnings: string[];
};

type DetailAttemptDebug = {
  content?: IPOPageContentDetection;
  factsDetected: number;
  factsSaved: number;
  fetchStatus: number | null;
  finalReason: string;
  htmlLength: number;
  isCaptchaOrBlocked: boolean;
  isInterstitialOnly: boolean;
  isValidIPOPage: boolean;
  provider: DetailProvider | "ADMIN";
  source: string | null;
  textLength: number;
  url: string | null;
  warnings: string[];
};

type DetailDebug = {
  fieldCoverage: FieldCoverageReport | null;
  detailUrlAttempted: string | null;
  extraction: {
    firstHeadings: string[];
    headingCount: number;
    tableCount: number;
    tablePreviews: unknown[];
  };
  fetch: {
    blocked: boolean;
    error: string | null;
    htmlLength: number;
    ok: boolean;
    status: number | null;
    textLength: number;
  };
  finalStatus: string;
  ipoId: string;
  ipoName: string;
  parser: {
    errors: string[];
    factKeysDetected: string[];
    factsDetected: number;
    warnings: string[];
  };
  provider: DetailProvider | null;
  providersTried: DetailAttemptDebug[];
  save: {
    factsSaved: number;
    factsSkipped: number;
    skipReasons: string[];
  };
  selectedProvider: DetailProvider | null;
  slug: string | null;
};

type FieldCoverageReport = {
  detectedFactKeys: string[];
  expectedFactKeys: string[];
  missingFactKeys: string[];
  parserCoveragePct: number;
  rejectedFactKeys: Array<{
    factKey: string;
    reason: string;
    sourceSection: string | null;
    valuePreview: string;
  }>;
  savedFactKeys: string[];
  skippedBySaver: string[];
  validatedFactKeys: string[];
};

const DETAIL_PROVIDER_CHAIN: DetailProvider[] = ["IPO_GURU_API", "CHITTORGARH", "IPOPLATFORM", "FINOLOGY_TICKER", "IPOWATCH", "INVESTORGAIN"];

const COVERAGE_GROUPS_GURU_DETAIL = {
  ipoDetails: ["open_date", "close_date", "price_band", "issue_size", "lot_size", "listing_date"],
  managers: ["lead_manager_name", "registrar_name"],
  subscription: ["total_subscription"],
};

function findBestGuruEntryForDetail(
  entries: IPOGuruIPOEntry[],
  ipoName: string,
): IPOGuruIPOEntry | null {
  const normalizedTarget = normalizeIPONameClean(ipoName);
  if (!normalizedTarget) return null;

  const ranked: Array<{ entry: IPOGuruIPOEntry; score: number }> = [];

  for (const entry of entries) {
    const entryName = ((entry.name ?? entry.company_name ?? "") as string).trim();
    if (!entryName) continue;
    const normalized = normalizeIPONameClean(entryName);
    if (!normalized) continue;

    if (normalized === normalizedTarget) return entry;
    ranked.push({ entry, score: scoreIPONameCandidate(ipoName, entryName).score });
  }

  ranked.sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const margin = ranked[1] ? best.score - ranked[1].score : best?.score ?? 0;
  return best && best.score >= 82 && margin >= 8 ? best.entry : null;
}
const COVERAGE_GROUPS = {
  companyBasics: ["company_description", "sector", "products_services"],
  ipoDetails: ["ipo_details_table", "open_date", "close_date", "price_band", "issue_size"],
  financials: ["financial_table", "revenue_latest", "pat_latest"],
  valuation: ["pe_ratio", "eps", "ipo_pe"],
  peerComparison: ["peer_valuation_table", "peer_average_pe"],
  subscription: ["subscription_table", "qib_subscription", "nii_subscription", "retail_subscription", "total_subscription"],
  managers: ["lead_manager_name", "lead_managers_table"],
  marketMaker: ["market_maker_name"],
  objectsOfIssue: ["objects_of_issue"],
};

function getMissingCriticalGroups(existingKeys: Set<string>): string[] {
  const missing: string[] = [];
  for (const [groupName, keys] of Object.entries(COVERAGE_GROUPS)) {
    const isFilled = keys.some((key) => existingKeys.has(key));
    if (!isFilled) {
      missing.push(groupName);
    }
  }
  return missing;
}
const EXPECTED_DETAIL_FACT_KEYS = [
  "company_description",
  "sector",
  "products_services",
  "manufacturing_facilities",
  "ipo_details_table",
  "issue_reservation_table",
  "lot_size_table",
  "financial_table",
  "kpi_table",
  "subscription_table",
  "objects_of_issue",
  "strengths",
  "risks",
  "peer_valuation_table",
  "registrar_name",
  "registrar_contact",
  "lead_manager_name",
  "lead_managers_table",
  "market_maker_name",
  "company_contact",
  "price_band",
  "price_band_low",
  "price_band_high",
  "issue_size",
  "total_issue_size",
  "fresh_issue",
  "offer_for_sale",
  "lot_size",
  "face_value",
  "issue_price",
  "issue_type",
  "sale_type",
  "listing_exchange",
  "open_date",
  "close_date",
  "allotment_date",
  "refund_date",
  "credit_of_shares_date",
  "listing_date",
  "roe_latest",
  "roce_latest",
  "ronw_latest",
  "eps_pre_ipo",
  "eps_post_ipo",
  "pe_pre_ipo",
  "pe_post_ipo",
  "promoter_holding_pre_ipo",
  "promoter_holding_post_ipo",
  "market_cap",
  "assets_latest",
  "revenue_latest",
  "total_income_latest",
  "pat_latest",
  "ebitda_latest",
  "net_worth_latest",
  "reserves_latest",
  "borrowing_latest",
];

async function loadDetailSourceRecords(ipo: DetailIPO) {
  const { data, error } = await supabaseAdmin
    .from("ipo_source_records_clean")
    .select("matched_ipo_id,provider,raw_name,record_type,source_url")
    .not("source_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(800);

  if (error) return [];
  return (data ?? []).filter((record) => record.matched_ipo_id === ipo.id || record.raw_name === ipo.name);
}

async function loadDetailSourceLinks(ipoId: string) {
  const [factsRes, sourceUrlsRes] = await Promise.all([
    supabaseAdmin
      .from("ipo_facts_clean")
      .select("fact_key,fact_value,source_provider,source_url")
      .eq("ipo_id", ipoId)
      .in("fact_key", ["chittorgarh_detail_url", "ipoplatform_detail_url", "finology_ticker_detail_url", "ipowatch_detail_url", "investorgain_detail_url"]),
    // Phase 1.7: also check ipo_source_urls_clean for auto-discovered URLs
    supabaseAdmin
      .from("ipo_source_urls_clean")
      .select("provider,source_type,source_url,discovery_method,status")
      .eq("ipo_id", ipoId)
      .eq("source_type", "detail")
      .in("status", ["verified", "candidate"])
      .order("match_confidence", { ascending: false }),
  ]);

  const factLinks = factsRes.data ?? [];

  // Convert ipo_source_urls_clean rows into the same shape resolveDetailUrlClean expects
  const providerToFactKey: Record<string, string> = {
    CHITTORGARH: "chittorgarh_detail_url",
    FINOLOGY_TICKER: "finology_ticker_detail_url",
    IPOWATCH: "ipowatch_detail_url",
    INVESTORGAIN: "investorgain_detail_url",
    IPOPLATFORM: "ipoplatform_detail_url",
  };
  const discoveredLinks = (sourceUrlsRes.data ?? [])
    .filter((row) => row.status === "verified" || row.status === "candidate")
    .map((row) => ({
      fact_key: providerToFactKey[row.provider] ?? `${row.provider.toLowerCase()}_detail_url`,
      fact_value: row.source_url,
      source_provider: row.provider,
      source_url: row.source_url,
    }));

  // Merge: factLinks (admin manual) take priority
  const merged = [...factLinks];
  for (const link of discoveredLinks) {
    const alreadyExists = merged.some((f) => f.fact_key === link.fact_key);
    if (!alreadyExists) merged.push(link);
  }
  return merged;
}


async function loadTargetIPOs({ financialsOnly = false, ipoId, limit = 30 }: { financialsOnly?: boolean; ipoId?: string; limit?: number }) {
  let query = supabaseAdmin
    .from("ipos")
    .select("id,name,slug,category,status,open_date,close_date,listing_date,price_band_low,price_band_high,issue_size_cr,is_duplicate,duplicate_status,admin_verified")
    .or("is_duplicate.is.null,is_duplicate.eq.false")
    .order("close_date", { ascending: false })
    .limit(120);

  if (ipoId) {
    query = query.eq("id", ipoId).limit(1);
  }

  const { data, error } = await query;
  if (error) throw error;
  const ipos = (data ?? []) as DetailIPO[];
  if (ipoId || ipos.length === 0) return ipos;

  const ids = ipos.map((ipo) => ipo.id);
  const [factsResult, yearlyResult, attemptsResult] = await Promise.all([
    supabaseAdmin.from("ipo_facts_clean").select("ipo_id").in("ipo_id", ids).eq("fact_key", "financial_table"),
    supabaseAdmin.from("ipo_financials_yearly").select("ipo_id").in("ipo_id", ids),
    supabaseAdmin
      .from("ipo_source_records_clean")
      .select("matched_ipo_id,created_at")
      .in("matched_ipo_id", ids)
      .eq("record_type", "detail")
      .order("created_at", { ascending: false })
      .limit(1500),
  ]);
  const factCoverage = new Set((factsResult.data ?? []).map((row) => String(row.ipo_id)));
  const yearlyCoverage = new Set((yearlyResult.data ?? []).map((row) => String(row.ipo_id)));
  const lastAttempt = new Map<string, number>();
  for (const row of attemptsResult.data ?? []) {
    const id = String(row.matched_ipo_id ?? "");
    if (!id || lastAttempt.has(id)) continue;
    lastAttempt.set(id, Date.parse(String(row.created_at ?? "")) || 0);
  }

  const prioritized = ipos
    .filter((ipo) => !financialsOnly || !yearlyCoverage.has(ipo.id))
    .sort((left, right) => {
      const leftPriority = yearlyCoverage.has(left.id) ? 2 : factCoverage.has(left.id) ? 0 : 1;
      const rightPriority = yearlyCoverage.has(right.id) ? 2 : factCoverage.has(right.id) ? 0 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      const attempted = (lastAttempt.get(left.id) ?? 0) - (lastAttempt.get(right.id) ?? 0);
      if (attempted !== 0) return attempted;
      return String(right.close_date ?? "").localeCompare(String(left.close_date ?? ""));
    });
  return prioritized.slice(0, Math.max(1, Math.min(50, Math.floor(limit))));
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIssueSizeCr(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const croreMatch = value.match(/(?:₹|rs\.?|inr)?\s*([\d,.]+)\s*(?:cr|crore)\b/i);
  if (croreMatch?.[1]) {
    const parsed = Number.parseFloat(croreMatch[1].replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return parseNumber(value);
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const clean = value.replace(/T$/, "").replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+/i, "").trim();
  const monthMap: Record<string, string> = {
    apr: "04",
    april: "04",
    aug: "08",
    august: "08",
    dec: "12",
    december: "12",
    feb: "02",
    february: "02",
    jan: "01",
    january: "01",
    jul: "07",
    july: "07",
    jun: "06",
    june: "06",
    mar: "03",
    march: "03",
    may: "05",
    nov: "11",
    november: "11",
    oct: "10",
    october: "10",
    sep: "09",
    sept: "09",
    september: "09",
  };
  const monthFirst = clean.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthFirst) {
    const [, month, day, year] = monthFirst;
    const mm = monthMap[month.toLowerCase()];
    if (mm) return `${year}-${mm}-${day.padStart(2, "0")}`;
  }
  const dayFirst = clean.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    const mm = monthMap[month.toLowerCase()];
    if (mm) return `${year}-${mm}-${day.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  return null;
}

function factByKey(facts: Array<{ factKey: string; factValue: unknown }>, key: string) {
  return facts.find((fact) => fact.factKey === key)?.factValue ?? null;
}

async function updateCoreIPOColumns(ipo: DetailIPO, facts: Array<{ factKey: string; factValue: unknown }>) {
  if (ipo.admin_verified) return [];

  const updates: Array<{ column: string; value: unknown }> = [];
  const issueSize = parseIssueSizeCr(factByKey(facts, "issue_size"));
  const lotSize = parseNumber(factByKey(facts, "lot_size"));
  const priceBand = String(factByKey(facts, "price_band") ?? "");
  const prices = priceBand.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const registrar = factByKey(facts, "registrar_name");
  const openDate = parseDate(factByKey(facts, "open_date"));
  const closeDate = parseDate(factByKey(facts, "close_date"));
  const listingDate = parseDate(factByKey(facts, "listing_date"));

  if (issueSize !== null) updates.push({ column: "issue_size_cr", value: issueSize });
  if (lotSize !== null) updates.push({ column: "lot_size", value: lotSize });
  if (prices.length > 0) updates.push({ column: "price_band_high", value: prices.at(-1) ?? null });
  if (prices.length > 1) updates.push({ column: "price_band_low", value: prices[0] });
  if (openDate) updates.push({ column: "open_date", value: openDate });
  if (closeDate) updates.push({ column: "close_date", value: closeDate });
  if (listingDate) updates.push({ column: "listing_date", value: listingDate });
  if (typeof registrar === "string" && registrar.trim()) updates.push({ column: "registrar_name", value: registrar.trim() });

  const skipped: string[] = [];
  for (const update of updates) {
    const { error } = await supabaseAdmin.from("ipos").update({ [update.column]: update.value }).eq("id", ipo.id);
    if (error) skipped.push(`core.${update.column}: ${error.message}`);
  }
  return skipped;
}

async function cleanupInvalidGeneratedIdentityFacts(ipoId: string) {
  const { data, error } = await supabaseAdmin
    .from("ipo_facts_clean")
    .select("id,fact_key,fact_value,display_value,confidence,admin_verified")
    .eq("ipo_id", ipoId)
    .in("fact_key", ["lead_manager_name", "registrar_name", "market_maker_name"]);

  if (error || !data) return error ? [`identity_cleanup: ${error.message}`] : [];

  const skipped: string[] = [];
  for (const row of data as Array<Record<string, unknown>>) {
    if (row.admin_verified === true) continue;
    const candidate = {
      confidence: typeof row.confidence === "string" ? (row.confidence as "high" | "medium" | "low") : "medium",
      displayValue: typeof row.display_value === "string" ? row.display_value : null,
      factKey: String(row.fact_key),
      factValue: row.fact_value ?? row.display_value,
    };
    const validation = validateFacts([candidate]);
    if (validation.accepted.length > 0) continue;

    const { error: deleteError } = await supabaseAdmin.from("ipo_facts_clean").delete().eq("id", row.id);
    if (deleteError) skipped.push(`${candidate.factKey}: invalid generated fact cleanup failed: ${deleteError.message}`);
    else skipped.push(`${candidate.factKey}: removed invalid generated fact (${validation.rejected[0]?.reason ?? "failed current validation"}).`);
  }
  return skipped;
}

async function maybeWriteDetailFixture(ipo: DetailIPO, provider: DetailProvider, html: string) {
  if (process.env.NODE_ENV === "production") return;
  const slug = ipo.slug ?? "";
  const prefix = provider === "FINOLOGY_TICKER" ? "finology-ticker-detail" : provider === "CHITTORGARH" ? "chittorgarh-detail" : null;
  if (!prefix) return;
  const fixtureName = slug.includes("horizon-reclaim")
    ? `${prefix}-horizon-reclaim.html`
    : slug.includes("susan-electricals")
      ? `${prefix}-susan-electricals.html`
      : null;
  if (!fixtureName) return;

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), "test/fixtures/ipo-engine-clean");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fixtureName), html);
}

function parseProviderDetail(provider: DetailProvider, html: string, ipoName: string): ParsedDetail | null {
  if (provider === "CHITTORGARH") return parseChittorgarhDetail(html, ipoName);
  if (provider === "FINOLOGY_TICKER") return parseFinologyTickerDetail(html, ipoName);
  if (provider === "IPOWATCH") return parseIPOWatchReview(html, ipoName);
  return null;
}

function providerSourcePriority(provider: DetailProvider) {
  if (provider === "IPO_GURU_API") return 25;
  if (provider === "CHITTORGARH") return 30;
  if (provider === "IPOPLATFORM") return 35;
  if (provider === "FINOLOGY_TICKER") return 45;
  if (provider === "IPOWATCH") return 55;
  return 60;
}

function hasEnoughUsefulFacts(facts: FactCandidate[]) {
  const keys = Array.from(new Set(facts.map((fact) => fact.factKey)));
  const hasCoreFact = keys.some((key) =>
    [
      "company_description", "financial_table", "ipo_details_table", "registrar_name",
      // Review-only providers (IPOWatch) provide these instead of core scrape facts
      "ipo_review_summary", "peer_valuation_table", "risks", "sectorPEAvg",
    ].includes(key)
  );
  return hasCoreFact && (keys.length >= 3 || keys.includes("financial_table"));
}

const DERIVED_FINANCIAL_FACT_KEYS = new Set([
  "financial_table",
  "revenue_latest",
  "total_income_latest",
  "pat_latest",
  "ebitda_latest",
  "net_worth_latest",
  "assets_latest",
  "reserves_latest",
  "borrowing_latest",
  "revenue_growth",
  "pat_growth",
  "pat_margin_latest",
  "ebitda_margin_latest",
]);

function financialFact(key: string, value: number, template: FactCandidate): FactCandidate {
  return {
    confidence: template.confidence ?? "medium",
    displayValue: String(value),
    factKey: key,
    factValue: value,
    sourceEvidence: template.sourceEvidence,
  };
}

function growth(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

function sanitizeFinancialFacts(
  facts: FactCandidate[],
  unit: "crore" | "lakh" | "million" | "thousand" | "unknown" | undefined,
) {
  const table = facts.find((fact) => fact.factKey === "financial_table");
  if (!table) return { facts, warnings: [] as string[] };

  const retained = facts.filter((fact) => !DERIVED_FINANCIAL_FACT_KEYS.has(fact.factKey));
  if (!unit || unit === "unknown") {
    return {
      facts: retained,
      warnings: ["Financial fact was withheld because its monetary unit could not be verified."],
    };
  }

  const normalized = normalizeFinancialTable(table.factValue, { unit });
  if (normalized.rows.length === 0) {
    return {
      facts: retained,
      warnings: [...normalized.warnings, ...normalized.rejectedRows.map((row) => row.reason)],
    };
  }

  const sanitized: FactCandidate[] = [
    ...retained,
    {
      ...table,
      displayValue: `${normalized.rows.length} validated financial period(s)`,
      factValue: normalized.rows,
    },
  ];
  const latest = normalized.rows.at(-1) as NormalizedFinancialRow;
  const previous = normalized.rows.at(-2) ?? null;
  const mappings: Array<[keyof NormalizedFinancialRow, string]> = [
    ["revenue_cr", "revenue_latest"],
    ["total_income_cr", "total_income_latest"],
    ["pat_cr", "pat_latest"],
    ["ebitda_cr", "ebitda_latest"],
    ["net_worth_cr", "net_worth_latest"],
    ["total_assets_cr", "assets_latest"],
    ["reserves_cr", "reserves_latest"],
    ["total_borrowings_cr", "borrowing_latest"],
    ["pat_margin_pct", "pat_margin_latest"],
    ["ebitda_margin_pct", "ebitda_margin_latest"],
  ];
  for (const [column, factKey] of mappings) {
    const value = latest[column];
    if (typeof value === "number" && Number.isFinite(value)) sanitized.push(financialFact(factKey, value, table));
  }

  const revenueGrowth = growth(latest.revenue_cr, previous?.revenue_cr ?? null);
  const patGrowth = growth(latest.pat_cr, previous?.pat_cr ?? null);
  if (revenueGrowth !== null) sanitized.push(financialFact("revenue_growth", revenueGrowth, table));
  if (patGrowth !== null) sanitized.push(financialFact("pat_growth", patGrowth, table));

  return {
    facts: sanitized,
    warnings: [...normalized.warnings, ...normalized.rejectedRows.map((row) => `Rejected financial period: ${row.reason}`)],
  };
}

function previewValue(value: unknown) {
  if (typeof value === "string") return value.slice(0, 160);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value ?? null).slice(0, 160);
}

function buildFieldCoverage({
  parsedFacts,
  rejected,
  savedFactKeys,
  skippedBySaver,
  validatedFacts,
}: {
  parsedFacts: FactCandidate[];
  rejected: ReturnType<typeof validateFacts>["rejected"];
  savedFactKeys: string[];
  skippedBySaver: string[];
  validatedFacts: FactCandidate[];
}): FieldCoverageReport {
  const detectedFactKeys = Array.from(new Set(parsedFacts.map((fact) => fact.factKey))).sort();
  const validatedFactKeys = Array.from(new Set(validatedFacts.map((fact) => fact.factKey))).sort();
  const saved = Array.from(new Set(savedFactKeys)).sort();
  const missingFactKeys = EXPECTED_DETAIL_FACT_KEYS.filter((key) => !detectedFactKeys.includes(key));
  const expectedDetectedCount = EXPECTED_DETAIL_FACT_KEYS.filter((key) => detectedFactKeys.includes(key)).length;
  return {
    detectedFactKeys,
    expectedFactKeys: EXPECTED_DETAIL_FACT_KEYS,
    missingFactKeys,
    parserCoveragePct: Math.min(100, Math.round((expectedDetectedCount / EXPECTED_DETAIL_FACT_KEYS.length) * 100)),
    rejectedFactKeys: rejected.map((item) => ({
      factKey: item.fact.factKey,
      reason: item.reason,
      sourceSection: item.fact.sourceEvidence ?? item.fact.displayValue ?? null,
      valuePreview: previewValue(item.fact.factValue),
    })),
    savedFactKeys: saved,
    skippedBySaver,
    validatedFactKeys,
  };
}

function parserDebug(parsed: ParsedDetail | null) {
  if (!parsed) {
    return {
      extraction: { firstHeadings: [], headingCount: 0, tableCount: 0, tablePreviews: [] },
      parser: { errors: [], factKeysDetected: [], factsDetected: 0, warnings: [] },
    };
  }
  return {
    extraction: {
      firstHeadings: Array.isArray(parsed.debug.headings) ? (parsed.debug.headings as unknown[]).map((item) => String(item)).slice(0, 8) : [],
      headingCount: Number(parsed.debug.headingCount ?? parsed.debug.headingsFound ?? 0),
      tableCount: Number(parsed.debug.tableCount ?? parsed.debug.tablesFound ?? 0),
      tablePreviews: Array.isArray(parsed.debug.tablePreviews) ? (parsed.debug.tablePreviews as unknown[]).slice(0, 8) : [],
    },
    parser: {
      errors: [],
      factKeysDetected: Array.isArray(parsed.debug.factKeysDetected) ? (parsed.debug.factKeysDetected as string[]) : parsed.facts.map((fact) => fact.factKey),
      factsDetected: parsed.facts.length,
      warnings: parsed.warnings,
    },
  };
}

function emptyDetailDebug(ipo: DetailIPO): DetailDebug {
  return {
    detailUrlAttempted: null,
    extraction: { firstHeadings: [], headingCount: 0, tableCount: 0, tablePreviews: [] },
    fetch: { blocked: false, error: null, htmlLength: 0, ok: false, status: null, textLength: 0 },
    fieldCoverage: null,
    finalStatus: "not_started",
    ipoId: ipo.id,
    ipoName: ipo.name,
    parser: { errors: [], factKeysDetected: [], factsDetected: 0, warnings: [] },
    provider: null,
    providersTried: [],
    save: { factsSaved: 0, factsSkipped: 0, skipReasons: [] },
    selectedProvider: null,
    slug: ipo.slug ?? null,
  };
}

export async function runDetailSyncClean({
  financialsOnly = false,
  ipoId,
  limit = 30,
}: {
  financialsOnly?: boolean;
  ipoId?: string;
  limit?: number;
} = {}): Promise<CleanSyncResult> {
  if (shouldSkipForKillSwitch()) return { ...disabledResult(), syncType: "detail" as const };

  let runId: string | null = null;
  try {
    const run = await createRun("detail", "DETAIL_CHAIN");
    runId = run.id;
    const ipos = await loadTargetIPOs({ financialsOnly, ipoId, limit });
    const context = await loadMatchingContext();
    let found = 0;
    let matched = 0;
    let saved = 0;
    let skipped = 0;
    let failed = 0;
    const warnings: string[] = [];
    const errors: string[] = [];
    const detailDebug: DetailDebug[] = [];

    // Fetch IPO Guru list once and reuse across all IPOs
    let ipoGuruListCache: Awaited<ReturnType<typeof fetchIPOListFromIPOGuru>> | null = null;
    if (isIPOGuruConfigured() && DETAIL_PROVIDER_CHAIN.includes("IPO_GURU_API")) {
      ipoGuruListCache = await fetchIPOListFromIPOGuru();
    }

    for (const ipo of ipos) {
      const sourceRecords = await loadDetailSourceRecords(ipo);
      const sourceLinks = await loadDetailSourceLinks(ipo.id);
      const debug = emptyDetailDebug(ipo);

      const { data: existingFacts } = await supabaseAdmin
        .from("ipo_facts_clean")
        .select("fact_key,fact_value,source_provider,source_url,source_priority,confidence")
        .eq("ipo_id", ipo.id);
      const existingKeys = new Set((existingFacts ?? []).map((f) => String(f.fact_key)));

      const existingFinancialFact = (existingFacts ?? []).find((fact) => fact.fact_key === "financial_table");
      if (existingFinancialFact) {
        const factConfidence = existingFinancialFact.confidence === "high" || existingFinancialFact.confidence === "low"
          ? existingFinancialFact.confidence
          : "medium";
        const backfillProvider = String(existingFinancialFact.source_provider ?? "CLEAN_FACT_BACKFILL");
        const backfillPriority = DETAIL_PROVIDER_CHAIN.includes(backfillProvider as DetailProvider)
          ? providerSourcePriority(backfillProvider as DetailProvider)
          : Number(existingFinancialFact.source_priority ?? 70);
        const backfill = await materializeFinancialTable({
          confidence: factConfidence,
          factValue: existingFinancialFact.fact_value,
          identityScore: null,
          ipoId: ipo.id,
          parser: "deterministic",
          sourcePriority: backfillPriority,
          sourceProvider: backfillProvider,
          sourceUrl: existingFinancialFact.source_url ? String(existingFinancialFact.source_url) : null,
        });
        saved += backfill.saved;
        skipped += backfill.skipped + backfill.rejected;
        warnings.push(...backfill.warnings.map((warning) => `${ipo.name}: financial backfill: ${warning}`));
      }

      const providers = financialsOnly
        ? DETAIL_PROVIDER_CHAIN.filter((provider) => provider !== "IPO_GURU_API" && provider !== "INVESTORGAIN")
        : DETAIL_PROVIDER_CHAIN;
      for (const provider of providers) {
        // ── IPO_GURU_API fast-path (API, not a URL-based scrape) ──────────────
        if (provider === "IPO_GURU_API") {
          const attempt: DetailAttemptDebug = {
            factsDetected: 0,
            factsSaved: 0,
            fetchStatus: null,
            finalReason: "not_started",
            htmlLength: 0,
            isCaptchaOrBlocked: false,
            isInterstitialOnly: false,
            isValidIPOPage: false,
            provider,
            source: "api",
            textLength: 0,
            url: "https://www.ipoguru.in/api/v1/ipos",
            warnings: [],
          };
          debug.providersTried.push(attempt);

          if (!ipoGuruListCache?.ok || !ipoGuruListCache.entries.length) {
            attempt.finalReason = ipoGuruListCache?.error ?? "list_not_fetched";
            attempt.warnings.push(attempt.finalReason);
            skipped += 1;
            warnings.push(`${ipo.name}: IPO_GURU_API: ${attempt.finalReason}`);
            continue;
          }

          const bestEntry = findBestGuruEntryForDetail(ipoGuruListCache.entries, ipo.name);
          if (!bestEntry) {
            attempt.finalReason = "no_matching_entry";
            attempt.warnings.push(attempt.finalReason);
            skipped += 1;
            warnings.push(`${ipo.name}: IPO_GURU_API: no_matching_entry`);
            continue;
          }

          const guruMapped = mapIPOGuruEntry(bestEntry);
          if (!guruMapped || guruMapped.facts.length === 0) {
            attempt.finalReason = "no_mappable_facts";
            attempt.warnings.push(attempt.finalReason);
            skipped += 1;
            warnings.push(`${ipo.name}: IPO_GURU_API: no_mappable_facts`);
            continue;
          }

          attempt.factsDetected = guruMapped.facts.length;
          const guruValidation = validateFacts(guruMapped.facts);

          // Lower threshold for IPO Guru: accept if >= 1 ipoDetails fact
          const guruFactKeys = new Set(guruValidation.accepted.map((f) => f.factKey));
          const hasIpoDetailFact = COVERAGE_GROUPS_GURU_DETAIL.ipoDetails.some((k) => guruFactKeys.has(k));

          if (!hasIpoDetailFact) {
            attempt.finalReason = "low_yield_detail_facts";
            attempt.warnings.push(attempt.finalReason);
            skipped += 1;
            warnings.push(`${ipo.name}: IPO_GURU_API: low_yield_detail_facts`);
            continue;
          }

          const guruRecord: CleanSourceRecord = {
            rawName: ipo.name,
            recordType: "detail",
            sourceUrl: null,
            payload: { ipoGuruId: guruMapped.ipoGuruId, factCount: guruMapped.facts.length },
          };

          await stageSourceRecord({
            match: { confidence: 100, ipoId: ipo.id, matchType: "exact", reason: "Detail sync IPO Guru API fast-path." },
            provider,
            record: guruRecord,
            runId,
            status: "matched",
          });

          const guruSavedFacts = await saveFactsClean({
            facts: guruMapped.facts,
            ipoId: ipo.id,
            sourcePriority: providerSourcePriority(provider),
            sourceProvider: provider,
            sourceUrl: null,
          });

          attempt.factsSaved = guruSavedFacts.saved;
          attempt.finalReason = guruSavedFacts.saved > 0 ? "success" : "validated_no_new_facts";
          attempt.isValidIPOPage = true;

          matched += 1;
          saved += guruSavedFacts.saved;
          skipped += guruSavedFacts.skipped.length + guruSavedFacts.rejected;

          guruSavedFacts.savedFactKeys.forEach((k) => existingKeys.add(k));
          guruValidation.accepted.forEach((f) => existingKeys.add(f.factKey));

          debug.provider = provider;
          debug.selectedProvider = provider;
          debug.finalStatus = attempt.finalReason;

          const guruMissingGroups = getMissingCriticalGroups(existingKeys);
          if (guruMissingGroups.length === 0) {
            break;
          }
          // Not enough coverage; continue to next provider
          continue;
        }
        // ── End IPO_GURU_API fast-path ────────────────────────────────────────

        let resolved = resolveDetailUrlClean({ ipo, provider, sourceLinks, sourceRecords });
        if (["CHITTORGARH", "IPOPLATFORM", "FINOLOGY_TICKER"].includes(provider) && (!resolved.url || resolved.source === "safe_finology_slug")) {
          const discovered = await resolveSourceUrlForIPO({
            allowDiscovery: true,
            ipoId: ipo.id,
            provider,
            sourceType: "detail",
          });
          if (discovered.url) {
            resolved = {
              source: discovered.source,
              url: discovered.url,
              warning: null,
            };
          }
        }
        const attempt: DetailAttemptDebug = {
          factsDetected: 0,
          factsSaved: 0,
          fetchStatus: null,
          finalReason: resolved.warning ?? "not_started",
          htmlLength: 0,
          isCaptchaOrBlocked: false,
          isInterstitialOnly: false,
          isValidIPOPage: false,
          provider,
          source: resolved.source,
          textLength: 0,
          url: resolved.url,
          warnings: [],
        };
        debug.providersTried.push(attempt);

        if (!resolved.url) {
          skipped += 1;
          attempt.finalReason = resolved.warning ?? `no_source_url_for_provider:${provider}`;
          attempt.warnings.push(attempt.finalReason);
          warnings.push(`${ipo.name}: ${provider}: ${attempt.finalReason}`);
          continue;
        }

        found += 1;
        debug.detailUrlAttempted ??= resolved.url;
        const fetched = await fetchSource(resolved.url, { delayMs: 900, retries: 1, timeoutMs: 15000 });
        attempt.fetchStatus = fetched.status;
        attempt.htmlLength = fetched.html?.length ?? 0;
        attempt.textLength = fetched.text?.length ?? 0;
        debug.fetch = {
          blocked: fetched.blocked,
          error: fetched.error,
          htmlLength: fetched.html?.length ?? 0,
          ok: fetched.ok,
          status: fetched.status,
          textLength: fetched.text?.length ?? 0,
        };

        if (!fetched.html) {
          failed += 1;
          const error = `${provider}: ${fetched.error ?? "detail fetch failed"}`;
          attempt.finalReason = error;
          attempt.warnings.push(error);
          errors.push(`${ipo.name}: ${error}`);
          continue;
        }

        const content = detectIPOPageContent({ html: fetched.html, ipoName: ipo.name, provider, text: fetched.text });
        const identity = verifySourceIdentity({ html: fetched.html, ipoName: ipo.name, sourceUrl: resolved.url });
        attempt.content = content;
        attempt.isValidIPOPage = content.isValidIPOPage;
        attempt.isInterstitialOnly = content.isInterstitialOnly;
        attempt.isCaptchaOrBlocked = fetched.blocked || content.isCaptchaOrBlocked;

        if (fetched.blocked || content.isCaptchaOrBlocked || content.isInterstitialOnly || !content.isValidIPOPage) {
          skipped += 1;
          attempt.finalReason = content.reason;
          attempt.warnings.push(content.reason);
          warnings.push(`${ipo.name}: ${provider}: ${content.reason}`);
          const record: CleanSourceRecord = {
            payload: { content, fetch: { htmlLength: attempt.htmlLength, status: fetched.status, textLength: attempt.textLength } },
            rawName: ipo.name,
            recordType: "detail",
            sourceUrl: resolved.url,
          };
          await stageSourceRecord({
            match: { confidence: 100, ipoId: ipo.id, matchType: "exact", reason: "Detail sync content check skipped this source." },
            provider,
            record,
            runId,
            status: "ignored",
          });
          continue;
        }

        if (!identity.accepted) {
          skipped += 1;
          attempt.finalReason = "source_identity_needs_review";
          attempt.warnings.push(identity.reason);
          warnings.push(`${ipo.name}: ${provider}: ${identity.reason}`);
          await stageSourceRecord({
            match: { confidence: identity.confidence, ipoId: null, matchType: "none", reason: identity.reason },
            provider,
            record: {
              payload: { content, identity },
              rawName: identity.bestCandidate ?? ipo.name,
              recordType: "detail",
              sourceUrl: resolved.url,
            },
            runId,
            status: "needs_review",
          });
          continue;
        }

        await maybeWriteDetailFixture(ipo, provider, fetched.html);

        let parsed: ParsedDetail | null = null;
        let financialEvidenceHtml = fetched.html;
        let financialParser: "deterministic" | "groq_evidence_fallback" = "deterministic";
        let financialUnit: "crore" | "lakh" | "million" | "thousand" | "unknown" | undefined;
        if (provider === "IPOPLATFORM") {
          const siblings = deriveIPOPlatformSiblingUrls(resolved.url);
          const siblingHtmls: Record<string, string | null> = {
            financialReport: null,
            peerComparison: null,
            subscription: null,
            review: null,
          };
          if (typeof siblings === "object") {
            for (const [key, url] of Object.entries(siblings)) {
              if (key === "base") continue;
              const subFetched = await fetchSource(url, { delayMs: 900, retries: 1, timeoutMs: 15000 });
              if (subFetched.html) {
                siblingHtmls[key] = subFetched.html;
                if (key === "financialReport") financialEvidenceHtml += `\n${subFetched.html}`;
              }
            }
          }
          const detailResult = parseIPOPlatformDetail({
            baseHtml: fetched.html,
            siblingHtmls,
            ipoName: ipo.name,
            baseUrl: resolved.url,
          });
          parsed = {
            facts: detailResult.facts,
            warnings: detailResult.warnings,
            debug: detailResult.debug,
          };
        } else if (provider === "CHITTORGARH") {
          const $ = cheerio.load(fetched.html);
          const reviewLinkAttr = $("a").filter((_, el) => {
            const text = $(el).text();
            const href = $(el).attr("href") ?? "";
            return /Read detail review|Read detailed review/i.test(text) || /\/ipo_review\//i.test(href);
          }).first().attr("href");

          let reviewHtml: string | null = null;
          let reviewUrl: string | null = null;
          if (reviewLinkAttr) {
            reviewUrl = reviewLinkAttr.startsWith("http") ? reviewLinkAttr : `https://www.chittorgarh.com${reviewLinkAttr.startsWith("/") ? "" : "/"}${reviewLinkAttr}`;
            const reviewFetched = await fetchSource(reviewUrl, { delayMs: 900, retries: 1, timeoutMs: 15000 });
            if (reviewFetched.html) {
              reviewHtml = reviewFetched.html;
              financialEvidenceHtml += `\n${reviewFetched.html}`;
            }
          }

          if (reviewUrl) {
            // Save to old table for backward compatibility
            try {
              await supabaseAdmin.from("ipo_source_links").upsert({
                ipo_id: ipo.id,
                source_type: "chittorgarh_review",
                source_provider: "CHITTORGARH",
                source_url: reviewUrl,
                source_priority: 35
              }, { onConflict: "ipo_id,source_type,source_provider" });
            } catch { /* best-effort */ }
            // Phase 1.2: also save to new ipo_source_urls_clean
            try {
              await supabaseAdmin.from("ipo_source_urls_clean").upsert({
                ipo_id: ipo.id,
                provider: "CHITTORGARH",
                source_type: "review",
                source_url: reviewUrl,
                discovery_method: "sibling_url",
                match_confidence: 90,
                status: "verified",
                updated_at: new Date().toISOString(),
                last_checked_at: new Date().toISOString(),
                last_success_at: new Date().toISOString(),
              }, { onConflict: "ipo_id,provider,source_type,source_url", ignoreDuplicates: false });
            } catch { /* best-effort */ }
          }

          const detailResult = parseChittorgarhDetail(fetched.html, ipo.name, reviewHtml);
          parsed = {
            facts: detailResult.facts,
            warnings: detailResult.warnings,
            debug: detailResult.debug,
          };
        } else {
          parsed = parseProviderDetail(provider, fetched.html, ipo.name);
        }

        if (!parsed) {
          skipped += 1;
          attempt.finalReason = "provider_parser_not_implemented";
          attempt.warnings.push(attempt.finalReason);
          warnings.push(`${ipo.name}: ${provider}: provider_parser_not_implemented`);
          continue;
        }

        if (!validateFacts(parsed.facts).accepted.some((fact) => fact.factKey === "financial_table") && isGroqFinancialFallbackEnabled()) {
          try {
            const aiFinancials = await extractFinancialsWithGroq({
              html: financialEvidenceHtml,
              ipoName: ipo.name,
              sourceProvider: provider,
              sourceUrl: resolved.url,
            });
            parsed.warnings.push(...aiFinancials.warnings);
            if (aiFinancials.fact) {
              parsed.facts.push(aiFinancials.fact);
              financialParser = "groq_evidence_fallback";
              financialUnit = aiFinancials.unit;
            }
          } catch (error) {
            parsed.warnings.push(`AI financial fallback failed safely: ${error instanceof Error ? error.message : "unknown error"}`);
          }
        }

        if (!financialUnit) {
          const financialFact = validateFacts(parsed.facts).accepted.find((fact) => fact.factKey === "financial_table");
          if (financialFact) {
            const unitDetection = detectFinancialUnitFromHTML(financialEvidenceHtml, financialFact.factValue);
            financialUnit = unitDetection.unit ?? undefined;
            if (!unitDetection.unit) parsed.warnings.push(unitDetection.evidence);
          }
        }

        const sanitizedFinancials = sanitizeFinancialFacts(parsed.facts, financialUnit);
        parsed.facts = sanitizedFinancials.facts;
        parsed.warnings.push(...sanitizedFinancials.warnings);

        const debugParts = parserDebug(parsed);
        debug.extraction = debugParts.extraction;
        debug.parser = debugParts.parser;
        attempt.factsDetected = parsed.facts.length;
        attempt.warnings.push(...parsed.warnings);

        const validation = validateFacts(parsed.facts);
        const rejectedReasons = validation.rejected.map((item) => `${item.fact.factKey}: ${item.reason}`);
        const usefulFacts = financialsOnly
          ? validation.accepted.some((fact) => fact.factKey === "financial_table")
          : hasEnoughUsefulFacts(validation.accepted);
        debug.fieldCoverage = buildFieldCoverage({
          parsedFacts: parsed.facts,
          rejected: validation.rejected,
          savedFactKeys: [],
          skippedBySaver: [],
          validatedFacts: validation.accepted,
        });
        const record: CleanSourceRecord = {
          payload: {
            content,
            debug: parsed.debug,
            factCount: parsed.facts.length,
            usefulFacts,
            validation: { accepted: validation.accepted.length, rejected: rejectedReasons },
            warnings: parsed.warnings,
          },
          rawName: ipo.name,
          recordType: "detail",
          sourceUrl: resolved.url,
        };
        await stageSourceRecord({
          match: { confidence: 100, ipoId: ipo.id, matchType: "exact", reason: "Detail sync runs only for selected canonical IPO rows." },
          provider,
          record,
          runId,
          status: usefulFacts ? "matched" : "ignored",
        });

        if (!usefulFacts) {
          skipped += 1;
          const reason = "low_yield_detail_facts";
          attempt.finalReason = reason;
          attempt.warnings.push(reason, ...rejectedReasons);
          warnings.push(`${ipo.name}: ${provider}: ${reason}`);
          warnings.push(...rejectedReasons.map((item) => `${ipo.name}: ${provider}: ${item}`));
          continue;
        }

        const factsToSave = financialsOnly
          ? parsed.facts.filter((fact) => fact.factKey === "financial_table" || /^(?:revenue|pat|ebitda|assets|net_worth|borrowing|reserves|total_income)/.test(fact.factKey))
          : parsed.facts;
        const savedFacts = await saveFactsClean({
          facts: factsToSave,
          ipoId: ipo.id,
          sourcePriority: providerSourcePriority(provider),
          sourceProvider: provider,
          sourceUrl: resolved.url,
        });

        const financialFact = validation.accepted.find((fact) => fact.factKey === "financial_table");
        const materialized = financialFact
          ? await materializeFinancialTable({
              confidence: financialFact.confidence ?? "medium",
              factValue: financialFact.factValue,
              identityScore: identity.confidence,
              ipoId: ipo.id,
              parser: financialParser,
              sourcePriority: providerSourcePriority(provider),
              sourceProvider: provider,
              sourceUrl: resolved.url,
              unit: financialUnit,
            })
          : null;

        matched += 1;
        saved += savedFacts.saved + (materialized?.saved ?? 0);
        skipped += savedFacts.skipped.length + savedFacts.rejected + (materialized?.skipped ?? 0) + (materialized?.rejected ?? 0);
        const coreSkipped = financialsOnly ? [] : await updateCoreIPOColumns(ipo, validation.accepted);
        const cleanupSkipped = financialsOnly ? [] : await cleanupInvalidGeneratedIdentityFacts(ipo.id);
        const financialWarnings = materialized
          ? [...materialized.warnings, ...materialized.conflicts].map((warning) => `financials: ${warning}`)
          : [];
        const skipReasons = [...savedFacts.skipped, ...coreSkipped, ...cleanupSkipped, ...financialWarnings];
        debug.fieldCoverage = buildFieldCoverage({
          parsedFacts: parsed.facts,
          rejected: validation.rejected,
          savedFactKeys: savedFacts.savedFactKeys,
          skippedBySaver: skipReasons,
          validatedFacts: validation.accepted,
        });
        attempt.factsSaved = savedFacts.saved + (materialized?.saved ?? 0);
        attempt.finalReason = attempt.factsSaved > 0 ? "success" : "validated_no_new_facts";
        attempt.warnings.push(...skipReasons);
        debug.provider = provider;
        debug.selectedProvider = provider;
        debug.finalStatus = attempt.finalReason;
        debug.save = {
          factsSaved: attempt.factsSaved,
          factsSkipped: savedFacts.skipped.length + savedFacts.rejected + coreSkipped.length + cleanupSkipped.length + (materialized?.skipped ?? 0) + (materialized?.rejected ?? 0),
          skipReasons,
        };
        warnings.push(...parsed.warnings.map((item) => `${ipo.name}: ${provider}: ${item}`), ...skipReasons.map((item: string) => `${ipo.name}: ${provider}: ${item}`));

        savedFacts.savedFactKeys.forEach((k) => existingKeys.add(k));
        validation.accepted.forEach((f) => existingKeys.add(f.factKey));

        const missingGroups = getMissingCriticalGroups(existingKeys);
        if ((financialsOnly && (materialized?.parsed ?? 0) > 0) || missingGroups.length === 0) {
          break;
        }
      }

      if (!debug.selectedProvider) {
        failed += 1;
        debug.finalStatus = "no_detail_provider_saved_useful_facts";
        warnings.push(`${ipo.name}: no detail provider saved useful validated facts.`);
      }
      detailDebug.push(debug);

      // Auto-link lead manager after all providers have run for this IPO
      if (!financialsOnly) {
        const lmLink = await linkLeadManagerForIPO(ipo.id);
        if (lmLink.action === "linked_existing" || lmLink.action === "created_and_linked") {
          warnings.push(`${ipo.name}: lead manager linked → ${lmLink.lmName} (${lmLink.action}, confidence=${lmLink.confidence ?? 0}%)`);
        } else if (lmLink.action === "low_confidence") {
          warnings.push(`${ipo.name}: lead manager low-confidence match (${lmLink.confidence}%) — not auto-linked`);
        } else if (lmLink.action === "error") {
          warnings.push(`${ipo.name}: lead manager link error: ${lmLink.error}`);
        }
      }
    }

    const result = emptyCleanResult({
      errors,
      failed,
      found,
      matched,
      provider: "DETAIL_CHAIN",
      saved,
      skipped,
      status: saved > 0 ? (errors.length || warnings.length ? "partial" : "success") : errors.length ? "failed" : "partial",
      success: errors.length === 0 || saved > 0,
      syncType: "detail",
      warnings,
    });
    await finishRun(runId, result, { candidates: context.ipos.length, detailDebug, financialsOnly, ipoId: ipoId ?? null, limit });
    return result;
  } catch (error) {
    console.error("runDetailSyncClean top-level error:", error);
    const result = emptyCleanResult({
      errors: [error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : "Detail sync failed."],
      failed: 1,
      provider: "DETAIL_CHAIN",
      status: "failed",
      success: false,
      syncType: "detail",
    });
    await finishRun(runId, result);
    return result;
  }
}
