import { load } from "cheerio";
import type { IPOFinancialDataPoint, IPOResearchDataPoint, IPOValuationDataPoint } from "@/lib/ipo-data/providers/baseProvider";
import { discoverLeadManagerMetadataFromHtml } from "@/lib/lead-managers/discoverLeadManagerFromIPOPage";
import { parsePublicDate } from "@/lib/ipo-data/publicDateParser";
import { cleanCell, fetchHtml, parseNumber } from "@/lib/ipo-data/providers/tableParser";

const SOURCE = "IPO Guru";

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function firstNumber(value: string | null | undefined) {
  return parseNumber(value);
}

function sectionByHeading($: ReturnType<typeof load>, pattern: RegExp) {
  const heading = $("h1,h2,h3,h4")
    .filter((_, element) => pattern.test(compact($(element).text())))
    .first();

  return heading.length ? heading.parent() : null;
}

function parsePriceBand(text: string) {
  const match = text.match(/Price\s+Band\s+₹?\s*([\d,.]+)(?:\s*(?:to|-)\s*₹?\s*([\d,.]+))?/i);

  if (!match) {
    return { priceBandHigh: null, priceBandLow: null };
  }

  const low = firstNumber(match[1]);
  const high = firstNumber(match[2] ?? match[1]);

  return { priceBandHigh: high, priceBandLow: low };
}

function parseSummary(text: string) {
  const priceBand = parsePriceBand(text);

  return {
    ...priceBand,
    issueSizeCr: firstNumber(text.match(/Issue\s+Size\s+₹?\s*([\d,.]+)\s*Cr/i)?.[1]),
    lotSize: firstNumber(text.match(/Lot\s+Size\s+([\d,.]+)\s+Shares/i)?.[1]),
    minInvestment: firstNumber(text.match(/Min\s+Investment\s+₹?\s*([\d,.]+)/i)?.[1]),
  };
}

function parseTimetable($: ReturnType<typeof load>) {
  const result = {
    allotmentDate: null as string | null,
    closeDate: null as string | null,
    listingDate: null as string | null,
    openDate: null as string | null,
  };

  $("table").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((__, cell) => compact($(cell).text()).toLowerCase())
      .get();

    if (!headers.includes("event") || !headers.includes("date")) {
      return;
    }

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .map((___, cell) => cleanCell($(cell).text()))
          .get();
        const event = cells[0] ?? "";
        const date = parsePublicDate(cells[1]);

        if (/open/i.test(event)) result.openDate = date;
        if (/close/i.test(event)) result.closeDate = date;
        if (/allotment/i.test(event)) result.allotmentDate = date;
        if (/listing/i.test(event)) result.listingDate = date;
      });
  });

  return result;
}

function parseKpis($: ReturnType<typeof load>): IPOValuationDataPoint | null {
  const section = sectionByHeading($, /key performance indicators|kpis/i);

  if (!section) {
    return null;
  }

  const text = compact(section.text());
  const value = (label: string) => firstNumber(text.match(new RegExp(`${label}\\s+(-?[\\d,.]+)`, "i"))?.[1]);
  const valuation = {
    eps: value("eps"),
    patMarginPct: value("pat\\s*margin"),
    peRatio: value("pe"),
    rocePct: value("roce"),
    ronwPct: value("ronw"),
  };

  return Object.values(valuation).some((item) => item !== null) ? valuation : null;
}

function parseFinancials($: ReturnType<typeof load>, valuation: IPOValuationDataPoint | null) {
  const rows: IPOFinancialDataPoint[] = [];

  $("table").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((__, cell) => cleanCell($(cell).text()))
      .get();

    if (!/^metric$/i.test(headers[0] ?? "") || headers.length < 2) {
      return;
    }

    const metrics = new Map<string, string[]>();

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .map((___, cell) => cleanCell($(cell).text()))
          .get();

        if (cells.length > 1) {
          metrics.set(cells[0].toLowerCase(), cells.slice(1));
        }
      });

    for (let index = 1; index < headers.length; index += 1) {
      const financialYear = headers[index];

      if (!financialYear) {
        continue;
      }

      rows.push({
        debtEquity: null,
        ebitdaCr: firstNumber(metrics.get("ebitda")?.[index - 1]),
        ebitdaMarginPct: null,
        eps: index === 1 ? valuation?.eps ?? null : null,
        financialYear,
        netWorthCr: null,
        patCr: firstNumber(metrics.get("net profit")?.[index - 1] ?? metrics.get("pat")?.[index - 1]),
        patMarginPct: index === 1 ? valuation?.patMarginPct ?? null : null,
        revenueCr: firstNumber(metrics.get("revenue")?.[index - 1]),
        rocePct: index === 1 ? valuation?.rocePct ?? null : null,
        roePct: index === 1 ? valuation?.ronwPct ?? null : null,
        totalBorrowingsCr: firstNumber(metrics.get("debt")?.[index - 1] ?? metrics.get("borrowings")?.[index - 1]),
      });
    }
  });

  return rows.filter((row) => row.revenueCr !== null || row.patCr !== null || row.ebitdaCr !== null);
}

