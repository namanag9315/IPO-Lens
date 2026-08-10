import type { GMPDataPoint, ProviderResult, PublicDataProvider } from "@/lib/ipo-data/providers/baseProvider";
import { fetchHtml, headerIndex, parseNumber, parsePercent, parseTables } from "@/lib/ipo-data/providers/tableParser";

const SOURCE_URL = "https://www.investorgain.com/report/ipo-gmp-live/331/";

function parseRows(html: string): GMPDataPoint[] {
  const capturedAt = new Date().toISOString();
  const points: GMPDataPoint[] = [];

  for (const table of parseTables(html)) {
    const nameIndex = headerIndex(table.headers, [/ipo|company|name/]) ?? 0;
    const gmpIndex = headerIndex(table.headers, [/\bgmp\b|premium/]);
    const priceIndex = headerIndex(table.headers, [/price|issue/]);
    const listingIndex = headerIndex(table.headers, [/listing|estimate|est\./]);
    const statusIndex = headerIndex(table.headers, [/^status$/, /\bstatus\b/]);
    const gainIndex = headerIndex(table.headers, [/gain|%|percent/]);

    if (gmpIndex === null) {
      continue;
    }

    for (const row of table.rows) {
      const ipoName = row[nameIndex]?.replace(/\s+IPO$/i, "").trim();
      const gmp = parseNumber(row[gmpIndex]);

      if (!ipoName || /no data|issuer company/i.test(ipoName) || gmp === null) {
        continue;
      }

      points.push({
        capturedAt,
        estimatedListingPrice: listingIndex === null ? null : parseNumber(row[listingIndex]),
        gmp,
        gmpPercent: gainIndex === null ? null : parsePercent(row[gainIndex]),
        ipoName,
        issuePrice: priceIndex === null ? null : parseNumber(row[priceIndex]),
        source: "InvestorGain",
        sourceUrl: SOURCE_URL,
        status: statusIndex === null ? null : row[statusIndex] ?? null,
      });
    }
  }

  return points;
}

export const investorGainGmpProvider: PublicDataProvider<GMPDataPoint> = {
  dataType: "gmp",
  name: "InvestorGain GMP",
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
