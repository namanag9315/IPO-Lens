import * as cheerio from "cheerio";
import type { LeadManagerProvider } from "@/lib/lead-managers/providers/baseLeadManagerProvider";
import type { LeadManagerHistoryInput, LeadManagerImportResult, LeadManagerProfileInput } from "@/lib/lead-managers/types";
import { leadManagerSlug } from "@/lib/lead-managers/normalizeLeadManagerName";

const SOURCE_NAME = "IPO Premium public reference";
const BASE_URL = "https://www.ipopremium.in";

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9%]+/g, " ");
}

function parseNumber(value: string | null | undefined) {
  const cleaned = cleanText(value).replace(/[₹,%xX,+]/g, "").replace(/,/g, "");
  if (!cleaned || /^na$/i.test(cleaned)) return null;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text || /^na$/i.test(text)) return null;

  const normalized = text.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const match = normalized.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (!match) return null;
  const [, day, month, rawYear] = match;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function fieldValueByLabel($: cheerio.CheerioAPI, label: string) {
  const pattern = new RegExp(`${label}\\s*:?\\s*([^\\n\\r]+)`, "i");
  const bodyText = $("body").text().replace(/\t/g, " ");
  const match = bodyText.match(pattern);
  return cleanText(match?.[1]);
}

function findProfile($: cheerio.CheerioAPI, sourceUrl: string): LeadManagerProfileInput | null {
  const title =
    cleanText($("h1").first().text()) ||
    cleanText($("title").text())
      .replace(/\s*[-|].*$/, "")
      .replace(/\bIPO\s+Lead\s+Manager\b/gi, "")
      .trim();

  if (!title) return null;

  const website =
    $("a[href^='http']")
      .toArray()
      .map((node) => $(node).attr("href") ?? "")
      .find((href) => !href.includes("ipopremium") && !href.includes("facebook") && !href.includes("twitter")) ?? null;
  const email = $("a[href^='mailto:']").first().attr("href")?.replace(/^mailto:/i, "") ?? fieldValueByLabel($, "Email") ?? null;
  const phone = fieldValueByLabel($, "Phone") || fieldValueByLabel($, "Contact") || null;
  const address = fieldValueByLabel($, "Address") || null;
  const description =
    cleanText($("article p, .entry-content p, main p").first().text()) ||
    "Profile imported from a public reference source. Add an IPO Lens-written description after verification.";

  return {
    address,
    dataConfidence: "medium",
    description,
    email,
    name: title.replace(/\bIPO\s+Lead\s+Manager\b/gi, "").trim(),
    phone,
    sebiRegistrationNo: fieldValueByLabel($, "SEBI") || null,
    slug: leadManagerSlug(title),
    source: SOURCE_NAME,
    sourceUrl,
    type: "merchant_banker",
    website,
  };
}

function valueFor(row: Record<string, string>, candidates: string[]) {
  const entry = Object.entries(row).find(([header]) => candidates.some((candidate) => header.includes(candidate)));
  return cleanText(entry?.[1]);
}

function htmlText(fragment: string) {
  return cleanText(cheerio.load(fragment).text());
}

function firstHref(fragment: string) {
  const href = cheerio.load(fragment)("a[href]").first().attr("href");
  if (!href) return null;
  return new URL(href, BASE_URL).toString();
}

function directoryParams(limit: number) {
  return new URLSearchParams({
    "columns[0][data]": "name",
    "columns[0][name]": "",
    "columns[0][orderable]": "true",
    "columns[0][search][regex]": "false",
    "columns[0][search][value]": "",
    "columns[0][searchable]": "true",
    "columns[1][data]": "ipos_count",
    "columns[1][name]": "",
    "columns[1][orderable]": "true",
    "columns[1][search][regex]": "false",
    "columns[1][search][value]": "",
    "columns[1][searchable]": "false",
    draw: "1",
    length: String(Math.min(Math.max(limit, 1), 50)),
    "order[0][column]": "1",
    "order[0][dir]": "desc",
    "search[regex]": "false",
    "search[value]": "",
    start: "0",
  });
}

export interface IPOPremiumLeadManagerDirectoryEntry {
  iposCount: number | null;
  name: string;
  sourceUrl: string;
}