function parsePromoterHolding($: ReturnType<typeof load>) {
  const result = {
    postIssuePromoterHoldingPct: null as number | null,
    preIssuePromoterHoldingPct: null as number | null,
  };

  $("table").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((__, cell) => cleanCell($(cell).text()).toLowerCase())
      .get();

    if (!headers.some((header) => /particular|promoter/.test(header))) {
      return;
    }

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .map((___, cell) => cleanCell($(cell).text()))
          .get();

        if (/pre/i.test(cells[0] ?? "")) result.preIssuePromoterHoldingPct = firstNumber(cells[1]);
        if (/post/i.test(cells[0] ?? "")) result.postIssuePromoterHoldingPct = firstNumber(cells[1]);
      });
  });

  return result;
}

function parseObjects($: ReturnType<typeof load>) {
  const objects: IPOResearchDataPoint["objectsOfIssue"] = [];

  $("table").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((__, cell) => cleanCell($(cell).text()).toLowerCase())
      .get();

    if (!headers.some((header) => /issue object|object/.test(header))) {
      return;
    }

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .map((___, cell) => cleanCell($(cell).text()))
          .get();
        const objectName = cells[0];

        if (objectName) {
          objects.push({
            amountCr: firstNumber(cells[1]),
            objectName,
          });
        }
      });
  });

  return objects;
}

export async function fetchIPOGuruResearch(detailUrl: string): Promise<IPOResearchDataPoint | null> {
  const html = await fetchHtml(detailUrl);
  const $ = load(html);
  const bodyText = compact($("body").text());
  const title = compact($("h1").first().text());
  const ipoName = title
    .replace(/\bIPO\b.*$/i, "")
    .replace(/\bSME\b/gi, "")
    .trim();

  if (!ipoName) {
    return null;
  }

  const summary = parseSummary(sectionByHeading($, /ipo summary/i)?.text() ?? bodyText);
  const dates = parseTimetable($);
  const valuation = parseKpis($);
  const promoterHolding = parsePromoterHolding($);
  const aboutSection = sectionByHeading($, /^About\s+/i);
  const aboutHeading = aboutSection?.find("h1,h2,h3,h4").first().text() ?? "";
  const companyOverview = aboutSection
    ? compact(
        aboutSection
          .text()
          .replace(aboutHeading, "")
          .replace(/Interested in this IPO\?.*$/i, ""),
      )
    : null;
  const discovered = discoverLeadManagerMetadataFromHtml(html, {
    ipoDetailSourceUrl: detailUrl,
    ipoId: "",
    ipoName,
    sourceName: "IPO_GURU",
  });

  return {
    ...dates,
    ...summary,
    ...promoterHolding,
    businessModel: null,
    category: /\bsme\b/i.test(title) ? "sme" : "mainboard",
    companyContact: discovered.companyContact ?? null,
    companyOverview,
    detailUrl,
    financials: parseFinancials($, valuation),
    ipoName,
    objectsOfIssue: parseObjects($),
    leadManagers: discovered.leadManagers,
    marketMaker: discovered.marketMaker ?? null,
    source: SOURCE,
    sourceParsedJson: {
      dates,
      promoterHolding,
      summary,
    },
    sourceRawHtml: html,
    sourceRawText: bodyText,
    sourceUrl: detailUrl,
    registrar: discovered.registrar ?? null,
    updatedAt: new Date().toISOString(),
    valuation,
  };
}
