import * as cheerio from "cheerio";
import { extractTablesAndText } from "@/lib/ipo-engine-clean/extractTablesAndText";
import type { CleanSourceRecord, FactCandidate } from "@/lib/ipo-engine-clean/types";

function cellText($: cheerio.CheerioAPI, element: Parameters<cheerio.CheerioAPI>[0]) {
  return $(element).text().replace(/\s+/g, " ").trim();
}

export function parseIssueSizeCr(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (value > 100000) return null;
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;

  const cleanStr = value.trim();

  // 1. Extract ₹XX Cr pattern (e.g. ₹70.38 Cr, ₹70 Crores, up to ₹70 Cr, etc.)
  const croreMatch = cleanStr.match(/(?:₹|rs\.?|inr)?\s*([\d,.]+)\s*(?:cr|crore|crores)\b/i);
  if (croreMatch?.[1]) {
    const parsed = Number.parseFloat(croreMatch[1].replace(/,/g, ""));
    if (Number.isFinite(parsed)) {
      if (parsed > 100000) return null;
      return parsed;
    }
  }

  // 2. Extract "up to ₹XX" pattern
  const upToMatch = cleanStr.match(/up to\s*(?:₹|rs\.?|inr)?\s*([\d,.]+)/i);
  if (upToMatch?.[1]) {
    const parsed = Number.parseFloat(upToMatch[1].replace(/,/g, ""));
    if (Number.isFinite(parsed)) {
      if (parsed > 100000) return null;
      return parsed;
    }
  }

  // 3. Fallback: Parse raw number from text
  const parsed = Number.parseFloat(cleanStr.replace(/₹|rs\.?|inr|cr|crore|crores|,|\s/gi, ""));
  if (Number.isFinite(parsed)) {
    if (parsed > 100000) return null;
    return parsed;
  }

  return null;
}

function cleanValue(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/(\d{4})T\b/g, "$1")
    .trim();
}

function looksLikeMarketParticipantName(value: string) {
  return (
    /[a-z]/i.test(value) &&
    !/shares|agg\.|aggregating|%|₹/.test(value) &&
    /(capital|advisors|merchant|securities|financial|broking|corporate|markets|stock|rta|registrar|kfin|bigshare|mufg|cameo|skyline|maashitla|purva|private|pvt|limited|ltd)/i.test(value)
  );
}

function absoluteUrl(href: string | undefined) {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  return `https://www.chittorgarh.com${href.startsWith("/") ? "" : "/"}${href}`;
}

export function parseChittorgarhIPOList(html: string): CleanSourceRecord[] {
  const $ = cheerio.load(html);
  const records: CleanSourceRecord[] = [];

  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;
    const rawName = cellText($, cells[0]);
    if (!rawName || /issuer|company|ipo name/i.test(rawName)) return;
    const link = absoluteUrl($(cells[0]).find("a").attr("href"));
    const rowText = cells.map((__, cell) => cellText($, cell)).get();
    const maybePrice = rowText.find((text) => /₹|rs|-/i.test(text));
    const priceParts = maybePrice?.match(/(\d+(?:\.\d+)?)/g)?.map(Number) ?? [];

    records.push({
      payload: {
        category: /sme/i.test(rowText.join(" ")) ? "sme" : null,
        closeDate: rowText.find((text) => /\d{1,2}\s+\w+|\d{4}-\d{2}-\d{2}/.test(text)) ?? null,
        issueSizeCr: parseIssueSizeCr(rowText.find((text) => /cr|crore/i.test(text))),
        priceBandHigh: priceParts.at(-1) ?? null,
        priceBandLow: priceParts[0] ?? null,
        rowText,
      },
      rawName,
      recordType: "ipo_list",
      sourceUrl: link,
    });
  });

  return records;
}

