import axios from "axios";
import { format, isValid, parse } from "date-fns";
import type { IPOCategory, IPOStatus } from "@/types/ipo";

const IPO_GURU_URL = "https://www.ipoguru.in/api/v1/ipos";

interface IPOGuruRawRecord {
  name?: unknown;
  type?: unknown;
  sub_type?: unknown;
  price_band?: unknown;
  issue_price?: unknown;
  listing_price?: unknown;
  face_value?: unknown;
  sale_type?: unknown;
  lot_size?: unknown;
  issue_size?: unknown;
  open_date?: unknown;
  close_date?: unknown;
  allotment_date?: unknown;
  listing_date?: unknown;
  current_gmp?: unknown;
  gmp?: {
    price?: unknown;
    percentage?: unknown;
    updated_at?: unknown;
  };
  subscription?: {
    qib?: unknown;
    nii?: unknown;
    retail?: unknown;
    total?: unknown;
    updated_at?: unknown;
  };
  category?: unknown;
  status?: unknown;
  registrar?: unknown;
  listing_on?: unknown;
}

export interface IPOGuruIPO {
  slug: string;
  name: string;
  price_band_low: number | null;
  price_band_high: number | null;
  issue_price: number | null;
  listing_price: number | null;
  face_value: number | null;
  sale_type: string | null;
  lot_size: number | null;
  issue_size_cr: number | null;
  open_date: string | null;
  close_date: string | null;
  allotment_date: string | null;
  listing_date: string | null;
  current_gmp: number | null;
  subscription: {
    qib: number | null;
    nii: number | null;
    retail: number | null;
    total: number | null;
  } | null;
  category: IPOCategory;
  status: IPOStatus;
  registrar: string | null;
  exchange: string | null;
}

export interface IPOGuruGMPUpdate {
  slug: string;
  name: string;
  gmp: number;
}

export function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function recordsFromPayload(payload: unknown): IPOGuruRawRecord[] {
  if (Array.isArray(payload)) {
    return payload as IPOGuruRawRecord[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const possiblePayload = payload as {
    data?: unknown;
    ipos?: unknown;
    results?: unknown;
  };

  for (const key of ["data", "ipos", "results"] as const) {
    const value = possiblePayload[key];

    if (Array.isArray(value)) {
      return value as IPOGuruRawRecord[];
    }
  }

  return [];
}

function cleanString(value: unknown) {
  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = cleanString(value).replace(/,/g, "");
  const match = text.match(/-?\d+(\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function parseInteger(value: unknown) {
  const parsed = parseNumber(value);

  return parsed === null ? null : Math.round(parsed);
}

function parseIssueSizeCr(value: unknown) {
  return parseNumber(value);
}

function nestedNumber(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return parseInteger((value as Record<string, unknown>)[key]);
}

function parseDateValue(value: unknown) {
  const text = cleanString(value);

  if (!text || /^(-|na|n\/a|tba)$/i.test(text)) {
    return null;
  }

  const formats = ["yyyy-MM-dd", "dd MMM yyyy", "dd MMM, yyyy", "MMM dd yyyy", "dd/MM/yyyy", "dd-MM-yyyy"];

  for (const dateFormat of formats) {
    const parsed = parse(text, dateFormat, new Date());

    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  const nativeDate = new Date(text);

  return isValid(nativeDate) ? format(nativeDate, "yyyy-MM-dd") : null;
}

function parsePriceBand(value: unknown) {
  const matches = cleanString(value)
    .replace(/,/g, "")
    .match(/\d+(\.\d+)?/g);
  const prices = (matches ?? []).map(Number);

  if (prices.length >= 2) {
    return {
      price_band_low: Math.round(prices[0]),
      price_band_high: Math.round(prices[1]),
    };
  }

  if (prices.length === 1) {
    return {
      price_band_low: Math.round(prices[0]),
      price_band_high: Math.round(prices[0]),
    };
  }

  return {
    price_band_low: null,
    price_band_high: null,
  };
}

function normalizeCategory(value: unknown): IPOCategory {
  return cleanString(value).toLowerCase().includes("sme") ? "sme" : "mainboard";
}

function inferStatus(rawStatus: unknown, openDate: string | null, closeDate: string | null, listingDate: string | null): IPOStatus {
  const today = format(new Date(), "yyyy-MM-dd");

  if (listingDate && listingDate <= today) {
    return "listed";
  }

  if (closeDate && closeDate < today) {
    return "closed";
  }

  if (openDate && closeDate && openDate <= today && closeDate >= today) {
    return "open";
  }

  if (openDate && openDate > today) {
    return "upcoming";
  }

  const status = cleanString(rawStatus).toLowerCase();
  if (["upcoming", "open", "closed", "listed"].includes(status)) {
    return status as IPOStatus;
  }

  return "upcoming";
}

function normalizeIPO(record: IPOGuruRawRecord): IPOGuruIPO | null {
  const name = cleanString(record.name);

  if (!name) {
    return null;
  }

  const openDate = parseDateValue(record.open_date);
  const closeDate = parseDateValue(record.close_date);
  const allotmentDate = parseDateValue(record.allotment_date);
  const listingDate = parseDateValue(record.listing_date);
  const priceBand = parsePriceBand(record.price_band);

  return {
    slug: slugify(name),
    name,
    ...priceBand,
    issue_price: parseNumber(record.issue_price),
    listing_price: parseNumber(record.listing_price),
    face_value: parseNumber(record.face_value),
    sale_type: cleanString(record.sale_type) || null,
    lot_size: parseInteger(record.lot_size),
    issue_size_cr: parseIssueSizeCr(record.issue_size),
    open_date: openDate,
    close_date: closeDate,
    allotment_date: allotmentDate,
    listing_date: listingDate,
    current_gmp: parseInteger(record.gmp?.price) ?? parseInteger(record.current_gmp),
    subscription: record.subscription
      ? {
          qib: parseNumber(record.subscription.qib),
          nii: parseNumber(record.subscription.nii),
          retail: parseNumber(record.subscription.retail),
          total: parseNumber(record.subscription.total),
        }
      : null,
    category: normalizeCategory(record.type ?? record.category),
    status: inferStatus(record.status, openDate, closeDate, listingDate),
    registrar: cleanString(record.registrar) || null,
    exchange: cleanString(record.listing_on) || cleanString(record.sub_type) || null,
  };
}

export async function fetchAllIPOs(): Promise<IPOGuruIPO[]> {
  try {
    const response = await axios.get<unknown>(IPO_GURU_URL, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        ...(process.env.IPO_GURU_API_KEY ? { "X-API-KEY": process.env.IPO_GURU_API_KEY } : {}),
        "User-Agent": "IPO Lens/1.0",
      },
    });

    if (typeof response.data === "string") {
      try {
        const parsed = JSON.parse(response.data);
        return recordsFromPayload(parsed).map(normalizeIPO).filter((ipo): ipo is IPOGuruIPO => ipo !== null);
      } catch {
        return [];
      }
    }

    return recordsFromPayload(response.data).map(normalizeIPO).filter((ipo): ipo is IPOGuruIPO => ipo !== null);
  } catch {
    return [];
  }
}

export async function fetchGMPUpdates(): Promise<IPOGuruGMPUpdate[]> {
  try {
    const ipos = await fetchAllIPOs();

    return ipos
      .filter((ipo) => ipo.current_gmp !== null)
      .map((ipo) => ({
        slug: ipo.slug,
        name: ipo.name,
        gmp: ipo.current_gmp as number,
      }));
  } catch {
    return [];
  }
}
