import * as cheerio from "cheerio";
import { fetchHtml } from "@/lib/ipo-data/providers/tableParser";
import type {
  DiscoveredCompanyContact,
  DiscoveredLeadManager,
  DiscoveredMarketMaker,
  DiscoveredRegistrar,
  DiscoveredSourceName,
  DiscoveryConfidence,
} from "@/lib/ipo-data/providers/baseProvider";
import { normalizeLeadManagerName } from "@/lib/lead-managers/normalizeLeadManagerName";

export interface LeadManagerDiscoveryInput {
  ipoDetailSourceUrl: string;
  ipoId: string;
  ipoName: string;
  sourceName: DiscoveredSourceName;
}

export interface LeadManagerDiscoveryOutput {
  companyContact?: DiscoveredCompanyContact;
  errors: string[];
  leadManagers: DiscoveredLeadManager[];
  marketMaker?: DiscoveredMarketMaker;
  registrar?: DiscoveredRegistrar;
  status: "FOUND" | "PARTIAL_FOUND" | "NOT_FOUND" | "LOW_CONFIDENCE" | "FAILED";
}

const LEAD_MANAGER_LABEL = /(lead\s*manager|lead\s*manager\(s\)|merchant\s*banker|book\s*running\s*lead\s*manager|brlm)/i;
const REGISTRAR_LABEL = /\b(registrar|registrar\s+to\s+the\s+issue)\b/i;
const MARKET_MAKER_LABEL = /\b(market\s*maker)\b/i;
const CONTACT_LABEL = /\b(address|phone|telephone|email|website)\b/i;

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(href: string | null | undefined, baseUrl: string) {
  if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) return null;

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function textWithoutLabel(text: string, label: RegExp) {
  return cleanText(text.replace(label, "").replace(/^[:\-\s]+/, ""));
}

function confidence(hasClearLabel: boolean, hasUrl: boolean, weak = false): DiscoveryConfidence {
  if (weak) return "low";
  if (hasClearLabel && hasUrl) return "high";
  if (hasClearLabel) return "medium";
  return "low";
}

function roleFromLabel(label: string) {
  if (/merchant\s*banker/i.test(label)) return "merchant_banker";
  if (/book\s*running|brlm/i.test(label)) return "book_running_lead_manager";
  return "lead_manager";
}