function keyValueFacts(rows: Record<string, string>[]) {
  const facts: FactCandidate[] = [];
  for (const row of rows) {
    const values = Object.values(row).filter(Boolean);
    if (values.length < 2) continue;
    const key = values[0].toLowerCase();
    const value = values.slice(1).join(" ");
    if (/registrar/.test(key) && looksLikeMarketParticipantName(value)) facts.push({ confidence: "high", displayValue: value, factKey: "registrar_name", factValue: value, sourceEvidence: values.join(" ") });
    if (/lead manager|merchant|brlm/.test(key) && looksLikeMarketParticipantName(value)) facts.push({ confidence: "high", displayValue: value, factKey: "lead_manager_name", factValue: value, sourceEvidence: values.join(" ") });
    if (/market maker/.test(key) && looksLikeMarketParticipantName(value)) facts.push({ confidence: "high", displayValue: value, factKey: "market_maker_name", factValue: value, sourceEvidence: values.join(" ") });
    if (/lot size/.test(key)) facts.push({ confidence: "high", displayValue: value, factKey: "lot_size", factValue: value });
    if (/issue size/.test(key)) facts.push({ confidence: "high", displayValue: value, factKey: "issue_size", factValue: value });
    if (/price band/.test(key)) facts.push({ confidence: "high", displayValue: value, factKey: "price_band", factValue: value });
    if (/listing at|exchange/.test(key)) facts.push({ confidence: "medium", displayValue: value, factKey: "listing_exchange", factValue: value });
    if (/open date/.test(key)) facts.push({ confidence: "medium", displayValue: value, factKey: "open_date", factValue: value });
    if (/close date/.test(key)) facts.push({ confidence: "medium", displayValue: value, factKey: "close_date", factValue: value });
    if (/listing date/.test(key)) facts.push({ confidence: "medium", displayValue: value, factKey: "listing_date", factValue: value });
  }
  return facts;
}

