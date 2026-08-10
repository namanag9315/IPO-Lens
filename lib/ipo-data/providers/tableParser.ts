import axios from "axios";
import { load, type CheerioAPI } from "cheerio";
import { PUBLIC_PROVIDER_USER_AGENT } from "@/lib/ipo-data/providers/baseProvider";

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export function cleanCell(value: string) {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

export function parseNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const text = value.replace(/,/g, "").replace(/₹/g, "").replace(/x/gi, "");
  const match = text.match(/-?\d+(\.\d+)?/);

  return match ? Number(match[0]) : null;
}

export function parsePercent(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?(?=\s*%)/);

  return match ? Number(match[0]) : parseNumber(value);
}

export function headerIndex(headers: string[], patterns: RegExp[]) {
  const normalized = headers.map((header) => header.toLowerCase());
  const index = normalized.findIndex((header) => patterns.some((pattern) => pattern.test(header)));

  return index >= 0 ? index : null;
}

export async function fetchHtml(url: string) {
  const response = await axios.get<string>(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": PUBLIC_PROVIDER_USER_AGENT,
    },
    timeout: 15_000,
  });

  return response.data;
}

export function parseTables(html: string): ParsedTable[] {
  const $ = load(html);
  const tables: ParsedTable[] = [];

  $("table").each((_, table) => {
    const headers = extractHeaders($, table);
    const rows: string[][] = [];

    $(table)
      .find("tbody tr, tr")
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .map((___, cell) => cleanCell($(cell).text()))
          .get();

        if (cells.length > 1) {
          rows.push(cells);
        }
      });

    if (headers.length > 1 && rows.length > 0) {
      tables.push({ headers, rows });
    }
  });

  return tables;
}

function extractHeaders($: CheerioAPI, table: Parameters<CheerioAPI>[0]) {
  const thHeaders = $(table)
    .find("thead tr")
    .first()
    .find("th,td")
    .map((_, cell) => cleanCell($(cell).text()))
    .get();

  if (thHeaders.length > 1) {
    return thHeaders;
  }

  return $(table)
    .find("tr")
    .first()
    .find("th,td")
    .map((_, cell) => cleanCell($(cell).text()))
    .get();
}