function uniqueManagers(managers: DiscoveredLeadManager[]) {
  const seen = new Set<string>();
  const result: DiscoveredLeadManager[] = [];

  for (const manager of managers) {
    const key = normalizeLeadManagerName(manager.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(manager);
  }

  return result;
}

function managerFromElement(
  $: cheerio.CheerioAPI,
  element: Parameters<cheerio.CheerioAPI>[0],
  input: Pick<LeadManagerDiscoveryInput, "ipoDetailSourceUrl" | "sourceName">,
  labelText: string,
  weak = false,
): DiscoveredLeadManager | null {
  const anchor = $(element).find("a[href]").first();
  const anchorText = cleanText(anchor.text());
  const href = absoluteUrl(anchor.attr("href"), input.ipoDetailSourceUrl);
  const rawText = cleanText(anchorText || textWithoutLabel($(element).text(), LEAD_MANAGER_LABEL));
  const name = rawText
    .replace(/\b(lead\s*manager\(s\)|lead\s*manager|merchant\s*banker|book\s*running\s*lead\s*manager|brlm)\b/gi, "")
    .replace(/^[:\-\s]+/, "")
    .trim();

  if (!name || name.length < 3 || /^(na|not\s+available)$/i.test(name)) {
    return null;
  }

  return {
    confidence: confidence(true, Boolean(href), weak),
    name,
    role: roleFromLabel(labelText),
    source: input.sourceName,
    sourceUrl: input.ipoDetailSourceUrl,
    url: href,
  };
}

function parseTableDiscoveries($: cheerio.CheerioAPI, input: LeadManagerDiscoveryInput) {
  const leadManagers: DiscoveredLeadManager[] = [];
  let registrar: DiscoveredRegistrar | undefined;
  let marketMaker: DiscoveredMarketMaker | undefined;
  const companyContact: DiscoveredCompanyContact = {
    address: null,
    email: null,
    phone: null,
    website: null,
  };

  $("tr").each((_, row) => {
    const cells = $(row).find("th,td").toArray();
    if (cells.length < 2) return;

    const label = cleanText($(cells[0]).text());
    const valueCell = cells[1];
    const valueText = cleanText($(valueCell).text());
    const valueAnchor = $(valueCell).find("a[href]").first();
    const href = absoluteUrl(valueAnchor.attr("href"), input.ipoDetailSourceUrl);
    const anchorText = cleanText(valueAnchor.text());

    if (LEAD_MANAGER_LABEL.test(label)) {
      const names = (anchorText || valueText).split(/\s*(?:,|\/| and )\s*/i).map(cleanText).filter(Boolean);
      for (const name of names) {
        leadManagers.push({
          confidence: confidence(true, Boolean(href)),
          name,
          role: roleFromLabel(label),
          source: input.sourceName,
          sourceUrl: input.ipoDetailSourceUrl,
          url: href,
        });
      }
    }

    if (REGISTRAR_LABEL.test(label) && valueText && !registrar) {
      registrar = {
        confidence: confidence(true, Boolean(href)),
        name: anchorText || valueText,
        source: input.sourceName,
        sourceUrl: input.ipoDetailSourceUrl,
        url: href,
      };
    }

    if (MARKET_MAKER_LABEL.test(label) && valueText && !marketMaker) {
      marketMaker = {
        confidence: "medium",
        name: anchorText || valueText,
        source: input.sourceName,
        sourceUrl: input.ipoDetailSourceUrl,
      };
    }

    if (CONTACT_LABEL.test(label)) {
      if (/email/i.test(label)) companyContact.email = anchorText || valueText || companyContact.email;
      if (/phone|telephone/i.test(label)) companyContact.phone = valueText || companyContact.phone;
      if (/website/i.test(label)) companyContact.website = href ?? valueText ?? companyContact.website;
      if (/address/i.test(label)) companyContact.address = valueText || companyContact.address;
    }
  });

  return {
    companyContact: Object.values(companyContact).some(Boolean) ? companyContact : undefined,
    leadManagers,
    marketMaker,
    registrar,
  };
}

function parseHeadingManagers($: cheerio.CheerioAPI, input: LeadManagerDiscoveryInput) {
  const managers: DiscoveredLeadManager[] = [];

  $("h1,h2,h3,h4,h5,strong,b,p,div").each((_, element) => {
    const label = cleanText($(element).text());
    if (!LEAD_MANAGER_LABEL.test(label)) return;

    const nearby = $(element)
      .nextAll()
      .slice(0, 4)
      .toArray();

    for (const candidate of nearby) {
      if (/^h[1-6]$/i.test(candidate.tagName ?? "")) break;
      const manager = managerFromElement($, candidate, input, label);
      if (manager) managers.push(manager);
    }

    const nested = managerFromElement($, element, input, label, false);
    if (nested && !LEAD_MANAGER_LABEL.test(nested.name)) managers.push(nested);
  });

  return managers;
}

function parseWeakInlineManagers($: cheerio.CheerioAPI, input: LeadManagerDiscoveryInput) {
  const bodyText = cleanText($("body").text());
  const match = bodyText.match(/(?:lead\s*manager(?:\(s\))?|merchant\s*banker|brlm)\s*:?\s*([A-Z][A-Za-z0-9&.,'() -]{4,90})(?:\s{2,}|Registrar|Market Maker|IPO|Issue|$)/i);
  if (!match?.[1]) return [];

  const name = cleanText(match[1]).replace(/[|•]+.*$/, "").trim();
  if (!name) return [];

  return [
    {
      confidence: "low" as const,
      name,
      role: "lead_manager",
      source: input.sourceName,
      sourceUrl: input.ipoDetailSourceUrl,
      url: null,
    },
  ];
}

export function discoverLeadManagerMetadataFromHtml(html: string, input: LeadManagerDiscoveryInput): LeadManagerDiscoveryOutput {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();

  const tableDiscoveries = parseTableDiscoveries($, input);
  const leadManagers = uniqueManagers([
    ...tableDiscoveries.leadManagers,
    ...parseHeadingManagers($, input),
    ...parseWeakInlineManagers($, input),
  ]);
  const status =
    leadManagers.length === 0
      ? tableDiscoveries.registrar || tableDiscoveries.marketMaker || tableDiscoveries.companyContact
        ? "PARTIAL_FOUND"
        : "NOT_FOUND"
      : leadManagers.some((manager) => manager.confidence === "low")
        ? "LOW_CONFIDENCE"
        : "FOUND";

  return {
    companyContact: tableDiscoveries.companyContact,
    errors: [],
    leadManagers,
    marketMaker: tableDiscoveries.marketMaker,
    registrar: tableDiscoveries.registrar,
    status,
  };
}

export async function discoverLeadManagerFromIPOPage(input: LeadManagerDiscoveryInput): Promise<LeadManagerDiscoveryOutput> {
  try {
    const html = await fetchHtml(input.ipoDetailSourceUrl);
    return discoverLeadManagerMetadataFromHtml(html, input);
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : "Lead manager discovery failed."],
      leadManagers: [],
      status: "FAILED",
    };
  }
}
