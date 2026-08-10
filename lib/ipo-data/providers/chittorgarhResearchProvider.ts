import { load, type CheerioAPI } from "cheerio";
import type { IPOFinancialDataPoint, IPOResearchDataPoint, IPOValuationDataPoint } from "@/lib/ipo-data/providers/baseProvider";
import { cleanCell, fetchHtml, parseNumber, parsePercent } from "@/lib/ipo-data/providers/tableParser";
import { discoverLeadManagerMetadataFromHtml } from "@/lib/lead-managers/discoverLeadManagerFromIPOPage";
import { parsePublicDate } from "@/lib/ipo-data/publicDateParser";

const SOURCE = "Chittorgarh";
const INDEX_URLS = [
  "https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/",
  "https://www.chittorgarh.com/report/sme-ipo-list-in-india-bse-sme-nse-emerge/84/",
  "https://www.chittorgarh.com/ipo/ipo_dashboard.asp",
];

export interface ChittorgarhIPOEntry {
  label: string;
  url: string;
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function absoluteUrl(href: string) {
  return href.startsWith("http") ? href : new URL(href, "https://www.chittorgarh.com").toString();
}

function firstNumber(value: string | null | undefined) {
  return parseNumber(value);
}

function tableCells($: CheerioAPI, row: Parameters<CheerioAPI>[0]) {
  return $(row)
    .find("td,th")
    .map((_, cell) => cleanCell($(cell).text()))
    .get();
}

function rowLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function metricValue(metrics: Map<string, string[]>, patterns: RegExp[], index: number) {
  for (const [label, values] of metrics) {
    if (patterns.some((pattern) => pattern.test(label))) {
      return firstNumber(values[index]);
    }
  }

  return null;
}

function metricPercent(metrics: Map<string, string[]>, patterns: RegExp[], index: number) {
  for (const [label, values] of metrics) {
    if (patterns.some((pattern) => pattern.test(label))) {
      return parsePercent(values[index]);
    }
  }

  return null;
}

function parseFinancials($: ReturnType<typeof load>) {
  let financials: IPOFinancialDataPoint[] = [];

  $("table").each((_, table) => {
    const headers = tableCells($, $(table).find("tr").first());

    if (!/^period ended$/i.test(headers[0] ?? "") || headers.length < 2) {
      return;
    }

    const metrics = new Map<string, string[]>();

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = tableCells($, row);

        if (cells.length > 1) {
          metrics.set(rowLabel(cells[0]), cells.slice(1));
        }
      });

    financials = headers.slice(1).map((financialYear, index) => ({
      debtEquity: null,
      ebitdaCr: metricValue(metrics, [/^ebitda$/], index),
      ebitdaMarginPct: null,
      eps: null,
      financialYear,
      netWorthCr: metricValue(metrics, [/net worth/], index),
      patCr: metricValue(metrics, [/profit after tax/, /^pat$/], index),
      patMarginPct: null,
      revenueCr: metricValue(metrics, [/total income/, /^revenue$/], index),
      rocePct: null,
      roePct: null,
      totalBorrowingsCr: metricValue(metrics, [/total borrowing/, /borrowings?/], index),
    }));
  });

  return financials.filter((row) => row.revenueCr !== null || row.patCr !== null || row.ebitdaCr !== null);
}

function parseKpis($: ReturnType<typeof load>) {
  const result = {
    debtEquity: null as number | null,
    ebitdaMarginPct: null as number | null,
    patMarginPct: null as number | null,
    rocePct: null as number | null,
    roePct: null as number | null,
    ronwPct: null as number | null,
  };

  $("table").each((_, table) => {
    const headers = tableCells($, $(table).find("tr").first());

    if (!/^kpi$/i.test(headers[0] ?? "")) {
      return;
    }

    const metrics = new Map<string, string[]>();

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = tableCells($, row);

        if (cells.length > 1) {
          metrics.set(rowLabel(cells[0]), cells.slice(1));
        }
      });

    result.roePct = metricPercent(metrics, [/^roe$/], 0);
    result.rocePct = metricPercent(metrics, [/^roce$/], 0);
    result.ronwPct = metricPercent(metrics, [/ronw/], 0);
    result.patMarginPct = metricPercent(metrics, [/pat margin/, /profit after tax margin/], 0);
    result.ebitdaMarginPct = metricPercent(metrics, [/ebitda margin/], 0);
    result.debtEquity = metricValue(metrics, [/debt equity/, /debt\/equity/], 0);
  });

  return result;
}

function parseValuation($: ReturnType<typeof load>, kpis: ReturnType<typeof parseKpis>): IPOValuationDataPoint | null {
  let eps: number | null = null;
  let peRatio: number | null = null;

  $("table").each((_, table) => {
    const headers = tableCells($, $(table).find("tr").first()).map((header) => header.toLowerCase());
    const postIndex = headers.findIndex((header) => /post ipo/.test(header));
    const preIndex = headers.findIndex((header) => /pre ipo/.test(header));
    const valueIndex = postIndex >= 0 ? postIndex : preIndex;

    if (valueIndex <= 0) {
      return;
    }

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = tableCells($, row);
        const label = rowLabel(cells[0] ?? "");

        if (/^eps/.test(label)) {
          eps = firstNumber(cells[valueIndex]);
        }

        if (/^p e|^pe|p e x/.test(label)) {
          peRatio = firstNumber(cells[valueIndex]);
        }
      });
  });

  const valuation = {
    eps,
    patMarginPct: kpis.patMarginPct,
    peRatio,
    rocePct: kpis.rocePct,
    ronwPct: kpis.ronwPct ?? kpis.roePct,
    source: SOURCE,
    sourceUrl: null,
  };

  return Object.values(valuation).some((value) => typeof value === "number") ? valuation : null;
}

