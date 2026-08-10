import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import type { CleanProvider } from "@/lib/ipo-engine-clean/types";

type IPOForDetailUrl = {
  category?: string | null;
  id: string;
  name: string;
  slug?: string | null;
};

type SourceRecordForDetailUrl = {
  matched_ipo_id?: string | null;
  provider?: string | null;
  raw_name?: string | null;
  record_type?: string | null;
  source_type?: string | null;
  source_url?: string | null;
};

type SourceLinkForDetailUrl = {
  fact_key?: string | null;
  fact_value?: unknown;
  source_provider?: string | null;
  source_url?: string | null;
};

function isChittorgarhUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\/(?:www\.)?chittorgarh\.com\//i.test(value));
}

function isAllowedDetailUrl(provider: CleanProvider, value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (provider === "CHITTORGARH") return /(^|\.)chittorgarh\.com$/i.test(url.hostname);
    if (provider === "IPOPLATFORM") return /(^|\.)ipoplatform\.com$/i.test(url.hostname);
    if (provider === "FINOLOGY_TICKER") return /(^|\.)ticker\.finology\.in$/i.test(url.hostname);
    if (provider === "IPOWATCH") return /(^|\.)ipowatch\.in$/i.test(url.hostname);
    if (provider === "INVESTORGAIN") return /(^|\.)investorgain\.com$/i.test(url.hostname);
    return false;
  } catch {
    return false;
  }
}

function detailUrlFactKey(provider: CleanProvider) {
  if (provider === "CHITTORGARH") return "chittorgarh_detail_url";
  if (provider === "IPOPLATFORM") return "ipoplatform_detail_url";
  if (provider === "FINOLOGY_TICKER") return "finology_ticker_detail_url";
  if (provider === "IPOWATCH") return "ipowatch_detail_url";
  if (provider === "INVESTORGAIN") return "investorgain_detail_url";
  return "detail_url";
}

function sourceUrlFromFact(provider: CleanProvider, value: unknown) {
  if (typeof value === "string" && isAllowedDetailUrl(provider, value)) return value;
  if (value && typeof value === "object") {
    const url = (value as Record<string, unknown>).url;
    if (typeof url === "string" && isAllowedDetailUrl(provider, url)) return url;
  }
  return null;
}

export function getIPOWatchReviewUrl(ipoSlug: string): string | null {
  if (!ipoSlug) return null;
  const slug = ipoSlug.toLowerCase()
    .replace(/\b(?:india|limited|ltd)\b/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://ipowatch.in/${slug}-ipo-review/`;
}

function safeFinologyUrl(ipo: IPOForDetailUrl) {
  if (!ipo.slug) return null;
  const category = ipo.category?.toLowerCase();
  if (category === "sme") return `https://ticker.finology.in/ipo/sme/${ipo.slug}`;
  if (category === "mainboard" || category === "main") return `https://ticker.finology.in/ipo/mainboard/${ipo.slug}`;
  return null;
}

export function resolveDetailUrlClean({
  ipo,
  provider,
  sourceLinks = [],
  sourceRecords = [],
}: {
  ipo: IPOForDetailUrl;
  provider: CleanProvider;
  sourceLinks?: SourceLinkForDetailUrl[];
  sourceRecords?: SourceRecordForDetailUrl[];
}) {
  const normalizedIPO = normalizeIPONameClean(ipo.name);
  const factKey = detailUrlFactKey(provider);
  const usableRecords = sourceRecords.filter((record) => {
    if (!isAllowedDetailUrl(provider, record.source_url)) return false;
    if (record.provider && record.provider !== provider) return false;
    return true;
  });

  const directDetail = usableRecords.find((record) => record.matched_ipo_id === ipo.id && record.record_type === "detail");
  if (directDetail?.source_url) {
    return { source: "matched_detail_record", url: directDetail.source_url, warning: null };
  }

  const matchedList = usableRecords.find((record) => record.matched_ipo_id === ipo.id && record.record_type === "ipo_list");
  if (matchedList?.source_url) {
    return { source: "matched_ipo_list_record", url: matchedList.source_url, warning: null };
  }

  const adminOverride = sourceLinks.find((link) => link.fact_key === factKey);
  const overrideUrl = sourceUrlFromFact(provider, adminOverride?.fact_value) ?? (isAllowedDetailUrl(provider, adminOverride?.source_url) ? adminOverride?.source_url ?? null : null);
  if (overrideUrl) {
    return { source: "admin_override_fact", url: overrideUrl, warning: null };
  }

  const matchingRawName = usableRecords.find((record) => normalizeIPONameClean(record.raw_name) === normalizedIPO);
  if (matchingRawName?.source_url) {
    return { source: "raw_name_match", url: matchingRawName.source_url, warning: null };
  }

  if (provider === "FINOLOGY_TICKER") {
    const url = safeFinologyUrl(ipo);
    if (url) return { source: "safe_finology_slug", url, warning: null };
  }

  if (provider === "IPOWATCH") {
    const url = getIPOWatchReviewUrl(ipo.slug ?? "");
    if (url) return { source: "safe_ipowatch_slug", url, warning: null };
  }

  return {
    source: "not_found",
    url: null,
    warning:
      provider === "CHITTORGARH"
        ? "No Chittorgarh detail URL available. Run Chittorgarh IPO list sync first or add source URL manually."
        : `no_source_url_for_provider:${provider}`,
  };
}

export function resolveChittorgarhDetailUrl({
  ipo,
  sourceLinks = [],
  sourceRecords = [],
}: {
  ipo: IPOForDetailUrl;
  sourceLinks?: SourceLinkForDetailUrl[];
  sourceRecords?: SourceRecordForDetailUrl[];
}) {
  return resolveDetailUrlClean({ ipo, provider: "CHITTORGARH", sourceLinks, sourceRecords });
}

export { detailUrlFactKey, isAllowedDetailUrl };
