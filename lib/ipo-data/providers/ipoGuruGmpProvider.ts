import { load } from "cheerio";
import type { GMPDataPoint, ProviderResult, PublicDataProvider } from "@/lib/ipo-data/providers/baseProvider";
import { parsePublicDateRange } from "@/lib/ipo-data/publicDateParser";
import { cleanCell, fetchHtml, headerIndex, parseNumber, parsePercent } from "@/lib/ipo-data/providers/tableParser";

const SOURCE_URL = "https://www.ipoguru.in/live-ipo-gmp";

function absoluteUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  return new URL(value, SOURCE_URL).toString();
}

function parseCategory(value: string) {
  return /\bsme\b/i.test(value) ? "sme" : "mainboard";
}

function cleanIPOName(value: string) {
  return value
    .replace(/\b(Mainboard|SME)\b/gi, " ")
    .replace(/\b\d{1,2}\s+[A-Za-z]+\s*-\s*\d{1,2}\s+[A-Za-z]+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRows(html: string): GMPDataPoint[] {
  const $ = load(html);
  const capturedAt = new Date().toISOString();
  const points: GMPDataPoint[] = [];

  $("table").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((__, cell) => cleanCell($(cell).text()))
      .get();
    const nameIndex = headerIndex(headers, [/company|ipo|name/]) ?? 0;
    const priceIndex = headerIndex(headers, [/issue\s*price|price/]);
    const gmpIndex = headerIndex(headers, [/ipo\s*gmp|\bgmp\b/]);
    const gmpPercentIndex = headerIndex(headers, [/gmp\s*%|%/]);

    if (gmpIndex === null) {
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

        if (cells.length < 3) {
          return;
        }

        const companyCell = cells[nameIndex] ?? "";
        const nameLink = $(row).find("td").eq(nameIndex).find("a[href*='/ipo/']").first();
        const detailUrl = absoluteUrl(nameLink.attr("href"));
        const ipoName = cleanIPOName(cleanCell(nameLink.text()) || companyCell);
        const gmp = parseNumber(cells[gmpIndex]);

        if (!ipoName || gmp === null) {
          return;
        }

        const dateMatch = companyCell.match(/\d{1,2}\s+[A-Za-z]+\s*-\s*\d{1,2}\s+[A-Za-z]+/);
        const dates = parsePublicDateRange(dateMatch?.[0] ?? null);
        const issuePrice = priceIndex === null ? null : parseNumber(cells[priceIndex]);
        const gmpPercent = gmpPercentIndex === null ? parsePercent(cells[gmpIndex]) : parsePercent(cells[gmpPercentIndex]);

        points.push({
          category: parseCategory(companyCell),
          capturedAt,
          closeDate: dates.closeDate,
          detailUrl,
          estimatedListingPrice: issuePrice !== null ? issuePrice + gmp : null,
          gmp,
          gmpPercent,
          ipoName,
          issuePrice,
          openDate: dates.openDate,
          source: "IPO Guru",
          sourceUrl: detailUrl ?? SOURCE_URL,
          status: "open",
        });
      });
  });

  return points;
}

export const ipoGuruGmpProvider: PublicDataProvider<GMPDataPoint> = {
  dataType: "gmp",
  name: "IPO Guru GMP",
  sourceUrl: SOURCE_URL,
  async fetch(): Promise<ProviderResult<GMPDataPoint>> {
    const html = await fetchHtml(SOURCE_URL);

    return {
      data: parseRows(html),
      provider: this.name,
      sourceUrl: SOURCE_URL,
    };
  },
};
