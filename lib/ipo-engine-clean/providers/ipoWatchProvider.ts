import * as cheerio from "cheerio";
import type { GMPRecord, SubscriptionRecord } from "@/lib/ipo-engine-clean/types";

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function num(value: string | undefined) {
  const parsed = Number.parseFloat((value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseIPOWatchGMP(html: string, sourceUrl: string): GMPRecord[] {
  const $ = cheerio.load(html);
  const rows: GMPRecord[] = [];
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td").map((__, td) => clean($(td).text())).get();
    if (cells.length < 2) return;
    const rawName = cells[0]?.replace(/\s+IPO$/i, "");
    const gmpValue = num(cells[1]);
    if (!rawName || /ipo name|company/i.test(rawName) || gmpValue === null) return;
    rows.push({
      estimatedListingPrice: num(cells[4]),
      gmpPct: num(cells.find((cell) => /%/.test(cell))),
      gmpValue,
      payload: { cells },
      rawName,
      recordType: "gmp",
      sourceUrl,
    });
  });
  return rows;
}

export function parseIPOWatchSubscription(html: string, sourceUrl: string): SubscriptionRecord[] {
  const $ = cheerio.load(html);
  const records: SubscriptionRecord[] = [];
  $("table").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((__, cell) => clean($(cell).text()).toLowerCase())
      .get();
    const headerText = headers.join(" ");
    const looksLikeSubscriptionTable = /(subscription|qib|nii|hni|retail|individual|total)/i.test(headerText);
    if (!looksLikeSubscriptionTable) return;

    const indexFor = (pattern: RegExp) => headers.findIndex((header) => pattern.test(header));

    $(table)
      .find("tr")
      .each((__, tr) => {
    const cells = $(tr).find("td").map((___, td) => clean($(td).text())).get();
    if (cells.length < 5) return;
    const rawName = cells[0]?.replace(/\s+IPO$/i, "");
    if (!rawName || /ipo name|company/i.test(rawName)) return;

    const values = cells.map(num);
    const qibX = indexFor(/\bqib\b/) >= 0 ? values[indexFor(/\bqib\b/)] ?? null : null;
    const niiX = indexFor(/\bnii\b|\bhni\b/) >= 0 ? values[indexFor(/\bnii\b|\bhni\b/)] ?? null : null;
    const retailX = indexFor(/retail|individual|rii/) >= 0 ? values[indexFor(/retail|individual|rii/)] ?? null : null;
    const totalX = indexFor(/total/) >= 0 ? values[indexFor(/total/)] ?? null : null;
    if (totalX === null && retailX === null) return;
    if ((totalX ?? 0) > 1000 || (retailX ?? 0) > 1000) return;
    records.push({
      niiX,
      payload: { cells },
      qibX,
      rawName,
      recordType: "subscription",
      retailX,
      sourceUrl,
      totalX,
    });
  });
  });
  return records;
}
