/** Raw GMP object from IPO Guru API — nested under entry.gmp */
export interface IPOGuruGMPObject {
  price?: string | number | null;
  percentage?: string | number | null;
  updated_at?: string | null;
}

/** Raw subscription object from IPO Guru API — nested under entry.subscription */
export interface IPOGuruSubscriptionObject {
  qib?: string | number | null;
  nii?: string | number | null;
  retail?: string | number | null;
  total?: string | number | null;
  updated_at?: string | null;
}

/** Raw shape of one IPO entry from GET /api/v1/ipos — matches actual API response */
export interface IPOGuruIPOEntry {
  // Identity
  id?: string | number | null;
  name?: string | null;
  company_name?: string | null;
  slug?: string | null;
  status?: string | null; // "Open" | "Upcoming" | "Closed" | "Listed"

  // Category
  type?: string | null;       // "SME" | "Mainboard"
  sub_type?: string | null;   // "NSE SME" | "BSE SME" | "NSE" | "BSE"

  // Dates (ISO format from API: "2026-04-23")
  open_date?: string | null;
  close_date?: string | null;
  allotment_date?: string | null;
  refund_date?: string | null;
  credit_date?: string | null;
  listing_date?: string | null;

  // Pricing - all strings in real API
  price_band?: string | null;             // "163-172" (no rupee prefix)
  price_band_min?: number | string | null;
  price_band_max?: number | string | null;
  issue_price?: number | string | null;   // "172"
  face_value?: number | string | null;    // "10"
  listing_price?: number | string | null; // null until listed

  // Issue details
  issue_size?: number | string | null;   // "74 Cr" or "74.0"
  total_issue_size?: number | string | null;
  fresh_issue?: number | string | null;
  offer_for_sale?: number | string | null;
  lot_size?: number | string | null;     // "800"
  sale_type?: string | null;             // "Fresh capital only"

  // Exchange / listing - real API field is "listing_on"
  listing_on?: string | null;   // "NSE" - actual field name in API
  exchange?: string | null;     // alias/fallback

  // Managers - IPO Guru does NOT provide lead_manager in /ipos list
  registrar?: string | null;    // "Kfin Technologies Ltd."
  lead_manager?: string | null;
  lead_managers?: string | null;

  // GMP - NESTED OBJECT: { price, percentage, updated_at }
  gmp?: IPOGuruGMPObject | null;

  // Subscription - NESTED OBJECT: { qib, nii, retail, total, updated_at }
  subscription?: IPOGuruSubscriptionObject | null;

  // Allow any additional fields from future API updates
  [key: string]: unknown;
}

/** Envelope from GET /api/v1/ipos: { success, count, data: [...] } */
export interface IPOGuruListResponse {
  success?: boolean;
  count?: number;
  data?: IPOGuruIPOEntry[];      // real API uses "data"
  ipos?: IPOGuruIPOEntry[];      // fallback shapes
  results?: IPOGuruIPOEntry[];
  ipo_list?: IPOGuruIPOEntry[];
  items?: IPOGuruIPOEntry[];
  [key: string]: unknown;
}

/** Result of ipoGuruFetch typed for the list endpoint */
export interface IPOGuruFetchListResult {
  ok: boolean;
  entries: IPOGuruIPOEntry[];
  raw: unknown;
  error: string | null;
  durationMs: number;
}
