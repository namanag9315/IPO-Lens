import axios from "axios";
import { load } from "cheerio";

const BSE_SUBSCRIPTION_URL = "https://www.bseindia.com/markets/publicIssues/IPOIssues.aspx?type=main";

export interface BSESubscriptionRow {
  name: string;
  qib: number;
  nii: number;
  retail: number;
  total: number;
}

function cleanCell(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseMultiple(value: string) {
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);

  return match ? Number(match[0]) : 0;
}

function findHeaderIndex(headers: string[], pattern: RegExp) {
  const index = headers.findIndex((header) => pattern.test(header));

  return index >= 0 ? index : null;
}

function rowFromCells(headers: string[], cells: string[]): BSESubscriptionRow | null {
  const nameIndex = findHeaderIndex(headers, /ipo|issue|company|name/);
  const qibIndex = findHeaderIndex(headers, /\bqib\b|qualified/);
  const niiIndex = findHeaderIndex(headers, /\bnii\b|\bhni\b|non.?institution/);
  const retailIndex = findHeaderIndex(headers, /retail|\brii\b/);
  const totalIndex = findHeaderIndex(headers, /total|overall/);
  const name = cells[nameIndex ?? 0]?.replace(/\s+IPO$/i, "").trim();

  if (!name || /no data/i.test(name)) {
    return null;
  }

  if (qibIndex !== null || niiIndex !== null || retailIndex !== null || totalIndex !== null) {
    return {
      name,
      qib: qibIndex === null ? 0 : parseMultiple(cells[qibIndex] ?? ""),
      nii: niiIndex === null ? 0 : parseMultiple(cells[niiIndex] ?? ""),
      retail: retailIndex === null ? 0 : parseMultiple(cells[retailIndex] ?? ""),
      total: totalIndex === null ? 0 : parseMultiple(cells[totalIndex] ?? ""),
    };
  }

  const numericCells = cells.slice(1).map(parseMultiple).filter((value) => value > 0);

  if (numericCells.length === 0) {
    return null;
  }

  return {
    name,
    qib: numericCells[0] ?? 0,
    nii: numericCells[1] ?? 0,
    retail: numericCells[2] ?? 0,
    total: numericCells[3] ?? numericCells.at(-1) ?? 0,
  };
}

export async function fetchSubscriptionData(): Promise<BSESubscriptionRow[]> {
  try {
    const response = await axios.get<string>(BSE_SUBSCRIPTION_URL, {
      timeout: 15000,
      headers: {
        Accept: "text/html",
        Referer: "https://www.bseindia.com/",
        "User-Agent": "IPO Lens/1.0",
      },
    });
    const $ = load(response.data);
    const rows: BSESubscriptionRow[] = [];

    $("table").each((_, table) => {
      const headers = $(table)
        .find("tr")
        .first()
        .find("th,td")
        .map((__, cell) => cleanCell($(cell).text()).toLowerCase())
        .get();

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

          const parsed = rowFromCells(headers, cells);

          if (parsed) {
            rows.push(parsed);
          }
        });
    });

    return rows;
  } catch {
    return [];
  }
}
