import * as cheerio from "cheerio";
import type { GMPRecord } from "@/lib/ipo-engine-clean/types";

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function num(value: string | undefined) {
  const parsed = Number.parseFloat((value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseInvestorGainGMP(html: string, sourceUrl: string): GMPRecord[] {
  const $ = cheerio.load(html);
  const rows: GMPRecord[] = [];
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td").map((__, td) => clean($(td).text())).get();
    if (cells.length < 2) return;
    const rawName = cells[0]?.replace(/\s+IPO$/i, "");
    const gmpValue = num(cells.find((cell) => /₹|rs|gmp|\d/.test(cell)) ?? cells[1]);
    if (!rawName || /ipo name|company/i.test(rawName) || gmpValue === null) return;
    rows.push({
      estimatedListingPrice: num(cells.find((cell) => /listing|estimate|₹|rs/i.test(cell))),
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
