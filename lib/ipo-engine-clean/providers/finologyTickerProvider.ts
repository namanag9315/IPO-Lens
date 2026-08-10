import { extractTablesAndText } from "@/lib/ipo-engine-clean/extractTablesAndText";
import type { FactCandidate } from "@/lib/ipo-engine-clean/types";

function cleanValue(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function fact(
  factKey: string,
  factValue: unknown,
  confidence: FactCandidate["confidence"] = "medium",
  displayValue?: string | null,
  sourceEvidence?: string | null,
): FactCandidate {
  return { confidence, displayValue: displayValue ?? (typeof factValue === "string" ? factValue : undefined), factKey, factValue, sourceEvidence };
}

function uniqueFacts(facts: FactCandidate[]) {
  const seen = new Set<string>();
  return facts.filter((item) => {
    const key = `${item.factKey}:${JSON.stringify(item.factValue)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function textMatch(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return cleanValue(match?.[1] ?? null) || null;
}

function tableSearchText(table: ReturnType<typeof extractTablesAndText>["tables"][number]) {
  return `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
}

function latestColumn(headers: string[]) {
  for (let index = headers.length - 1; index >= 0; index -= 1) {
    if (/mar|jun|sep|dec|20\d{2}|fy/i.test(headers[index] ?? "")) return headers[index];
  }
  return headers.at(-1) ?? null;
}

function valueForRow(table: ReturnType<typeof extractTablesAndText>["tables"][number], labelPattern: RegExp) {
  const column = latestColumn(table.headers);
  if (!column) return null;
  for (const row of table.rows) {
    const first = Object.values(row)[0] ?? "";
    if (labelPattern.test(first)) return cleanValue(row[column]);
  }
  return null;
}

function detailRowsFromText(cleanText: string) {
  const rows: Record<string, string>[] = [];
  const add = (field: string, value: string | null) => {
    if (value) rows.push({ Field: field, Value: value });
  };

  add("Price Band", textMatch(cleanText, /\bPrice Band\s+(₹?\s*[\d,.]+\s*(?:-|to)\s*₹?\s*[\d,.]+)/i));
  add("Issue Size", textMatch(cleanText, /\bIssue Size\s+([\d,.]+\s*Cr\.?)/i));
  add("Issue Type", textMatch(cleanText, /\bIssue Type\s+([A-Za-z ]+?)(?=\s+Open\b|\s+Close\b|\s+Listing Date\b|$)/i));
  add("Open Date", textMatch(cleanText, /\bOpen\s+(\d{4}-\d{2}-\d{2})/i));
  add("Close Date", textMatch(cleanText, /\bClose\s+(\d{4}-\d{2}-\d{2})/i));
  add("Listing Date", textMatch(cleanText, /\bListing Date\s+(\d{4}-\d{2}-\d{2})/i));
  add("Listing Exchange", textMatch(cleanText, /\bListing(?:\s+At|\s+Exchange)?\s+(NSE SME|BSE SME|NSE|BSE)/i));
  return rows;
}

function numericFromValue(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function upperIssuePrice(priceBand: string | null) {
  const values = priceBand?.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return values.length ? values.at(-1) ?? null : null;
}

export function parseFinologyTickerDetail(html: string, ipoName?: string) {
  const extracted = extractTablesAndText(html);
  const facts: FactCandidate[] = [];
  const warnings: string[] = [];
  const tableClassifications: Array<{ factKeys: string[]; heading: string; index: number; type: string }> = [];
  const cleanText = extracted.cleanText;

  const detailRows = detailRowsFromText(cleanText);
  const priceBand = detailRows.find((row) => row.Field === "Price Band")?.Value ?? null;
  const issueSize = detailRows.find((row) => row.Field === "Issue Size")?.Value ?? null;
  const issueType = detailRows.find((row) => row.Field === "Issue Type")?.Value ?? null;
  const openDate = detailRows.find((row) => row.Field === "Open Date")?.Value ?? null;
  const closeDate = detailRows.find((row) => row.Field === "Close Date")?.Value ?? null;
  const listingDate = detailRows.find((row) => row.Field === "Listing Date")?.Value ?? null;
  const listingExchange = detailRows.find((row) => row.Field === "Listing Exchange")?.Value ?? null;

  if (detailRows.length >= 3) facts.push(fact("ipo_details_table", detailRows, "high", `Finology IPO details block with ${detailRows.length} rows`));
  if (priceBand) facts.push(fact("price_band", priceBand, "high", priceBand, `Price Band ${priceBand}`));
  if (issueSize) facts.push(fact("issue_size", issueSize, "high", issueSize, `Issue Size ${issueSize}`));
  if (issueType) facts.push(fact("issue_type", issueType, "medium", issueType, `Issue Type ${issueType}`));
  if (openDate) facts.push(fact("open_date", openDate, "medium", openDate, `Open ${openDate}`));
  if (closeDate) facts.push(fact("close_date", closeDate, "medium", closeDate, `Close ${closeDate}`));
  if (listingDate) facts.push(fact("listing_date", listingDate, "medium", listingDate, `Listing Date ${listingDate}`));
  if (listingExchange) facts.push(fact("listing_exchange", listingExchange, "medium", listingExchange, `Listing ${listingExchange}`));
  const issuePrice = upperIssuePrice(priceBand);
  if (issuePrice !== null) facts.push(fact("issue_price", issuePrice, "high", String(issuePrice), `Price Band ${priceBand}`));

  const marketCap = textMatch(cleanText, /\bMarket Cap(?:italization)?\s+(₹?\s*[\d,.]+\s*Cr\.?)/i);
  const peRatio = textMatch(cleanText, /\b(?:P\/E|PE Ratio|P E)\s+([\d,.]+x?)/i);
  const eps = textMatch(cleanText, /\b(?:EPS|Adjusted EPS \(Rs\.\))\s+([\d,.]+)/i);
  const roe = textMatch(cleanText, /\bROE\s+([\d,.]+%?)/i);
  const roce = textMatch(cleanText, /\bROCE\s+([\d,.]+%?)/i);
  const promoterHolding = textMatch(cleanText, /\bPromoter(?:s)? Holding\s+([\d,.]+%?)/i);

  if (marketCap) facts.push(fact("market_cap", marketCap, "medium", marketCap, `Market Cap ${marketCap}`));
  if (peRatio) facts.push(fact("pe_ratio", numericFromValue(peRatio) ?? peRatio, "medium", peRatio, `P/E ${peRatio}`));
  if (eps) facts.push(fact("eps", numericFromValue(eps) ?? eps, "medium", eps, `EPS ${eps}`));
  if (roe) facts.push(fact("roe", numericFromValue(roe) ?? roe, "medium", roe, `ROE ${roe}`));
  if (roce) facts.push(fact("roce", numericFromValue(roce) ?? roce, "medium", roce, `ROCE ${roce}`));
  if (promoterHolding) facts.push(fact("promoter_holding", numericFromValue(promoterHolding) ?? promoterHolding, "medium", promoterHolding, `Promoter Holding ${promoterHolding}`));

  for (const table of extracted.tables) {
    const text = tableSearchText(table);
    const keysBefore = facts.length;
    let type = "unclassified";

    if (/profit\s*&?\s*loss|net sales|net profit|operating profit|adjusted eps|total expenditure/i.test(text)) {
      type = "financials";
      facts.push(fact("financial_table", table.rows, "high", `Finology financial table with ${table.rows.length} rows`));
      const latestEps = valueForRow(table, /adjusted eps|eps/i);
      if (latestEps) facts.push(fact("eps", numericFromValue(latestEps) ?? latestEps, "high", latestEps, `Adjusted EPS ${latestEps}`));
    } else if (/balance sheet|borrowings|share capital|reserves|assets|liabilities/i.test(text)) {
      type = "balance_sheet";
    } else if (/cash flows?|profit from operations|operating activities/i.test(text)) {
      type = "cash_flows";
    }

    const detected = facts.slice(keysBefore).map((item) => item.factKey);
    tableClassifications.push({ factKeys: detected, heading: table.nearbyHeading, index: table.index, type });
    if (type === "unclassified") warnings.push(`Unclassified Finology table ${table.index}${table.nearbyHeading ? ` near ${table.nearbyHeading}` : ""}.`);
  }

  const dedupedFacts = uniqueFacts(facts);
  const factKeysDetected = Array.from(new Set(dedupedFacts.map((item) => item.factKey)));
  const expectedKeys = ["ipo_details_table", "financial_table", "price_band", "issue_size", "open_date", "close_date", "listing_date"];
  const missingExpectedKeys = expectedKeys.filter((key) => !factKeysDetected.includes(key));

  warnings.push(...missingExpectedKeys.map((key) => `Missing expected Finology detail fact: ${key}.`));
  if (!factKeysDetected.includes("company_description")) warnings.push("Finology detail page did not expose a company description section.");
  if (!factKeysDetected.includes("registrar_name")) warnings.push("Finology detail page did not expose registrar details.");
  if (!factKeysDetected.includes("lead_manager_name")) warnings.push("Finology detail page did not expose lead manager details.");
  if (dedupedFacts.length === 0) warnings.push("No valid Finology detail facts found.");

  return {
    debug: {
      ...extracted.debug,
      factKeysDetected,
      headings: extracted.headings.slice(0, 20),
      headingsFound: extracted.headings.length,
      ipoName: ipoName ?? null,
      missingExpectedKeys,
      tableClassifications,
      tablesFound: extracted.tables.length,
    },
    facts: dedupedFacts,
    warnings,
  };
}