function tableSearchText(table: ReturnType<typeof extractTablesAndText>["tables"][number]) {
  return `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function firstValueFor(rows: Record<string, string>[], patterns: RegExp[]) {
  for (const row of rows) {
    const values = Object.values(row).filter(Boolean);
    if (values.length < 2) continue;
    const key = values[0].toLowerCase();
    if (patterns.some((pattern) => pattern.test(key))) return cleanValue(values.slice(1).join(" "));
  }
  return null;
}

function rowValue(row: Record<string, string>) {
  const values = Object.values(row).filter(Boolean);
  if (values.length < 2) return null;
  return { key: cleanValue(values[0]), value: cleanValue(values.slice(1).join(" ")) };
}

function normalizeKeyValueRows(rows: Record<string, string>[]) {
  return rows
    .map(rowValue)
    .filter((row): row is { key: string; value: string } => Boolean(row?.key && row.value))
    .map((row) => ({ label: row.key, value: row.value }));
}

function dateRangeFromIPODate(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d{1,2})\s+to\s+(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/i);
  if (!match) return null;
  const [, openDay, closeDay, month, year] = match;
  return {
    closeDate: `${month} ${closeDay}, ${year}`,
    openDate: `${month} ${openDay}, ${year}`,
  };
}

function dateFactsFromTimetable(rows: Record<string, string>[]) {
  const facts: FactCandidate[] = [];
  const get = (patterns: RegExp[]) => firstValueFor(rows, patterns);
  const ipoDateRange = dateRangeFromIPODate(get([/^ipo date$/]));
  const openDate = get([/ipo open/, /^open$/, /open date/, /bidding start/]) ?? ipoDateRange?.openDate;
  const closeDate = get([/ipo close/, /^close$/, /close date/, /bidding end/]) ?? ipoDateRange?.closeDate;
  const allotmentDate = get([/basis of allotment/, /allotment/]);
  const refundDate = get([/initiation of refunds/, /refund/]);
  const creditDate = get([/credit of shares/, /demat/]);
  const listingDate = get([/listing date/, /^listing$/]);

  if (openDate) facts.push(fact("open_date", openDate, "medium"));
  if (closeDate) facts.push(fact("close_date", closeDate, "medium"));
  if (allotmentDate) facts.push(fact("allotment_date", allotmentDate, "medium"));
  if (refundDate) facts.push(fact("refund_date", refundDate, "medium"));
  if (creditDate) facts.push(fact("credit_of_shares_date", creditDate, "medium"));
  if (listingDate) facts.push(fact("listing_date", listingDate, "medium"));

  return facts;
}

function numericDisplay(value: string | null) {
  if (!value) return null;
  return cleanValue(value);
}

function numberFromText(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function priceBandNumbers(value: string | null) {
  const values = value?.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return { high: values.at(-1) ?? null, low: values[0] ?? null };
}

function detailDerivedFacts(rows: Record<string, string>[]) {
  const facts: FactCandidate[] = [];
  const get = (patterns: RegExp[]) => firstValueFor(rows, patterns);
  const faceValue = get([/face value/]);
  const priceBand = get([/price band/]);
  const issuePrice = get([/issue price/]);
  const lotSize = get([/^lot size$/, /market lot/]);
  const saleType = get([/sale type/]);
  const issueType = get([/issue type/]);
  const listingAt = get([/listing at/, /listed on/, /listing exchange/, /exchange/]);
  const totalIssueSize = get([/total issue size/, /^issue size$/, /total issue/]);
  const freshIssue = get([/fresh issue/]);
  const offerForSale = get([/offer for sale/, /\bofs\b/]);
  const marketMakerPortion = get([/market maker portion/, /reserved for market maker/]);

  if (faceValue) facts.push(fact("face_value", faceValue, "high", faceValue));
  if (priceBand) {
    const { high, low } = priceBandNumbers(priceBand);
    facts.push(fact("price_band", priceBand, "high", priceBand));
    if (low !== null) facts.push(fact("price_band_low", low, "high", String(low), priceBand));
    if (high !== null) facts.push(fact("price_band_high", high, "high", String(high), priceBand));
  }
  if (issuePrice) facts.push(fact("issue_price", numericDisplay(issuePrice), "high", issuePrice));
  if (lotSize) facts.push(fact("lot_size", lotSize, "high", lotSize));
  if (saleType) facts.push(fact("sale_type", saleType, "medium", saleType));
  if (issueType) facts.push(fact("issue_type", issueType, "medium", issueType));
  if (listingAt) facts.push(fact("listing_exchange", listingAt, "medium", listingAt));
  if (totalIssueSize) {
    facts.push(fact("total_issue_size", totalIssueSize, "high", totalIssueSize));
    facts.push(fact("issue_size", totalIssueSize, "high", totalIssueSize));
  }
  if (freshIssue) facts.push(fact("fresh_issue", freshIssue, "high", freshIssue));
  if (offerForSale) facts.push(fact("offer_for_sale", offerForSale, "high", offerForSale));
  if (marketMakerPortion) facts.push(fact("market_maker_portion", marketMakerPortion, "medium", marketMakerPortion));
  facts.push(...dateFactsFromTimetable(rows));
  return facts;
}

function looksLikeIPODetailsTable(table: ReturnType<typeof extractTablesAndText>["tables"][number]) {
  const heading = table.nearbyHeading.toLowerCase();
  if (/issue reservation|ipo lot size|recently listed|objects|recommendations|financial|kpi|registrar|lead manager|contact/i.test(heading)) {
    return false;
  }
  const detailLabels = table.rows
    .map(rowValue)
    .filter(Boolean)
    .filter((row) =>
      /^(ipo date|listed on|listing date|face value|price band|issue price|lot size|sale type|issue type|listing at|total issue size|fresh issue|fresh issue \(ex market maker\)|offer for sale|net offered to public|share holding pre issue|share holding post issue|reserved for market maker|market maker portion|bse sme|nse sme|bse script code|nse symbol|isin)$/i.test(
        row!.key,
      ),
    );
  return detailLabels.length >= 2;
}

function timetableFactsFromText(cleanText: string) {
  const segment = cleanText.match(/IPO Timetable \(?Tentative\)?(.+?)IPOs Timetable Issue Reservation/i)?.[1];
  if (!segment) return [];
  const rows: Record<string, string>[] = [];
  const labels = ["IPO Open", "IPO Close", "Allotment", "Refund", "Credit of Shares", "Listing"];
  for (const label of labels) {
    const nextLabels = labels.filter((item) => item !== label).join("|").replace(/ /g, "\\s+");
    const match = segment.match(new RegExp(`${label.replace(/ /g, "\\s+")}\\s*(.+?)(?=${nextLabels}|$)`, "i"));
    const value = cleanValue(match?.[1]);
    if (value) rows.push({ Field: label, Value: value });
  }
  return dateFactsFromTimetable(rows);
}

function latestColumn(headers: string[]) {
  for (let index = 1; index < headers.length; index += 1) {
    if (/20\d{2}|mar|jun|sep|dec|fy/i.test(headers[index] ?? "")) return headers[index];
  }
  return headers[1] ?? null;
}

function latestValueFor(table: ReturnType<typeof extractTablesAndText>["tables"][number], pattern: RegExp) {
  const column = latestColumn(table.headers);
  if (!column) return null;
  for (const row of table.rows) {
    const first = Object.values(row)[0] ?? "";
    if (pattern.test(first)) return cleanValue(row[column]);
  }
  return null;
}

function financialDerivedFacts(table: ReturnType<typeof extractTablesAndText>["tables"][number]) {
  const facts: FactCandidate[] = [];
  const mappings: Array<[string, RegExp]> = [
    ["assets_latest", /assets/i],
    ["total_income_latest", /total income|income|revenue|sales/i],
    ["revenue_latest", /total income|revenue|sales/i],
    ["pat_latest", /profit after tax|\bpat\b|net profit/i],
    ["ebitda_latest", /ebitda/i],
    ["net_worth_latest", /net worth/i],
    ["reserves_latest", /reserves|surplus/i],
    ["borrowing_latest", /borrowing|borrowings|debt/i],
  ];
  for (const [key, pattern] of mappings) {
    const value = latestValueFor(table, pattern);
    if (value) facts.push(fact(key, numberFromText(value) ?? value, "high", value, `${key}: ${value}`));
  }
  return facts;
}

function kpiDerivedFacts(table: ReturnType<typeof extractTablesAndText>["tables"][number]) {
  const facts: FactCandidate[] = [];
  for (const row of table.rows) {
    const values = Object.values(row).filter(Boolean);
    if (values.length < 2) continue;
    const label = values[0].toLowerCase();
    const value = cleanValue(values[1]);
    const secondValue = cleanValue(values[2]);
    const push = (key: string, selected = value) => {
      if (selected) facts.push(fact(key, numberFromText(selected) ?? selected, "high", selected, `${values[0]} ${selected}`));
    };
    if (/^roe$/.test(label)) push("roe_latest");
    if (/^roce$/.test(label)) push("roce_latest");
    if (/ronw/.test(label)) push("ronw_latest");
    if (/debt\/?equity/.test(label)) push("debt_equity_latest");
    if (/pat margin/.test(label)) push("pat_margin_latest");
    if (/ebitda margin/.test(label)) push("ebitda_margin_latest");
    if (/price to book/.test(label)) push("price_to_book_value");
    if (/eps/.test(label)) {
      push("eps_pre_ipo", value);
      push("eps_post_ipo", secondValue || value);
    }
    if (/p\/?e/.test(label)) {
      push("pe_pre_ipo", value);
      push("pe_post_ipo", secondValue || value);
    }
    if (/promoter holding/.test(label)) {
      push("promoter_holding_pre_ipo", value);
      if (secondValue) push("promoter_holding_post_ipo", secondValue);
    }
    if (/market cap/.test(label)) push("market_cap", value);
  }
  return facts;
}

function subscriptionDerivedFacts(table: ReturnType<typeof extractTablesAndText>["tables"][number]) {
  const facts: FactCandidate[] = [];
  const rowText = table.rowText.join(" ");
  const rowFor = (pattern: RegExp) => table.rows.find((row) => pattern.test(Object.values(row).join(" ")));
  const timesFromRow = (row: Record<string, string> | undefined) => {
    if (!row) return null;
    const value = Object.entries(row).find(([key, cell]) => /times|subscription|x/i.test(key) || /\d+(?:\.\d+)?x/i.test(cell))?.[1] ?? Object.values(row).at(-1);
    return value ? cleanValue(value) : null;
  };
  if (!/subscription|subscribed|qib|retail|nii/i.test(rowText)) return facts;
  const qib = timesFromRow(rowFor(/\bqib\b/i));
  const nii = timesFromRow(rowFor(/\bnii\b|\bhni\b/i));
  const retail = timesFromRow(rowFor(/retail|individual/i));
  const total = timesFromRow(rowFor(/total/i));
  if (qib) facts.push(fact("qib_subscription", numberFromText(qib) ?? qib, "medium", qib));
  if (nii) facts.push(fact("nii_subscription", numberFromText(nii) ?? nii, "medium", nii));
  if (retail) facts.push(fact("retail_subscription", numberFromText(retail) ?? retail, "medium", retail));
  if (total) facts.push(fact("total_subscription", numberFromText(total) ?? total, "medium", total));
  return facts;
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

function strongestAboutText(cleanText: string, ipoName?: string) {
  const escapedName = ipoName?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    /about (?:the )?company\s+(.{80,1400}?)(?=\s+(?:competitive strengths|objects? of|financial information|restated financial|risk factors|ipo details|promoters?|peer|$))/i,
    /(?:incorporated|established|founded)[^.]{0,180}\..{80,1200}?(?=\s+(?:the company|objects? of|financial information|ipo details|promoters?|peer|$))/i,
    /(?:the company is engaged in|the company manufactures|the company provides).{80,1200}?(?=\s+(?:objects? of|financial information|ipo details|promoters?|peer|$))/i,
    escapedName ? new RegExp(`${escapedName}.{80,1200}?(?=\\s+(?:objects? of|financial information|ipo details|promoters?|peer|$))`, "i") : null,
  ].filter(Boolean) as RegExp[];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    const value = cleanValue(match?.[1] ?? match?.[0]);
    if (value.length >= 80) return value;
  }
  return null;
}

function entityFromText(cleanText: string, pattern: RegExp) {
  const match = cleanText.match(pattern);
  const value = cleanValue(match?.[1]);
  return value && looksLikeMarketParticipantName(value) ? value : null;
}

function partyFactsFromText(cleanText: string) {
  const facts: FactCandidate[] = [];
  const leadManager = entityFromText(
    cleanText,
    /([A-Z][A-Za-z0-9&().,'/\-\s]{2,160}?)\s+is the book running lead manager/i,
  );
  const registrar =
    entityFromText(cleanText, /\band\s+([A-Z][A-Za-z0-9&().,'/\-\s]{2,120}?)\s+is the registrar of the issue/i) ??
    entityFromText(cleanText, /(?:^|[.;])\s*([A-Z][A-Za-z0-9&().,'/\-\s]{2,120}?)\s+is the registrar of the issue/i);
  const marketMaker = entityFromText(
    cleanText,
    /The Market Maker of the company is\s+([A-Z][A-Za-z0-9&().,'/\-\s]{2,160}?)(?=\.?Refer|\s+Refer|IPO Open|$)/i,
  );

  if (leadManager) {
    facts.push(
      fact("lead_manager_name", leadManager, "high", leadManager, `${leadManager} is the book running lead manager`),
    );
  }
  if (registrar) {
    facts.push(fact("registrar_name", registrar, "high", registrar, `${registrar} is the registrar of the issue`));
  }
  if (marketMaker) {
    facts.push(fact("market_maker_name", marketMaker, "high", marketMaker, `The Market Maker of the company is ${marketMaker}`));
  }

  return facts;
}

function contactFactsFromText(cleanText: string) {
  const facts: FactCandidate[] = [];
  const registrarMatch = cleanText.match(/IPO Registrar\s*(.+?)\s*IPO Lead Manager/i);
  if (registrarMatch?.[1]) {
    const segment = cleanValue(registrarMatch[1]);
    const email = segment.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const phones = segment.match(/(?:\+?\d[\d\s,-]{7,}\d)/g)?.map(cleanValue).filter(Boolean) ?? [];
    if (email || phones.length) facts.push(fact("registrar_contact", { email, phone: phones.join(", ") || null, website: /visit website/i.test(segment) ? "Visit Website" : null }, "medium", "Registrar contact details", segment));
  }

  const leadManagerMatch = cleanText.match(/IPO Lead Manager\(s\)\s*(.+?)\s*Contact Details/i);
  if (leadManagerMatch?.[1]) {
    const segment = cleanValue(leadManagerMatch[1]);
    const name = cleanValue(segment.replace(/\(Past IPO Performance\).*/i, ""));
    if (name) facts.push(fact("lead_managers_table", [{ name, past_ipo_performance_url: /past ipo performance/i.test(segment) ? "Past IPO Performance" : null }], "medium", "Lead managers table", segment));
  }

  const contactMatch = cleanText.match(/Contact Details\s*(.+?)\s*IPO FAQs/i);
  if (contactMatch?.[1]) {
    const segment = cleanValue(contactMatch[1]);
    const email = segment.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const phone = segment.match(/(?:\+?\d[\d\s,-]{7,}\d)/)?.[0] ?? null;
    const address = cleanValue(segment.replace(email ?? "", "").replace(phone ?? "", "").replace(/Visit Website/gi, ""));
    facts.push(fact("company_contact", { address: address || null, email, phone: phone ? cleanValue(phone) : null, website: /visit website/i.test(segment) ? "Visit Website" : null }, "medium", "Company contact details", segment));
  }

  return facts;
}

export function parseChittorgarhDetail(html: string, ipoName?: string, reviewHtml?: string | null) {
  const extracted = extractTablesAndText(html);
  const facts: FactCandidate[] = [];
  const warnings: string[] = [];
  const tableClassifications: Array<{ factKeys: string[]; heading: string; index: number; type: string }> = [];
  const mergedDetailRows: Array<{ label: string; value: string }> = [];
  const mergedKpiRows: Array<{ label: string; value: string; value_2?: string }> = [];

  const description = strongestAboutText(extracted.cleanText, ipoName);
  if (description) facts.push(fact("company_description", description, "high"));
  facts.push(...partyFactsFromText(extracted.cleanText));
  facts.push(...contactFactsFromText(extracted.cleanText));
  facts.push(...timetableFactsFromText(extracted.cleanText));

  for (const table of extracted.tables) {
    const text = tableSearchText(table);
    const keysBefore = facts.length;
    let type = "unclassified";

    if (looksLikeIPODetailsTable(table)) {
      type = "ipo_details";
      facts.push(...keyValueFacts(table.rows));
      mergedDetailRows.push(...normalizeKeyValueRows(table.rows));
      facts.push(...detailDerivedFacts(table.rows));
      const registrar = firstValueFor(table.rows, [/registrar/]);
      const leadManager = firstValueFor(table.rows, [/lead manager/, /merchant banker/, /brlm/]);
      const marketMaker = firstValueFor(table.rows, [/market maker/]);

      if (registrar && looksLikeMarketParticipantName(registrar)) facts.push(fact("registrar_name", registrar, "high", registrar, `Registrar ${registrar}`));
      if (leadManager && looksLikeMarketParticipantName(leadManager)) facts.push(fact("lead_manager_name", leadManager, "high", leadManager, `Lead Manager ${leadManager}`));
      if (marketMaker && looksLikeMarketParticipantName(marketMaker)) facts.push(fact("market_maker_name", marketMaker, "high", marketMaker, `Market Maker ${marketMaker}`));
    }

    if (/issue reservation|shares offered|% of net issue|% of total issue|anchor investor shares offered/i.test(text)) {
      type = type === "unclassified" ? "issue_reservation" : `${type}+issue_reservation`;
      facts.push(fact("issue_reservation_table", table.rows, "high", `Issue reservation table with ${table.rows.length} rows`));
    }

    if (/ipo lot size|application|lots|shares|amount|s-hni|b-hni/i.test(text) && /application|lots/.test(text)) {
      type = type === "unclassified" ? "lot_size" : `${type}+lot_size`;
      facts.push(fact("lot_size_table", table.rows, "high", `IPO lot size table with ${table.rows.length} rows`));
    }

    let isKpiTable = false;
    if (hasAny(text, [/\bkpi\b/, /\broe\b/, /\broce\b/, /debt\/?equity/, /ronw/, /\beps\b/, /\bp\/?e\b/, /\bnav\b/])) {
      const maybePeerOnly = hasAny(text, [/peer|comparison|cmp|company name/]) && !hasAny(text, [/\bkpi\b/, /debt\/?equity/]);
      if (!maybePeerOnly) {
        isKpiTable = true;
      }
    }

    if (!isKpiTable && hasAny(text, [/financial information/, /company financials/, /restated financials/, /assets/, /revenue/, /total income/, /profit after tax/, /\bpat\b/, /net worth/, /reserves/, /borrowing/, /ebitda/])) {
      type = type === "unclassified" ? "financials" : `${type}+financials`;
      facts.push(fact("financial_table", table.rows, "high", `Financial table with ${table.rows.length} rows`));
      facts.push(...financialDerivedFacts(table));
    }

    if (hasAny(text, [/\bkpi\b/, /\broe\b/, /\broce\b/, /debt\/?equity/, /ronw/, /\beps\b/, /\bp\/?e\b/, /\bnav\b/])) {
      const maybePeerOnly = hasAny(text, [/peer|comparison|cmp|company name/]) && !hasAny(text, [/\bkpi\b/, /debt\/?equity/]);
      if (!maybePeerOnly) {
        type = type === "unclassified" ? "kpi" : `${type}+kpi`;
        for (const row of table.rows) {
          const values = Object.values(row).filter(Boolean);
          if (values.length < 2) continue;
          mergedKpiRows.push({ label: cleanValue(values[0]), value: cleanValue(values[1]), value_2: cleanValue(values[2]) || undefined });
        }
        facts.push(...kpiDerivedFacts(table));
      }
    }

    if (hasAny(text, [/peer/, /comparison/, /company/, /\bp\/?e\b/, /\beps\b/, /ronw/, /\bnav\b/])) {
      if (hasAny(text, [/peer|comparison|company name|cmp|face value|p\/?e|eps/])) {
        type = type === "unclassified" ? "peer_valuation" : `${type}+peer_valuation`;
        facts.push(fact("peer_valuation_table", table.rows, "high", `Peer table with ${table.rows.length} rows`));
      }
    }

    if (/ipo subscription status|subscription status|subscribed|subscription times|\btimes\b/.test(text)) {
      type = type === "unclassified" ? "subscription" : `${type}+subscription`;
      facts.push(fact("subscription_table", table.rows, "medium", `Subscription table with ${table.rows.length} rows`));
      facts.push(...subscriptionDerivedFacts(table));
    }

    if (/issue objects|objects of the issue|est amt|funding|general corporate purposes/i.test(text)) {
      type = type === "unclassified" ? "objects" : `${type}+objects`;
      facts.push(fact("objects_of_issue", table.rows, "high", `Objects of issue table with ${table.rows.length} rows`));
    }

    const detected = facts.slice(keysBefore).map((item) => item.factKey);
    tableClassifications.push({ factKeys: detected, heading: table.nearbyHeading, index: table.index, type });
    if (type === "unclassified") {
      warnings.push(`Unclassified table ${table.index}${table.nearbyHeading ? ` near ${table.nearbyHeading}` : ""}.`);
    }
  }

  if (mergedDetailRows.length > 0) {
    facts.push(fact("ipo_details_table", mergedDetailRows, "high", `IPO details table with ${mergedDetailRows.length} rows`));
  }

  if (mergedKpiRows.length > 0) {
    facts.push(fact("kpi_table", mergedKpiRows, "high", `KPI table with ${mergedKpiRows.length} rows`));
  }

  const objectsMatch = extracted.cleanText.match(/objects? of (?:the )?issue.{20,900}?(?=(?:financial|peer|strength|risk|company|$))/i);
  if (objectsMatch && !facts.some((item) => item.factKey === "objects_of_issue")) facts.push(fact("objects_of_issue", cleanValue(objectsMatch[0]), "medium"));

  const strengthsMatch = extracted.cleanText.match(/(?:competitive )?strengths?.{20,1200}?(?=(?:risk factors|objects? of|financial|peer|$))/i);
  if (strengthsMatch) facts.push(fact("strengths", cleanValue(strengthsMatch[0]), "medium"));

  const risksMatch = extracted.cleanText.match(/risk factors?.{20,1400}?(?=(?:objects? of|financial|peer|registrar|$))/i);
  if (risksMatch) facts.push(fact("risks", cleanValue(risksMatch[0]), "medium"));

  if (reviewHtml) {
    const reviewExtracted = extractTablesAndText(reviewHtml);

    // 1. Financial Table from Review HTML
    const reviewFinTable = reviewExtracted.tables.find((table) => {
      const text = `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
      const isKpi = hasAny(text, [/\bkpi\b/, /\broe\b/, /\broce\b/, /debt\/?equity/, /ronw/, /\beps\b/, /\bp\/?e\b/, /\bnav\b/]) && !hasAny(text, [/peer|comparison/]);
      return !isKpi && hasAny(text, [/financial information/, /company financials/, /restated financials/, /assets/, /revenue/, /total income/, /profit after tax/, /\bpat\b/, /net worth/]);
    });
    if (reviewFinTable) {
      facts.push(fact("financial_table", reviewFinTable.rows, "high", `Financial table with ${reviewFinTable.rows.length} rows`));
      facts.push(...financialDerivedFacts(reviewFinTable));
    }

    // 2. Peer Valuation Table & sectorPEAvg
    const reviewPeerTable = reviewExtracted.tables.find((table) => {
      const text = `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
      return hasAny(text, [/peer/, /comparison/, /company/]) && hasAny(text, [/p\/?e/, /eps/, /roe/, /ronw/, /cmp/]) && table.rows.length >= 1;
    });
    if (reviewPeerTable) {
      facts.push(fact("peer_valuation_table", reviewPeerTable.rows, "high", `Peer table with ${reviewPeerTable.rows.length} rows`));

      const peerPEsForAvg: number[] = [];
      reviewPeerTable.rows.forEach((row, index) => {
        if (index === 0) return; // exclude first row (company itself)
        const peKeys = Object.keys(row).filter(k => /p\/?e|pe ratio|ratio/i.test(k));
        let peVal: number | null = null;
        for (const key of peKeys) {
          peVal = parseIssueSizeCr(row[key]);
          if (peVal !== null) break;
        }
        if (peVal !== null && peVal > 0) {
          peerPEsForAvg.push(peVal);
        }
      });
      if (peerPEsForAvg.length > 0) {
        const avg = peerPEsForAvg.reduce((a, b) => a + b, 0) / peerPEsForAvg.length;
        facts.push(fact("sectorPEAvg", Number(avg.toFixed(2)), "high"));
      }
    }

    // 3. Promoter Names
    const $review = cheerio.load(reviewHtml);
    let promoterNames: string | null = null;
    $review("h1, h2, h3, h4, h5, h6, p, div, td, th").each((_, el) => {
      if (promoterNames) return;
      const text = $review(el).text().trim();
      if (/promoter(?:s)? of the company (?:are|is)\s+([^.\n]+)/i.test(text)) {
        const match = text.match(/promoter(?:s)? of the company (?:are|is)\s+([^.\n]+)/i);
        if (match?.[1]) {
          promoterNames = cleanValue(match[1]);
        }
      }
    });
    if (!promoterNames) {
      $review("table tr").each((_, tr) => {
        if (promoterNames) return;
        const cells = $review(tr).find("td");
        if (cells.length >= 2) {
          const key = cellText($review, cells[0]);
          if (/promoters/i.test(key)) {
            promoterNames = cellText($review, cells[1]);
          }
        }
      });
    }
    if (promoterNames) {
      facts.push(fact("promoters", promoterNames, "high", promoterNames));
    }

    // 4. Review Summary text
    let reviewSummary: string | null = null;
    $review("h2, h3, h4, strong").each((_, el) => {
      if (reviewSummary) return;
      const text = $review(el).text().trim().toLowerCase();
      if (/recommendation|verdict|review summary|our view/i.test(text) && text.length < 100) {
        let next = $review(el).next();
        const paragraphs: string[] = [];
        let depth = 0;
        while (next.length && depth < 3) {
          if (next.is("h1, h2, h3, h4, h5, h6")) break;
          const pText = next.text().trim();
          if (pText) paragraphs.push(pText);
          next = next.next();
          depth++;
        }
        if (paragraphs.length > 0) {
          reviewSummary = cleanValue(paragraphs.join("\n\n"));
        }
      }
    });
    if (reviewSummary) {
      facts.push(fact("ipo_review_summary", reviewSummary, "medium"));
    }
  }

  const dedupedFacts = uniqueFacts(facts);
  const factKeysDetected = Array.from(new Set(dedupedFacts.map((item) => item.factKey)));
  const expectedKeys = [
    "company_description",
    "ipo_details_table",
    "issue_reservation_table",
    "lot_size_table",
    "financial_table",
    "kpi_table",
    "peer_valuation_table",
    "registrar_name",
    "registrar_contact",
    "lead_manager_name",
    "lead_managers_table",
    "market_maker_name",
    "company_contact",
    "objects_of_issue",
    "strengths",
    "risks",
    "subscription_table",
    "open_date",
    "close_date",
    "allotment_date",
    "refund_date",
    "credit_of_shares_date",
    "listing_date",
  ];
  const missingExpectedKeys = expectedKeys.filter((key) => !factKeysDetected.includes(key));

  warnings.push(...missingExpectedKeys.map((key) => `Missing expected Chittorgarh detail section/fact: ${key}.`));
  if (dedupedFacts.length === 0) warnings.push("No valid Chittorgarh detail facts found.");

  return {
    debug: {
      ...extracted.debug,
      factKeysDetected,
      headings: extracted.headings.slice(0, 20),
      headingsFound: extracted.headings.length,
      missingExpectedKeys,
      tableClassifications,
      tablesFound: extracted.tables.length,
    },
    facts: dedupedFacts,
    warnings,
  };
}
