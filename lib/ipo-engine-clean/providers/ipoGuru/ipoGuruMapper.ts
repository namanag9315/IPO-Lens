import type { IPOGuruGMPObject, IPOGuruIPOEntry, IPOGuruSubscriptionObject } from "./ipoGuruTypes";
import type { CleanSourceRecord, FactCandidate, GMPRecord, SubscriptionRecord } from "@/lib/ipo-engine-clean/types";

export interface IPOGuruMappedEntry {
  rawName: string;
  listRecord: CleanSourceRecord;
  facts: FactCandidate[]; // Only non-null facts, all from ALLOWED_FACT_KEYS
  gmpRecord: GMPRecord | null;
  subscriptionRecord: SubscriptionRecord | null;
  ipoGuruId: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

/** Returns ISO date string (YYYY-MM-DD) or null */
export function parseGuruDate(val: unknown): string | null {
  if (typeof val !== "string" || !val.trim()) return null;
  const clean = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const dmy = clean.match(/^(\d{1,2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const dayFirst = clean.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (dayFirst) {
    const mm = MONTH_MAP[dayFirst[2].toLowerCase()];
    if (mm) return `${dayFirst[3]}-${mm}-${dayFirst[1].padStart(2, "0")}`;
  }
  const monthFirst = clean.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthFirst) {
    const mm = MONTH_MAP[monthFirst[1].toLowerCase()];
    if (mm) return `${monthFirst[3]}-${mm}-${monthFirst[2].padStart(2, "0")}`;
  }
  return null;
}

/** Returns finite number or null */
export function parseGuruNumber(val: unknown): number | null {
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val !== "string") return null;
  const cleaned = val.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Parse crore values: "74 Cr", "₹74 Cr", "74.5 Crores", plain number */
export function parseGuruIssueSizeCr(val: unknown): number | null {
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val !== "string") return null;
  const croreMatch = val.match(/(?:₹|rs\.?|inr)?\s*([\d,.]+)\s*(?:cr|crore)/i);
  if (croreMatch?.[1]) {
    const n = Number.parseFloat(croreMatch[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return parseGuruNumber(val);
}

/** Parse price band: "163-172" → { low: 163, high: 172, display: "₹163-172" } */
export function parseGuruPriceBand(entry: IPOGuruIPOEntry): {
  low: number | null;
  high: number | null;
  display: string | null;
} {
  // Try numeric fields first
  const low = parseGuruNumber(entry.price_band_min);
  const high = parseGuruNumber(entry.price_band_max);
  if (low !== null && high !== null) return { low, high, display: `₹${low}-${high}` };
  if (high !== null) return { low: null, high, display: `₹${high}` };

  // Parse price_band string: "163-172" or "₹163-172" or "163 to 172"
  const pb = entry.price_band;
  if (typeof pb === "string" && pb.trim()) {
    const nums = pb.match(/\d+(?:\.\d+)?/g)?.map(Number).filter((n) => Number.isFinite(n)) ?? [];
    if (nums.length >= 2) return { low: nums[0], high: nums[nums.length - 1], display: `₹${nums[0]}-${nums[nums.length - 1]}` };
    if (nums.length === 1) return { low: null, high: nums[0], display: `₹${nums[0]}` };
  }

  return { low: null, high: null, display: null };
}

/** Extract the nested GMP object from entry.gmp */
function resolveGMPObject(entry: IPOGuruIPOEntry): IPOGuruGMPObject | null {
  const g = entry.gmp;
  if (!g || typeof g !== "object") return null;
  return g as IPOGuruGMPObject;
}

/** Extract the nested subscription object from entry.subscription */
function resolveSubscriptionObject(entry: IPOGuruIPOEntry): IPOGuruSubscriptionObject | null {
  const s = entry.subscription;
  if (!s || typeof s !== "object") return null;
  return s as IPOGuruSubscriptionObject;
}

/** Determine issue_type: prefer explicit field, else derive from type/sub_type */
function resolveIssueType(entry: IPOGuruIPOEntry): string | null {
  if (entry.issue_type) return String(entry.issue_type);
  if (entry.type) return String(entry.type); // "SME" | "Mainboard"
  return null;
}

/** Determine listing exchange: real API uses listing_on, fallback to sub_type/exchange */
function resolveListingExchange(entry: IPOGuruIPOEntry): string | null {
  if (entry.listing_on) return String(entry.listing_on);
  if (entry.sub_type) return String(entry.sub_type); // "NSE SME"
  if (entry.exchange) return String(entry.exchange);
  return null;
}

/** Normalize category to lowercase 'mainboard' or 'sme' to satisfy check constraint */
function resolveCategory(entry: IPOGuruIPOEntry): "mainboard" | "sme" | null {
  const cat = String(entry.type ?? entry.category ?? "").toLowerCase();
  if (cat.includes("sme")) return "sme";
  if (cat.includes("mainboard")) return "mainboard";
  return null;
}

const isLikelyRegistrar = (s: string) =>
  /[a-zA-Z]/.test(s) &&
  /(rta|registrar|link intime|kfin|bigshare|mufg|cameo|skyline|maashitla|purva|karvyvy|cdsl|nsdl)/i.test(s);

// ─── Mapper ──────────────────────────────────────────────────────────────────

export function mapIPOGuruEntry(entry: IPOGuruIPOEntry): IPOGuruMappedEntry | null {
  const rawName = ((entry.name ?? entry.company_name ?? "") as string).trim();
  if (!rawName) return null;

  const ipoGuruId = entry.id != null ? String(entry.id) : null;

  const { low: priceBandLow, high: priceBandHigh, display: priceBandDisplay } = parseGuruPriceBand(entry);
  const openDate = parseGuruDate(entry.open_date);
  const closeDate = parseGuruDate(entry.close_date);
  const allotmentDate = parseGuruDate(entry.allotment_date);
  const refundDate = parseGuruDate(entry.refund_date);
  const creditDate = parseGuruDate(entry.credit_date);
  const listingDate = parseGuruDate(entry.listing_date);
  const issueSizeCr = parseGuruIssueSizeCr(entry.issue_size ?? entry.total_issue_size);
  const freshIssue = parseGuruIssueSizeCr(entry.fresh_issue);
  const offerForSale = parseGuruIssueSizeCr(entry.offer_for_sale);
  const issuePrice = parseGuruNumber(entry.issue_price);
  const lotSize = parseGuruNumber(entry.lot_size);
  const faceValue = parseGuruNumber(entry.face_value);
  const issueType = resolveIssueType(entry);
  const listingExchange = resolveListingExchange(entry);

  // Registrar — apply quality check
  const registrarRaw = entry.registrar ? String(entry.registrar).trim() : null;

  // Build facts — push only non-null, non-zero, non-empty values
  const facts: FactCandidate[] = [];

  const pushFact = (factKey: string, factValue: unknown, displayValue?: string | null) => {
    if (factValue === null || factValue === undefined || factValue === "" || factValue === 0) return;
    facts.push({ factKey, factValue, displayValue: displayValue ?? null, confidence: "high" });
  };

  // Pricing
  if (priceBandDisplay) pushFact("price_band", priceBandDisplay, priceBandDisplay);
  if (priceBandLow !== null) pushFact("price_band_low", priceBandLow, `₹${priceBandLow}`);
  if (priceBandHigh !== null) pushFact("price_band_high", priceBandHigh, `₹${priceBandHigh}`);
  if (issuePrice !== null) pushFact("issue_price", issuePrice, `₹${issuePrice}`);
  if (faceValue !== null) pushFact("face_value", faceValue, `₹${faceValue}`);

  // Issue size
  if (issueSizeCr !== null) pushFact("issue_size", issueSizeCr, `₹${issueSizeCr} Cr`);
  if (freshIssue !== null) pushFact("fresh_issue", freshIssue, `₹${freshIssue} Cr`);
  if (offerForSale !== null) pushFact("offer_for_sale", offerForSale, `₹${offerForSale} Cr`);
  if (lotSize !== null) pushFact("lot_size", lotSize, String(lotSize));
  if (entry.sale_type) pushFact("sale_type", String(entry.sale_type), String(entry.sale_type));

  // Exchange & type
  if (issueType) pushFact("issue_type", issueType, issueType);
  if (listingExchange) pushFact("listing_exchange", listingExchange, listingExchange);

  // Dates
  if (openDate) pushFact("open_date", openDate, openDate);
  if (closeDate) pushFact("close_date", closeDate, closeDate);
  if (allotmentDate) pushFact("allotment_date", allotmentDate, allotmentDate);
  if (refundDate) pushFact("refund_date", refundDate, refundDate);
  if (creditDate) pushFact("credit_of_shares_date", creditDate, creditDate);
  if (listingDate) pushFact("listing_date", listingDate, listingDate);

  // Registrar
  if (registrarRaw && isLikelyRegistrar(registrarRaw)) {
    pushFact("registrar_name", registrarRaw, registrarRaw);
  }

  // ─── Nested subscription object ───────────────────────────────────────────
  const subObj = resolveSubscriptionObject(entry);
  const subTotal = parseGuruNumber(subObj?.total);
  const subQib = parseGuruNumber(subObj?.qib);
  const subNii = parseGuruNumber(subObj?.nii);
  const subRetail = parseGuruNumber(subObj?.retail);

  if (subTotal !== null && subTotal > 0) pushFact("total_subscription", subTotal, `${subTotal}x`);
  if (subQib !== null && subQib > 0) pushFact("qib_subscription", subQib, `${subQib}x`);
  if (subNii !== null && subNii > 0) pushFact("nii_subscription", subNii, `${subNii}x`);
  if (subRetail !== null && subRetail > 0) pushFact("retail_subscription", subRetail, `${subRetail}x`);

  // ─── Nested GMP object ────────────────────────────────────────────────────
  const gmpObj = resolveGMPObject(entry);
  const gmpValue = parseGuruNumber(gmpObj?.price);
  const gmpPct = parseGuruNumber(gmpObj?.percentage);
  const estListingPrice = issuePrice !== null && gmpValue !== null ? issuePrice + gmpValue : null;

  const gmpRecord: GMPRecord | null =
    gmpValue !== null && Number.isFinite(gmpValue)
      ? {
          rawName,
          recordType: "gmp",
          sourceUrl: null,
          payload: { ipoGuruId, updatedAt: gmpObj?.updated_at ?? null },
          gmpValue,
          gmpPct: gmpPct ?? null,
          issuePrice: issuePrice ?? null,
          estimatedListingPrice: estListingPrice,
        }
      : null;

  // ─── Subscription record ──────────────────────────────────────────────────
  const subscriptionRecord: SubscriptionRecord | null =
    subTotal !== null && subTotal > 0
      ? {
          rawName,
          recordType: "subscription",
          sourceUrl: null,
          payload: { ipoGuruId, updatedAt: subObj?.updated_at ?? null },
          qibX: subQib,
          niiX: subNii,
          retailX: subRetail,
          totalX: subTotal,
        }
      : null;

  const listRecord: CleanSourceRecord = {
    rawName,
    recordType: "ipo_list",
    sourceUrl: null,
    payload: {
      ipoGuruId,
      openDate,
      closeDate,
      exchange: listingExchange,
      category: resolveCategory(entry),
      priceBandLow,
      priceBandHigh,
      issueSizeCr,
      status: entry.status ?? null,
    },
  };

  return { rawName, listRecord, facts, gmpRecord, subscriptionRecord, ipoGuruId };
}

/** Extract IPO entries — real API uses "data" envelope: { success, count, data: [...] } */
export function extractIPOGuruEntries(raw: unknown): IPOGuruIPOEntry[] {
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw)) return raw as IPOGuruIPOEntry[];

  const obj = raw as Record<string, unknown>;

  // Try envelopes in order of preference
  for (const key of ["data", "ipos", "results", "ipo_list", "items"]) {
    if (Array.isArray(obj[key])) return obj[key] as IPOGuruIPOEntry[];
  }

  return [];
}