function parsePromoterHolding($: ReturnType<typeof load>) {
  const result = {
    postIssuePromoterHoldingPct: null as number | null,
    preIssuePromoterHoldingPct: null as number | null,
  };

  $("table").each((_, table) => {
    const headers = tableCells($, $(table).find("tr").first()).map((header) => header.toLowerCase());
    const postIndex = headers.findIndex((header) => /post ipo/.test(header));
    const preIndex = headers.findIndex((header) => /pre ipo/.test(header));

    if (postIndex <= 0 && preIndex <= 0) {
      return;
    }

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = tableCells($, row);

        if (/promoter holding/i.test(cells[0] ?? "")) {
          if (preIndex > 0) result.preIssuePromoterHoldingPct = parsePercent(cells[preIndex]);
          if (postIndex > 0) result.postIssuePromoterHoldingPct = parsePercent(cells[postIndex]);
        }
      });
  });

  return result;
}

function parseSummaryFields($: ReturnType<typeof load>) {
  const bodyText = compact($("body").text());
  const priceBand = bodyText.match(/Price Band\s*₹?\s*([\d,.]+)(?:\s*(?:to|-)\s*₹?\s*([\d,.]+))?/i);

  return {
    issueSizeCr: firstNumber(bodyText.match(/Issue Size\s*₹?\s*([\d,.]+)\s*Cr/i)?.[1]),
    lotSize: firstNumber(bodyText.match(/Lot Size\s*([\d,.]+)\s+Shares/i)?.[1]),
    priceBandHigh: firstNumber(priceBand?.[2] ?? priceBand?.[1]),
    priceBandLow: firstNumber(priceBand?.[1]),
  };
}

function parseDates($: ReturnType<typeof load>) {
  const result = {
    allotmentDate: null as string | null,
    closeDate: null as string | null,
    listingDate: null as string | null,
    openDate: null as string | null,
  };

  $("table").each((_, table) => {
    $(table)
      .find("tr")
      .each((__, row) => {
        const cells = tableCells($, row);
        const label = cells[0] ?? "";
        const date = parsePublicDate(cells[1]);

        if (/open/i.test(label)) result.openDate = date;
        if (/close/i.test(label)) result.closeDate = date;
        if (/allotment/i.test(label)) result.allotmentDate = date;
        if (/listing/i.test(label)) result.listingDate = date;
      });
  });

  return result;
}

function applyKpisToLatestFinancials(financials: IPOFinancialDataPoint[], kpis: ReturnType<typeof parseKpis>) {
  if (financials.length === 0) {
    return financials;
  }

  return financials.map((row, index) =>
    index === 0
      ? {
          ...row,
          debtEquity: kpis.debtEquity,
          ebitdaMarginPct: kpis.ebitdaMarginPct,
          patMarginPct: kpis.patMarginPct,
          rocePct: kpis.rocePct,
          roePct: kpis.roePct ?? kpis.ronwPct,
        }
      : row,
  );
}

export async function discoverChittorgarhIPOEntries(): Promise<ChittorgarhIPOEntry[]> {
  const seen = new Set<string>();
  const entries: ChittorgarhIPOEntry[] = [];

  for (const indexUrl of INDEX_URLS) {
    const html = await fetchHtml(indexUrl);
    const $ = load(html);

    $("a[href*='/ipo/']").each((_, anchor) => {
      const href = $(anchor).attr("href") ?? "";
      const url = absoluteUrl(href);

      if (!/\/ipo\/[^/]+-ipo\/\d+\/?$/i.test(url) || seen.has(url)) {
        return;
      }

      const label = compact($(anchor).attr("title") ?? $(anchor).text() ?? "");

      seen.add(url);
      entries.push({ label, url });
    });
  }

  return entries;
}

export async function fetchChittorgarhResearch(detailUrl: string): Promise<IPOResearchDataPoint | null> {
  const html = await fetchHtml(detailUrl);
  const $ = load(html);
  const bodyText = compact($("body").text());
  const title = compact($("h1").first().text());
  const ipoName = title.replace(/\bIPO\b.*$/i, "").trim();

  if (!ipoName) {
    return null;
  }

  const kpis = parseKpis($);
  const valuation = parseValuation($, kpis);

  if (valuation) {
    valuation.sourceUrl = detailUrl;
  }
  const discovered = discoverLeadManagerMetadataFromHtml(html, {
    ipoDetailSourceUrl: detailUrl,
    ipoId: "",
    ipoName,
    sourceName: "CHITTORGARH",
  });

  return {
    ...parseDates($),
    ...parseSummaryFields($),
    ...parsePromoterHolding($),
    businessModel: null,
    category: /\bsme\b/i.test(title) ? "sme" : null,
    companyContact: discovered.companyContact ?? null,
    companyOverview: null,
    detailUrl,
    financials: applyKpisToLatestFinancials(parseFinancials($), kpis),
    ipoName,
    issueSizeCr: parseSummaryFields($).issueSizeCr,
    leadManagers: discovered.leadManagers,
    minInvestment: null,
    marketMaker: discovered.marketMaker ?? null,
    objectsOfIssue: [],
    registrar: discovered.registrar ?? null,
    source: SOURCE,
    sourceParsedJson: {
      kpis,
      summary: parseSummaryFields($),
    },
    sourceRawHtml: html,
    sourceRawText: bodyText,
    sourceUrl: detailUrl,
    updatedAt: new Date().toISOString(),
    valuation,
  };
}