export async function fetchIPOPremiumLeadManagerDirectory(limit = 25): Promise<IPOPremiumLeadManagerDirectoryEntry[]> {
  const url = `${BASE_URL}/view/lead-manager/datatable?${directoryParams(limit)}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json,text/javascript,*/*;q=0.01",
      referer: `${BASE_URL}/view/lead-manager`,
      "user-agent": "IPO Lens research app (+https://ipo-lens.local) public-source importer",
      "x-requested-with": "XMLHttpRequest",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`IPO Premium lead manager directory returned HTTP ${response.status}.`);
  }

  const json = await response.json() as { data?: Array<{ ipos_count?: number | string | null; name?: string | null }> };
  return (json.data ?? [])
    .map((row) => {
      const sourceUrl = row.name ? firstHref(row.name) : null;
      const name = htmlText(row.name ?? "");
      return {
        iposCount: parseNumber(String(row.ipos_count ?? "")),
        name,
        sourceUrl,
      };
    })
    .filter((row): row is IPOPremiumLeadManagerDirectoryEntry => Boolean(row.name && row.sourceUrl));
}

function parseHistory($: cheerio.CheerioAPI, sourceUrl: string): LeadManagerHistoryInput[] {
  const history: LeadManagerHistoryInput[] = [];

  $("table").each((_, table) => {
    const headers = $(table)
      .find("thead th, tr:first-child th, tr:first-child td")
      .toArray()
      .map((cell) => normalizeHeader($(cell).text()));

    if (!headers.some((header) => header.includes("ipo") || header.includes("company"))) return;
    if (!headers.some((header) => header.includes("gain") || header.includes("listing"))) return;

    $(table)
      .find("tbody tr, tr")
      .slice(headers.length ? 1 : 0)
      .each((__, tr) => {
        const cells = $(tr)
          .find("td")
          .toArray()
          .map((cell) => cleanText($(cell).text()));

        if (cells.length < 2) return;

        const row = headers.reduce<Record<string, string>>((acc, header, index) => {
          acc[header] = cells[index] ?? "";
          return acc;
        }, {});
        const ipoName = valueFor(row, ["ipo name", "company", "ipo"]);
        if (!ipoName || /^ipo$/i.test(ipoName)) return;

        const issuePrice = parseNumber(valueFor(row, ["issue price", "price"]));
        const listingPrice = parseNumber(valueFor(row, ["listing price", "list price"]));
        const explicitGainPercent = parseNumber(valueFor(row, ["%", "gain percent", "listing gain percent"]));
        const explicitGainAmount = parseNumber(valueFor(row, ["gain loss amount", "gain loss"]));
        const listingGainPercent =
          explicitGainPercent !== null
            ? explicitGainPercent
            : issuePrice && listingPrice
              ? Number(((listingPrice - issuePrice) / issuePrice * 100).toFixed(2))
              : null;

        history.push({
          dataConfidence: "medium",
          exchange: valueFor(row, ["exchange"]) || null,
          ipoName,
          ipoSlug: ipoName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          ipoType: valueFor(row, ["type"]) || "SME",
          issueDate: parseDate(valueFor(row, ["issue open", "issue date", "open date", "date"])),
          issuePrice,
          listingDate: parseDate(valueFor(row, ["listing date"])),
          listingGainAmount: explicitGainAmount ?? (issuePrice && listingPrice ? Number((listingPrice - issuePrice).toFixed(2)) : null),
          listingGainPercent,
          listingPrice,
          lotSize: parseNumber(valueFor(row, ["lot size", "lot"])),
          priceBand: valueFor(row, ["price band", "price"]) || null,
          source: SOURCE_NAME,
          sourceUrl,
        });
      });
  });

  return history;
}

function validateSourceUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https source URLs are allowed.");
  }
  return url;
}

export const ipoPremiumLeadManagerProvider: LeadManagerProvider = {
  key: "IPO_PREMIUM",
  name: "IPO Premium lead manager public page",
  async fetch({ sourceUrl }) {
    const errors: string[] = [];

    try {
      const url = validateSourceUrl(sourceUrl);
      const response = await fetch(url, {
        headers: {
          "user-agent": "IPO Lens research app (+https://ipo-lens.local) public-source importer",
        },
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        throw new Error(`Source returned HTTP ${response.status}.`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      $("script, style, noscript").remove();

      const profile = findProfile($, sourceUrl);
      const history = parseHistory($, sourceUrl);

      if (!profile) errors.push("Lead manager name could not be parsed.");
      if (history.length === 0) errors.push("Past IPO table could not be parsed. Lead manager source structure may have changed.");

      return {
        errors,
        history,
        profile,
        recordsFound: history.length,
        status: profile && history.length ? "SUCCESS" : profile || history.length ? "PARTIAL_SUCCESS" : "FAILED",
      } satisfies LeadManagerImportResult;
    } catch (error) {
      return {
        errors: [error instanceof Error ? error.message : "Lead manager source structure may have changed."],
        history: [],
        profile: null,
        recordsFound: 0,
        status: "FAILED",
      };
    }
  },
};
