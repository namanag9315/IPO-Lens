import * as cheerio from "cheerio";
import { extractTablesAndText } from "@/lib/ipo-engine-clean/extractTablesAndText";
import type { FactCandidate } from "@/lib/ipo-engine-clean/types";

function cleanValue(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/(\d{4})T\b/g, "$1")
    .trim();
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number.parseFloat(value.replace(/₹|rs\.?|inr|cr|crore|,|\s/gi, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function looksLikeMarketParticipant(value: string) {
  return (
    /[a-z]/i.test(value) &&
    !/shares|agg\.|aggregating|%|₹/.test(value) &&
    /(capital|advisors|merchant|securities|financial|broking|corporate|markets|stock|rta|registrar|kfin|bigshare|mufg|cameo|skyline|maashitla|purva|private|pvt|limited|ltd)/i.test(value)
  );
}

export function deriveIPOPlatformSiblingUrls(baseUrl: string) {
  if (!baseUrl) return "no_source_url_for_ipoplatform";
  const match = baseUrl.match(/^https?:\/\/(?:www\.)?ipoplatform\.com\/ipo\/([a-zA-Z0-9-]+)\/(\d+)\/?$/i);
  if (!match) return "no_source_url_for_ipoplatform";

  const slug = match[1];
  const id = match[2];

  return {
    base: `https://www.ipoplatform.com/ipo/${slug}/${id}`,
    financialReport: `https://www.ipoplatform.com/ipo/financial-report/${slug}/${id}`,
    peerComparison: `https://www.ipoplatform.com/ipo/peer-comparison/${slug}/${id}`,
    subscription: `https://www.ipoplatform.com/ipo/subscription/${slug}/${id}`,
    review: `https://www.ipoplatform.com/ipo/review/${slug}/${id}`,
  };
}


function promoteFirstRowToHeaders<T extends { headers: string[]; rows: Record<string, string>[] }>(table: T): T {
  if (table.rows.length === 0) return table;
  const firstRow = table.rows[0];
  const firstValues = Object.values(firstRow);

  const isGeneric = table.headers.every((h) => h.startsWith("Column "));
  if (!isGeneric) return table;

  const newHeaders = firstValues.map((val, idx) => val.trim() || `Column ${idx + 1}`);
  const newRows: Record<string, string>[] = [];
  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const newRow: Record<string, string> = {};
    table.headers.forEach((oldHeader, idx) => {
      const newHeader = newHeaders[idx] ?? oldHeader;
      newRow[newHeader] = row[oldHeader] ?? "";
    });
    newRows.push(newRow);
  }
  return {
    ...table,
    headers: newHeaders,
    rows: newRows,
  };
}

function fact(
  factKey: string,
  factValue: unknown,
  confidence: FactCandidate["confidence"] = "medium",
  displayValue?: string | null,
  sourceEvidence?: string | null,
): FactCandidate {
  return {
    confidence,
    displayValue: displayValue ?? (typeof factValue === "string" ? factValue : undefined),
    factKey,
    factValue,
    sourceEvidence,
  };
}

function extractSectionByHeading($: cheerio.CheerioAPI, headingTexts: string[]): string | null {
  let matchedElem: any = null;

  $("h1, h2, h3, h4, h5, h6, b, strong, div, p").each((_: number, el: any) => {
    const text = $(el).text().trim().toLowerCase();
    if (headingTexts.some((h) => text === h || text.startsWith(h) || (text.length < 100 && text.includes(h)))) {
      matchedElem = $(el);
      return false;
    }
  });

  if (!matchedElem) return null;

  let current = matchedElem.next();
  if (!current.length) {
    current = matchedElem.parent().next();
  }

  const paragraphs: string[] = [];
  let depth = 0;
  while (current.length && depth < 25) {
    const tagName = current[0].tagName?.toLowerCase();
    const text = current.text().trim();

    if (/^(h1|h2|h3|h4|h5|h6)$/i.test(tagName)) break;
    if (current.find("h1, h2, h3, h4, h5, h6").length > 0) break;
    if ((tagName === "b" || tagName === "strong") && text.length < 50) break;

    if (text) {
      paragraphs.push(text);
    }

    current = current.next();
    depth++;
  }

  return paragraphs.join("\n\n").trim() || null;
}

function parseTextLabelValues(bodyText: string) {
  const map: Record<string, string> = {};
  const regexes = [
    { key: "price_band", patterns: [/\bprice band\s*:\s*([^:\n\r#]+)/i, /price range\s*:\s*([^:\n\r#]+)/i] },
    { key: "issue_price", patterns: [/\bissue price\s*:\s*([^:\n\r#]+)/i, /price\s*:\s*([^:\n\r#]+)/i] },
    { key: "issue_size", patterns: [/\bissue size\s*:\s*([^:\n\r#]+)/i, /total issue size\s*:\s*([^:\n\r#]+)/i] },
    { key: "fresh_issue", patterns: [/\bfresh issue\s*:\s*([^:\n\r#]+)/i] },
    { key: "offer_for_sale", patterns: [/\boffer for sale\s*:\s*([^:\n\r#]+)/i, /\bofs\b\s*:\s*([^:\n\r#]+)/i] },
    { key: "lot_size", patterns: [/\blot size\s*:\s*([^:\n\r#]+)/i, /market lot\s*:\s*([^:\n\r#]+)/i] },
    { key: "face_value", patterns: [/\bface value\s*:\s*([^:\n\r#]+)/i] },
    { key: "issue_type", patterns: [/\bissue type\s*:\s*([^:\n\r#]+)/i] },
    { key: "sale_type", patterns: [/\bsale type\s*:\s*([^:\n\r#]+)/i] },
    { key: "listing_exchange", patterns: [/\blisting exchange\s*:\s*([^:\n\r#]+)/i, /listing at\s*:\s*([^:\n\r#]+)/i] },
    { key: "open_date", patterns: [/\bopen date\s*:\s*([^:\n\r#]+)/i, /opening date\s*:\s*([^:\n\r#]+)/i, /ipo open\s*:\s*([^:\n\r#]+)/i] },
    { key: "close_date", patterns: [/\bclose date\s*:\s*([^:\n\r#]+)/i, /closing date\s*:\s*([^:\n\r#]+)/i, /ipo close\s*:\s*([^:\n\r#]+)/i] },
    { key: "allotment_date", patterns: [/\ballotment date\s*:\s*([^:\n\r#]+)/i, /basis of allotment\s*:\s*([^:\n\r#]+)/i] },
    { key: "refund_date", patterns: [/\brefund date\s*:\s*([^:\n\r#]+)/i, /initiation of refunds\s*:\s*([^:\n\r#]+)/i] },
    { key: "listing_date", patterns: [/\blisting date\s*:\s*([^:\n\r#]+)/i] },
    { key: "lead_manager_name", patterns: [/\blead manager\s*:\s*([^:\n\r#]+)/i, /merchant banker\s*:\s*([^:\n\r#]+)/i] },
    { key: "registrar_name", patterns: [/\bregistrar\s*:\s*([^:\n\r#]+)/i] },
    { key: "market_maker_name", patterns: [/\bmarket maker\s*:\s*([^:\n\r#]+)/i] },
  ];

  for (const item of regexes) {
    for (const pattern of item.patterns) {
      const match = bodyText.match(pattern);
      if (match?.[1]?.trim()) {
        map[item.key] = cleanValue(match[1].trim());
        break;
      }
    }
  }
  return map;
}

export function parseIPOPlatformBasePage(html: string, ipoName: string) {
  const $ = cheerio.load(html);
  const extracted = extractTablesAndText(html);
  const facts: FactCandidate[] = [];
  const warnings: string[] = [];

  const textLabelValues = parseTextLabelValues(extracted.cleanText);

  const allRows: Record<string, string>[] = [];
  for (const table of extracted.tables) {
    allRows.push(...table.rows);
  }

  const getRowValue = (patterns: RegExp[]) => {
    for (const row of allRows) {
      const values = Object.values(row).filter(Boolean);
      if (values.length < 2) continue;
      const key = values[0].toLowerCase();
      if (patterns.some((pattern) => pattern.test(key))) return cleanValue(values.slice(1).join(" "));
    }
    return null;
  };

  const faceValue = getRowValue([/face value/i]) ?? textLabelValues.face_value;
  const priceBand = getRowValue([/price band/i]) ?? textLabelValues.price_band;
  const issuePrice = getRowValue([/issue price/i]) ?? textLabelValues.issue_price;
  const lotSize = getRowValue([/lot size/i, /market lot/i]) ?? textLabelValues.lot_size;
  const saleType = getRowValue([/sale type/i]) ?? textLabelValues.sale_type;
  const issueType = getRowValue([/issue type/i]) ?? textLabelValues.issue_type;
  const listingAt = getRowValue([/listing at/i, /exchange/i, /listed on/i, /listing exchange/i]) ?? textLabelValues.listing_exchange;
  const totalIssueSize = getRowValue([/total issue size/i, /issue size/i, /total issue/i]) ?? textLabelValues.issue_size;
  const freshIssue = getRowValue([/fresh issue/i]) ?? textLabelValues.fresh_issue;
  const offerForSale = getRowValue([/offer for sale/i, /\bofs\b/i]) ?? textLabelValues.offer_for_sale;
  const openDate = getRowValue([/open date/i, /ipo open/i]) ?? textLabelValues.open_date;
  const closeDate = getRowValue([/close date/i, /ipo close/i]) ?? textLabelValues.close_date;
  const allotmentDate = getRowValue([/allotment date/i, /basis of allotment/i]) ?? textLabelValues.allotment_date;
  const refundDate = getRowValue([/refund date/i, /initiation of refunds/i]) ?? textLabelValues.refund_date;
  const listingDate = getRowValue([/listing date/i]) ?? textLabelValues.listing_date;
  const leadManager = getRowValue([/lead manager/i, /merchant banker/i]) ?? textLabelValues.lead_manager_name;
  const registrar = getRowValue([/registrar/i]) ?? textLabelValues.registrar_name;
  const marketMaker = getRowValue([/market maker/i]) ?? textLabelValues.market_maker_name;

  if (faceValue) facts.push(fact("face_value", faceValue, "high"));
  if (priceBand) {
    facts.push(fact("price_band", priceBand, "high"));
    const values = priceBand.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    if (values[0] !== undefined) facts.push(fact("price_band_low", values[0], "high"));
    if (values[1] !== undefined) facts.push(fact("price_band_high", values[1], "high"));
  }
  if (issuePrice) facts.push(fact("issue_price", parseNumber(issuePrice) ?? issuePrice, "high"));
  if (lotSize) facts.push(fact("lot_size", lotSize, "high"));
  if (saleType) facts.push(fact("sale_type", saleType, "medium"));
  if (issueType) facts.push(fact("issue_type", issueType, "medium"));
  if (listingAt) facts.push(fact("listing_exchange", listingAt, "medium"));
  if (totalIssueSize) {
    facts.push(fact("total_issue_size", totalIssueSize, "high"));
    facts.push(fact("issue_size", totalIssueSize, "high"));
  }
  if (freshIssue) facts.push(fact("fresh_issue", freshIssue, "high"));
  if (offerForSale) facts.push(fact("offer_for_sale", offerForSale, "high"));
  if (openDate) facts.push(fact("open_date", openDate, "medium"));
  if (closeDate) facts.push(fact("close_date", closeDate, "medium"));
  if (allotmentDate) facts.push(fact("allotment_date", allotmentDate, "medium"));
  if (refundDate) facts.push(fact("refund_date", refundDate, "medium"));
  if (listingDate) facts.push(fact("listing_date", listingDate, "medium"));

  if (leadManager && looksLikeMarketParticipant(leadManager)) {
    facts.push(fact("lead_manager_name", leadManager, "high"));
  }
  if (registrar && looksLikeMarketParticipant(registrar)) {
    facts.push(fact("registrar_name", registrar, "high"));
  }
  if (marketMaker && looksLikeMarketParticipant(marketMaker)) {
    facts.push(fact("market_maker_name", marketMaker, "high"));
  }

  const companyDesc = extractSectionByHeading($, ["about the company", "company overview", "company profile", "about company", "business description", "company details"]);
  if (companyDesc && companyDesc.length >= 80) {
    facts.push(fact("company_description", companyDesc, "high"));
  }

  const objects = extractSectionByHeading($, ["object of issue", "object of the issue", "objects of issue", "objects of the issue", "objectives of the issue", "objectives of issue", "objects of the ipo", "purpose of the issue"]);
  if (objects) {
    facts.push(fact("objects_of_issue", objects, "high"));
  }

  const products = extractSectionByHeading($, ["products and services", "products & services", "product portfolio", "business model", "our products", "major products"]);
  if (products) {
    facts.push(fact("products_services", products, "high"));
  }

  let sector = getRowValue([/^sector$/i, /^industry$/i]) ?? textLabelValues.sector;
  if (!sector) {
    const sectorMatch = extracted.cleanText.match(/(?:sector|industry)\s*:\s*([^:\n]+)/i);
    if (sectorMatch?.[1]?.trim()) sector = cleanValue(sectorMatch[1].trim());
  }
  if (sector && sector.length < 100) {
    facts.push(fact("sector", sector, "medium"));
  }

  const detailTableRows: Array<{ label: string; value: string }> = [];
  const addDetailRow = (label: string, value: string | null | undefined) => {
    if (value) detailTableRows.push({ label, value });
  };
  addDetailRow("Price Band", priceBand);
  addDetailRow("Lot Size", lotSize);
  addDetailRow("Issue Size", totalIssueSize);
  addDetailRow("Open Date", openDate);
  addDetailRow("Close Date", closeDate);
  addDetailRow("Listing Date", listingDate);
  addDetailRow("Exchange", listingAt);
  addDetailRow("Registrar", registrar);

  if (detailTableRows.length >= 2) {
    facts.push(fact("ipo_details_table", detailTableRows, "high"));
  }

  // IPOPlatform also exposes a compact financial highlights table on many base
  // pages. Treat it as a valid fallback when the dedicated sibling page is
  // unavailable or blocked.
  const financialHighlights = parseIPOPlatformFinancialReportPage(html, ipoName);
  for (const financialFact of financialHighlights.facts) {
    if (!facts.some((item) => item.factKey === financialFact.factKey)) facts.push(financialFact);
  }
  warnings.push(...financialHighlights.warnings.map((warning) => `Financial highlights: ${warning}`));

  return { facts, warnings, debug: { tables: extracted.tables.length, headings: extracted.headings.length } };
}

function findLatestColumn(headers: string[]) {
  for (let i = headers.length - 1; i >= 1; i--) {
    const h = headers[i].toLowerCase();
    if (/20\d{2}|fy|mar|jun|sep|dec/i.test(h)) return headers[i];
  }
  return headers[headers.length - 1] ?? null;
}

function findPreviousColumn(headers: string[], latestHeader: string) {
  const latestIndex = headers.indexOf(latestHeader);
  if (latestIndex > 1) {
    return headers[latestIndex - 1];
  }
  return null;
}

export function parseIPOPlatformFinancialReportPage(html: string, ipoName: string) {
  const $ = cheerio.load(html);
  const extracted = extractTablesAndText(html);
  const facts: FactCandidate[] = [];
  const warnings: string[] = [];

  let finTable = extracted.tables.find((table) => {
    const text = `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
    const hits = [/revenue/i, /pat/i, /profit after tax/i, /assets/i, /net worth/i, /borrowings/i, /reserves/i, /ebitda/i].filter((p) => p.test(text)).length;
    return hits >= 2;
  });

  if (finTable) {
    const promotedTable = promoteFirstRowToHeaders(finTable);
    facts.push(fact("financial_table", promotedTable.rows, "high"));

    const latestCol = findLatestColumn(promotedTable.headers);
    if (latestCol) {
      const getVal = (patterns: RegExp[]) => {
        const row = promotedTable.rows.find((r) => {
          const first = Object.values(r)[0] ?? "";
          return patterns.some((p) => p.test(first.toLowerCase()));
        });
        return row ? parseNumber(row[latestCol]) : null;
      };

      const revenueLatest = getVal([/revenue/i, /sales/i, /total income/i, /income/i]);
      const patLatest = getVal([/pat/i, /profit after tax/i, /net profit/i, /profit\/loss after tax/i]);
      const ebitdaLatest = getVal([/ebitda/i]);
      const netWorthLatest = getVal([/net worth/i]);
      const assetsLatest = getVal([/total assets/i, /assets/i]);
      const reservesLatest = getVal([/reserves/i, /reserve & surplus/i]);
      const borrowingLatest = getVal([/borrowings/i, /borrowing/i, /total borrowings/i, /debt/i]);

      if (revenueLatest !== null) facts.push(fact("revenue_latest", revenueLatest, "high"));
      if (patLatest !== null) facts.push(fact("pat_latest", patLatest, "high"));
      if (ebitdaLatest !== null) facts.push(fact("ebitda_latest", ebitdaLatest, "high"));
      if (netWorthLatest !== null) facts.push(fact("net_worth_latest", netWorthLatest, "high"));
      if (assetsLatest !== null) facts.push(fact("assets_latest", assetsLatest, "high"));
      if (reservesLatest !== null) facts.push(fact("reserves_latest", reservesLatest, "high"));
      if (borrowingLatest !== null) facts.push(fact("borrowing_latest", borrowingLatest, "high"));

      const prevCol = findPreviousColumn(promotedTable.headers, latestCol);
      if (prevCol) {
        const getPrevVal = (patterns: RegExp[]) => {
          const row = promotedTable.rows.find((r) => {
            const first = Object.values(r)[0] ?? "";
            return patterns.some((p) => p.test(first.toLowerCase()));
          });
          return row ? parseNumber(row[prevCol]) : null;
        };

        const revenuePrev = getPrevVal([/revenue/i, /sales/i, /total income/i, /income/i]);
        const patPrev = getPrevVal([/pat/i, /profit after tax/i, /net profit/i, /profit\/loss after tax/i]);

        if (revenueLatest !== null && revenuePrev !== null && revenuePrev > 0) {
          const revGrowth = ((revenueLatest - revenuePrev) / revenuePrev) * 100;
          facts.push(fact("revenue_growth", Number(revGrowth.toFixed(2)), "high"));
        }
        if (patLatest !== null && patPrev !== null && patPrev > 0) {
          const patGrowth = ((patLatest - patPrev) / patPrev) * 100;
          facts.push(fact("pat_growth", Number(patGrowth.toFixed(2)), "high"));
        }
      }

      if (revenueLatest && patLatest) {
        const patMargin = (patLatest / revenueLatest) * 100;
        facts.push(fact("pat_margin_latest", Number(patMargin.toFixed(2)), "high"));
      }
    }
  } else {
    const getRegexVal = (pattern: RegExp) => {
      const match = extracted.cleanText.match(pattern);
      return match?.[1] ? parseNumber(match[1]) : null;
    };
    const revenueLatest = getRegexVal(/revenue\s*:\s*₹?\s*([\d,.]+)/i) ?? getRegexVal(/total income\s*:\s*₹?\s*([\d,.]+)/i);
    const patLatest = getRegexVal(/pat\s*:\s*₹?\s*([\d,.]+)/i) ?? getRegexVal(/profit after tax\s*:\s*₹?\s*([\d,.]+)/i);
    const ebitdaLatest = getRegexVal(/ebitda\s*:\s*₹?\s*([\d,.]+)/i);
    const netWorthLatest = getRegexVal(/net worth\s*:\s*₹?\s*([\d,.]+)/i);
    const assetsLatest = getRegexVal(/assets\s*:\s*₹?\s*([\d,.]+)/i);
    const reservesLatest = getRegexVal(/reserves\s*:\s*₹?\s*([\d,.]+)/i);
    const borrowingLatest = getRegexVal(/borrowing\s*:\s*₹?\s*([\d,.]+)/i) ?? getRegexVal(/debt\s*:\s*₹?\s*([\d,.]+)/i);

    if (revenueLatest !== null) facts.push(fact("revenue_latest", revenueLatest, "medium"));
    if (patLatest !== null) facts.push(fact("pat_latest", patLatest, "medium"));
    if (ebitdaLatest !== null) facts.push(fact("ebitda_latest", ebitdaLatest, "medium"));
    if (netWorthLatest !== null) facts.push(fact("net_worth_latest", netWorthLatest, "medium"));
    if (assetsLatest !== null) facts.push(fact("assets_latest", assetsLatest, "medium"));
    if (reservesLatest !== null) facts.push(fact("reserves_latest", reservesLatest, "medium"));
    if (borrowingLatest !== null) facts.push(fact("borrowing_latest", borrowingLatest, "medium"));

    if (revenueLatest && patLatest) {
      const patMargin = (patLatest / revenueLatest) * 100;
      facts.push(fact("pat_margin_latest", Number(patMargin.toFixed(2)), "medium"));
    }
  }

  return { facts, warnings };
}

export function parseIPOPlatformPeerComparisonPage(html: string, ipoName: string) {
  const $ = cheerio.load(html);
  const extracted = extractTablesAndText(html);
  const facts: FactCandidate[] = [];
  const warnings: string[] = [];

  let peerTable = extracted.tables.find((table) => {
    const text = `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
    return /peer|comparison|company|p\/e|pe|eps|ronw|nav/i.test(text) && table.rows.length >= 1;
  });

  if (peerTable) {
    const promotedTable = promoteFirstRowToHeaders(peerTable);
    facts.push(fact("peer_valuation_table", promotedTable.rows, "high"));

    const normalizedIPO = ipoName.toLowerCase().replace(/[^a-z0-9]/g, "");
    let ipoPE: number | null = null;
    let ipoEPS: number | null = null;
    let ipoROE: number | null = null;
    const peerPEs: number[] = [];

    const nameKey = promotedTable.headers.find(h => /company|peer|name|particular/i.test(h)) ?? promotedTable.headers[0];
    const peKey = promotedTable.headers.find(h => /p\/?e|pe ratio/i.test(h));
    const epsKey = promotedTable.headers.find(h => /eps/i.test(h));
    const roceKey = promotedTable.headers.find(h => /roce/i);
    const roeKey = promotedTable.headers.find(h => /roe|ronw/i.test(h)) ?? roceKey;

    for (let rowIndex = 0; rowIndex < promotedTable.rows.length; rowIndex++) {
      const row = promotedTable.rows[rowIndex];
      const name = String(row[nameKey] ?? Object.values(row)[0] ?? "").trim();
      if (!name) continue;

      const peVal = peKey ? parseNumber(row[peKey]) : null;
      const epsVal = epsKey ? parseNumber(row[epsKey]) : null;
      const roeVal = roeKey ? parseNumber(row[roeKey]) : null;

      const normName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isIPO = rowIndex === 0 || normName.includes(normalizedIPO) || normalizedIPO.includes(normName);

      if (isIPO) {
        ipoPE = peVal;
        ipoEPS = epsVal;
        ipoROE = roeVal;
      } else if (peVal !== null) {
        peerPEs.push(peVal);
      }
    }

    if (ipoPE !== null) facts.push(fact("pe_ratio", ipoPE, "high"));
    if (ipoPE !== null) facts.push(fact("ipo_pe", ipoPE, "high"));
    if (ipoEPS !== null) facts.push(fact("eps", ipoEPS, "high"));
    if (ipoEPS !== null) facts.push(fact("ipo_eps", ipoEPS, "high"));
    if (ipoROE !== null) {
      facts.push(fact("roe_latest", ipoROE, "high"));
      facts.push(fact("ronw_latest", ipoROE, "high"));
    }

    if (peerPEs.length > 0) {
      const sum = peerPEs.reduce((a, b) => a + b, 0);
      const avg = sum / peerPEs.length;
      const max = Math.max(...peerPEs);

      facts.push(fact("peer_average_pe", Number(avg.toFixed(2)), "high"));
      facts.push(fact("peer_high_pe", max, "high"));
      // Save sectorPEAvg as a named fact for view model consumption
      facts.push(fact("sectorPEAvg", Number(avg.toFixed(2)), "high"));
    }
  }

  return { facts, warnings };
}

export function parseIPOPlatformSubscriptionPage(html: string, ipoName: string) {
  const $ = cheerio.load(html);
  const extracted = extractTablesAndText(html);
  const facts: FactCandidate[] = [];
  const warnings: string[] = [];

  let subTable = extracted.tables.find((table) => {
    const text = `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
    return /subscription|subscribed|qib|retail|nii|times/i.test(text);
  });

  if (subTable) {
    const promotedTable = promoteFirstRowToHeaders(subTable);
    facts.push(fact("subscription_table", promotedTable.rows, "medium"));

    const catKey = promotedTable.headers.find(h => /category|investor/i.test(h)) ?? promotedTable.headers[0];
    const timesKey = promotedTable.headers.find(h => /times|subscription/i.test(h));

    const timesFromRow = (row: Record<string, string> | undefined) => {
      if (!row) return null;
      if (timesKey) return parseNumber(row[timesKey]);
      for (const [k, v] of Object.entries(row)) {
        if (/times|subscription|x/i.test(k) && parseNumber(v) !== null) {
          return parseNumber(v);
        }
      }
      return parseNumber(Object.values(row).at(-1));
    };

    const rowFor = (pattern: RegExp) =>
      promotedTable.rows.find((row) => pattern.test(String(row[catKey] ?? Object.values(row)[0] ?? "").toLowerCase()));

    const qib = timesFromRow(rowFor(/qib|qualified/i));
    const nii = timesFromRow(rowFor(/nii|non-institutional|hni/i));
    const retail = timesFromRow(rowFor(/retail|individual/i));
    const total = timesFromRow(rowFor(/total/i));

    if (qib !== null) facts.push(fact("qib_subscription", qib, "medium"));
    if (nii !== null) facts.push(fact("nii_subscription", nii, "medium"));
    if (retail !== null) facts.push(fact("retail_subscription", retail, "medium"));
    if (total !== null) facts.push(fact("total_subscription", total, "medium"));
  }

  return { facts, warnings };
}

function extractStructuredFactsFromReview(reviewText: string, ipoName: string) {
  const facts: FactCandidate[] = [];
  let cleanedText = reviewText;

  // 1. Sector
  const sectorMatch = cleanedText.match(/(?:sector\s*update|sector|industry)\s*:\s*([^\n\r.]+)/i);
  if (sectorMatch) {
    const rawSec = sectorMatch[1].trim();
    const cleanSec = rawSec
      .replace(/SME IPO so far/gi, "")
      .replace(/IPO so far/gi, "")
      .replace(/Sector Update/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[\s,.:;/-]+|[\s,.:;/-]+$/g, "");
    if (cleanSec.length > 2 && cleanSec.length < 100) {
      facts.push({
        factKey: "sector",
        factValue: cleanSec,
        confidence: "medium",
        displayValue: cleanSec,
        sourceEvidence: sectorMatch[0],
      });
      cleanedText = cleanedText.replace(sectorMatch[0], "");
    }
  }

  // 2. Products Services
  const prodMatch = cleanedText.match(/(?:products and services|products & services|product portfolio|our products|business model)\s*:\s*([^\n\r.]+)/i);
  if (prodMatch) {
    const cleanProd = prodMatch[1].trim();
    if (cleanProd.length > 5) {
      facts.push({
        factKey: "products_services",
        factValue: cleanProd,
        confidence: "medium",
        displayValue: cleanProd,
        sourceEvidence: prodMatch[0],
      });
      cleanedText = cleanedText.replace(prodMatch[0], "");
    }
  }

  // 3. Revenue Growth
  const revGrowthMatch = cleanedText.match(/revenue\s*(?:growth|increase)?\s*:\s*(-?\d+(?:\.\d+)?\s*%)/i) ||
                         cleanedText.match(/revenue\s+[^()\n]*\(\+?(-?[\d.]+)%\)/i);
  if (revGrowthMatch) {
    const val = Number.parseFloat(revGrowthMatch[1]);
    if (Number.isFinite(val)) {
      facts.push({
        factKey: "revenue_growth",
        factValue: val,
        confidence: "medium",
        displayValue: `${val}%`,
        sourceEvidence: revGrowthMatch[0],
      });
    }
  }

  // 4. PAT Growth
  const patGrowthMatch = cleanedText.match(/\bpat\s*(?:growth|increase)?\s*:\s*(-?\d+(?:\.\d+)?\s*%)/i) ||
                         cleanedText.match(/pat\s+[^()\n]*\(\+?(-?[\d.]+)%\)/i);
  if (patGrowthMatch) {
    const val = Number.parseFloat(patGrowthMatch[1]);
    if (Number.isFinite(val)) {
      facts.push({
        factKey: "pat_growth",
        factValue: val,
        confidence: "medium",
        displayValue: `${val}%`,
        sourceEvidence: patGrowthMatch[0],
      });
    }
  }

  // 5. IPO PE
  const peMatch = cleanedText.match(/\b(?:ipo p\/e|ipo pe|pe ratio|p\/e ratio)\s*:\s*(\d+(?:\.\d+)?)/i);
  if (peMatch) {
    const val = Number.parseFloat(peMatch[1]);
    if (Number.isFinite(val)) {
      facts.push({
        factKey: "pe_ratio",
        factValue: val,
        confidence: "medium",
        displayValue: `${val}x`,
        sourceEvidence: peMatch[0],
      });
      facts.push({
        factKey: "ipo_pe",
        factValue: val,
        confidence: "medium",
        displayValue: `${val}x`,
        sourceEvidence: peMatch[0],
      });
    }
  }

  // 6. Sector Average PE
  const sectorPEMatch = cleanedText.match(/\b(?:sector average p\/e|sector average pe|industry p\/e|industry pe)\s*:\s*(\d+(?:\.\d+)?)/i);
  if (sectorPEMatch) {
    const val = Number.parseFloat(sectorPEMatch[1]);
    if (Number.isFinite(val)) {
      facts.push({
        factKey: "peer_average_pe",
        factValue: val,
        confidence: "medium",
        displayValue: `${val}x`,
        sourceEvidence: sectorPEMatch[0],
      });
    }
  }

  return { facts, cleanedText };
}

export function parseIPOPlatformReviewPage(html: string, ipoName: string) {
  const $ = cheerio.load(html);
  const extracted = extractTablesAndText(html);
  const facts: FactCandidate[] = [];
  const warnings: string[] = [];

  const reviewHeading = $("h1, h2, h3, h4, h5, h6").filter((_: number, el: any) => /review|verdict|recommendation|summary/i.test($(el).text())).first();
  let reviewText = "";
  if (reviewHeading.length) {
    let current = reviewHeading.next();
    const parts: string[] = [];
    while (current.length && !/^(h1|h2|h3|h4|h5|h6)$/i.test(current[0].tagName)) {
      const txt = current.text().trim();
      if (txt) parts.push(txt);
      current = current.next();
    }
    reviewText = parts.join("\n\n").trim();
  }

  if (!reviewText) {
    reviewText = extractSectionByHeading($, ["review", "detailed review", "ipo review", "verdict", "recommendation"]) ?? "";
  }

  if (!reviewText && extracted.cleanText.length > 500) {
    reviewText = extracted.cleanText.slice(0, 1500);
  }

  if (reviewText) {
    const structured = extractStructuredFactsFromReview(reviewText, ipoName);
    facts.push(...structured.facts);

    let finalReviewText = structured.cleanedText
      .replace(/\s+/g, " ")
      .trim();

    if (finalReviewText.length > 1200) {
      finalReviewText = finalReviewText.slice(0, 1200) + "...";
    }

    if (finalReviewText.length > 50) {
      facts.push(fact("ipo_review_summary", finalReviewText, "medium"));
    }
  }

  const strengthsText = extractSectionByHeading($, ["strength", "pros", "key strengths", "positive"]);
  if (strengthsText) {
    const strengths = strengthsText.split(/\n+/).map(s => s.replace(/^[•\-\*\d\.\s]+/g, "").trim()).filter(s => s.length > 10);
    if (strengths.length > 0) {
      facts.push(fact("strengths", strengths, "medium"));
    }
  }

  const risksText = extractSectionByHeading($, ["risk", "cons", "key risks", "negative", "risk factors"]);
  if (risksText) {
    const risks = risksText.split(/\n+/).map(r => r.replace(/^[•\-\*\d\.\s]+/g, "").trim()).filter(r => r.length > 10);
    if (risks.length > 0) {
      facts.push(fact("risks", risks, "medium"));
    }
  }

  return { facts, warnings };
}

export function parseIPOPlatformDetail({
  baseHtml,
  siblingHtmls,
  ipoName,
  baseUrl,
}: {
  baseHtml: string;
  siblingHtmls?: {
    financialReport?: string | null;
    peerComparison?: string | null;
    subscription?: string | null;
    review?: string | null;
  } | null;
  ipoName: string;
  baseUrl: string;
}) {
  const mergedFactsMap = new Map<string, FactCandidate>();
  const warnings: string[] = [];
  const pagesParsed: string[] = [];
  let tablesFound = 0;

  pagesParsed.push("base");
  const baseResult = parseIPOPlatformBasePage(baseHtml, ipoName);
  warnings.push(...baseResult.warnings.map(w => `Base page: ${w}`));
  tablesFound += baseResult.debug.tables;
  baseResult.facts.forEach(f => mergedFactsMap.set(f.factKey, f));

  if (siblingHtmls?.financialReport) {
    pagesParsed.push("financial-report");
    const finResult = parseIPOPlatformFinancialReportPage(siblingHtmls.financialReport, ipoName);
    warnings.push(...finResult.warnings.map(w => `Financial report: ${w}`));
    finResult.facts.forEach(f => {
      const existing = mergedFactsMap.get(f.factKey);
      if (!existing || confidenceWeight(f.confidence) > confidenceWeight(existing.confidence)) {
        mergedFactsMap.set(f.factKey, f);
      }
    });
  }

  if (siblingHtmls?.peerComparison) {
    pagesParsed.push("peer-comparison");
    const peerResult = parseIPOPlatformPeerComparisonPage(siblingHtmls.peerComparison, ipoName);
    warnings.push(...peerResult.warnings.map(w => `Peer comparison: ${w}`));
    peerResult.facts.forEach(f => {
      const existing = mergedFactsMap.get(f.factKey);
      if (!existing || confidenceWeight(f.confidence) > confidenceWeight(existing.confidence)) {
        mergedFactsMap.set(f.factKey, f);
      }
    });
  }

  if (siblingHtmls?.subscription) {
    pagesParsed.push("subscription");
    const subResult = parseIPOPlatformSubscriptionPage(siblingHtmls.subscription, ipoName);
    warnings.push(...subResult.warnings.map(w => `Subscription: ${w}`));
    subResult.facts.forEach(f => {
      const existing = mergedFactsMap.get(f.factKey);
      if (!existing || confidenceWeight(f.confidence) > confidenceWeight(existing.confidence)) {
        mergedFactsMap.set(f.factKey, f);
      }
    });
  }

  if (siblingHtmls?.review) {
    pagesParsed.push("review");
    const reviewResult = parseIPOPlatformReviewPage(siblingHtmls.review, ipoName);
    warnings.push(...reviewResult.warnings.map(w => `Review: ${w}`));
    reviewResult.facts.forEach(f => {
      const existing = mergedFactsMap.get(f.factKey);
      if (!existing || confidenceWeight(f.confidence) > confidenceWeight(existing.confidence)) {
        mergedFactsMap.set(f.factKey, f);
      }
    });
  }

  const facts = Array.from(mergedFactsMap.values());
  const factKeysDetected = facts.map(f => f.factKey);
  const expectedKeys = ["company_description", "financial_table", "peer_valuation_table", "subscription_table", "objects_of_issue"];
  const missingExpectedKeys = expectedKeys.filter(k => !factKeysDetected.includes(k));

  return {
    facts,
    warnings,
    debug: {
      pagesParsed,
      sectionsFound: factKeysDetected,
      tablesFound,
      factKeysDetected,
      missingExpectedKeys,
      siblingUrls: deriveIPOPlatformSiblingUrls(baseUrl),
    },
  };
}

function confidenceWeight(conf: FactCandidate["confidence"]): number {
  if (conf === "high") return 3;
  if (conf === "medium") return 2;
  return 1;
}
