import axios from "axios";
import { load } from "cheerio";

const INVESTORGAIN_GMP_URL = "https://www.investorgain.com/report/live-ipo-gmp/331/";

function cleanCell(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseGMP(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+/);

  return match ? Number(match[0]) : null;
}

function headerIndex(headers: string[], pattern: RegExp) {
  const index = headers.findIndex((header) => pattern.test(header));

  return index >= 0 ? index : null;
}

export async function scrapeBackupGMP(): Promise<{ name: string; gmp: number }[]> {
  try {
    const response = await axios.get<string>(INVESTORGAIN_GMP_URL, {
      timeout: 15000,
      headers: {
        Accept: "text/html",
        "User-Agent": "IPO Lens/1.0",
      },
    });
    const $ = load(response.data);
    const rows: { name: string; gmp: number }[] = [];

    $("table").each((_, table) => {
      const headers = $(table)
        .find("tr")
        .first()
        .find("th,td")
        .map((__, cell) => cleanCell($(cell).text()).toLowerCase())
        .get();
      const nameIndex = headerIndex(headers, /ipo|name|company/);
      const gmpIndex = headerIndex(headers, /\bgmp\b|premium/);

      $(table)
        .find("tr")
        .each((__, row) => {
          const cells = $(row)
            .find("td")
            .map((___, cell) => cleanCell($(cell).text()))
            .get();

          if (cells.length < 2) {
            return;
          }

          const name = cells[nameIndex ?? 0]?.replace(/\s+IPO$/i, "").trim();
          const gmpCell =
            gmpIndex !== null
              ? cells[gmpIndex]
              : cells.slice(1).find((cell) => parseGMP(cell) !== null);
          const gmp = parseGMP(gmpCell ?? "");

          if (!name || /no data/i.test(name) || gmp === null) {
            return;
          }

          rows.push({ name, gmp });
        });
    });

    return rows;
  } catch {
    return [];
  }
}
