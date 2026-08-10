import type { ProviderResult, PublicDataProvider, SubscriptionDataPoint } from "@/lib/ipo-data/providers/baseProvider";
import { fetchHtml, headerIndex, parseNumber, parseTables } from "@/lib/ipo-data/providers/tableParser";

const SOURCE_URL = "https://ipowatch.in/ipo-subscription-status-today/";

function parseRows(html: string): SubscriptionDataPoint[] {
  const capturedAt = new Date().toISOString();
  const points: SubscriptionDataPoint[] = [];

  for (const table of parseTables(html)) {
    const nameIndex = headerIndex(table.headers, [/ipo|company|name/]) ?? 0;
    const qibIndex = headerIndex(table.headers, [/\bqib\b|qualified/]);
    const niiIndex = headerIndex(table.headers, [/\bnii\b|hni|non institutional|non-institutional/]);
    const retailIndex = headerIndex(table.headers, [/retail|rii|individual/]);
    const employeeIndex = headerIndex(table.headers, [/employee|emp/]);
    const shareholderIndex = headerIndex(table.headers, [/shareholder|sh/]);
    const totalIndex = headerIndex(table.headers, [/total|overall/]);

    if (qibIndex === null && niiIndex === null && retailIndex === null && totalIndex === null) {
      continue;
    }

    for (const row of table.rows) {
      const ipoName = row[nameIndex]?.replace(/\s+IPO$/i, "").trim();

      if (!ipoName || /no data|ipo name/i.test(ipoName)) {
        continue;
      }

      points.push({
        capturedAt,
        employeeTimes: employeeIndex === null ? null : parseNumber(row[employeeIndex]),
        ipoName,
        niiTimes: niiIndex === null ? null : parseNumber(row[niiIndex]),
        qibTimes: qibIndex === null ? null : parseNumber(row[qibIndex]),
        retailTimes: retailIndex === null ? null : parseNumber(row[retailIndex]),
        shareholderTimes: shareholderIndex === null ? null : parseNumber(row[shareholderIndex]),
        source: "IPOWatch",
        sourceUrl: SOURCE_URL,
        totalTimes: totalIndex === null ? null : parseNumber(row[totalIndex]),
      });
    }
  }

  return points;
}

export const ipoWatchSubscriptionProvider: PublicDataProvider<SubscriptionDataPoint> = {
  dataType: "subscription",
  name: "IPOWatch Subscription",
  sourceUrl: SOURCE_URL,
  async fetch(): Promise<ProviderResult<SubscriptionDataPoint>> {
    const html = await fetchHtml(SOURCE_URL);

    return {
      data: parseRows(html),
      provider: this.name,
      sourceUrl: SOURCE_URL,
    };
  },
};
