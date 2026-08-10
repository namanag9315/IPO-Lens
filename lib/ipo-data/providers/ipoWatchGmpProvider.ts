import type { GMPDataPoint, ProviderResult, PublicDataProvider } from "@/lib/ipo-data/providers/baseProvider";
import { parsePublicDateRange } from "@/lib/ipo-data/publicDateParser";
import { fetchHtml, headerIndex, parseNumber, parsePercent, parseTables } from "@/lib/ipo-data/providers/tableParser";

const SOURCE_URL = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";

function parseCategory(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return /sme/i.test(value) ? "sme" : "mainboard";
}

function parseRows(html: string): GMPDataPoint[] {
  const capturedAt = new Date().toISOString();
  const points: GMPDataPoint[] = [];

  for (const table of parseTables(html)) {
    const nameIndex = headerIndex(table.headers, [/ipo|company|name/]) ?? 0;
    const gmpIndex = headerIndex(table.headers, [/\bgmp\b|premium/]);
    const priceIndex = headerIndex(table.headers, [/price|issue/]);
    const listingIndex = headerIndex(table.headers, [/listing|estimate|est\./]);
    const gainIndex = headerIndex(table.headers, [/gain|%|percent/]);
    const dateIndex = headerIndex(table.headers, [/^date$/]);
    const statusIndex = headerIndex(table.headers, [/^status$/, /\bstatus\b/]);
    const typeIndex = headerIndex(table.headers, [/^type$/, /category|board/]);

    if (gmpIndex === null) {
      continue;
    }

    for (const row of table.rows) {
      const ipoName = row[nameIndex]?.replace(/\s+IPO$/i, "").trim();
      const gmp = parseNumber(row[gmpIndex]);

      if (!ipoName || /no data|ipo name/i.test(ipoName) || gmp === null) {
        continue;
      }

      const dates = parsePublicDateRange(dateIndex === null ? null : row[dateIndex]);
      const listingCell = listingIndex === null ? null : row[listingIndex];

      points.push({
        category: parseCategory(typeIndex === null ? null : row[typeIndex]),
        capturedAt,
        closeDate: dates.closeDate,
        estimatedListingPrice: parseNumber(listingCell),
        gmp,
        gmpPercent: gainIndex === null ? parsePercent(listingCell) : parsePercent(row[gainIndex]),
        ipoName,
        issuePrice: priceIndex === null ? null : parseNumber(row[priceIndex]),
        openDate: dates.openDate,
        source: "IPOWatch",
        sourceUrl: SOURCE_URL,
        status: statusIndex === null ? null : row[statusIndex] ?? null,
      });
    }
  }

  return points;
}

export const ipoWatchGmpProvider: PublicDataProvider<GMPDataPoint> = {
  dataType: "gmp",
  name: "IPOWatch GMP",
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
