import type { IPOCategory, IPOListingPerformance } from "@/types/ipo";

export interface RecentIPOSeedRow extends IPOListingPerformance {
  ipo: {
    id: string;
    name: string;
    slug: string;
    listing_date: string;
    category: IPOCategory;
  };
  current_price: number | null;
  return_from_issue_pct: number | null;
  score_source: "backfilled";
  data_source: string;
}

interface RecentIPOInput {
  name: string;
  listedDate: string;
  issuePrice: number;
  listingPrice: number;
  currentPrice: number | null;
  type: "MAINBOARD" | "SME";
}

const DATA_SOURCE = "Recent IPO outcome backfill from Groww, HDFC Securities, IPOMarket and Economic Times.";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function percent(price: number | null, base: number) {
  if (price === null || base <= 0) return null;
  return ((price - base) / base) * 100;
}

function backfilledIpoLensScore(listingGainPct: number | null, currentReturnPct: number | null) {
  const signal = currentReturnPct ?? listingGainPct ?? 0;

  if ((listingGainPct ?? 0) >= 30 || signal >= 45) return 84;
  if ((listingGainPct ?? 0) >= 15 || signal >= 25) return 76;
  if ((listingGainPct ?? 0) >= 8 || signal >= 12) return 68;
  if ((listingGainPct ?? 0) >= 0) return 54;
  if ((listingGainPct ?? 0) <= -15 || signal <= -20) return 24;
  return 34;
}

function scoreValidated(score: number, listingGainPct: number | null) {
  if (listingGainPct === null) return false;
  if (score >= 70 && listingGainPct >= 10) return true;
  if (score < 40 && listingGainPct < 0) return true;
  return false;
}

function toRow(input: RecentIPOInput): RecentIPOSeedRow {
  const slug = slugify(input.name);
  const listingGainPct = percent(input.listingPrice, input.issuePrice);
  const currentReturnPct = percent(input.currentPrice, input.issuePrice);
  const score = backfilledIpoLensScore(listingGainPct, currentReturnPct);

  return {
    id: `seed-${slug}`,
    ipo_id: `seed-${slug}`,
    symbol: null,
    exchange: input.type === "MAINBOARD" ? "NSE" : "BSE",
    issue_price: input.issuePrice,
    listing_price: input.listingPrice,
    listing_gain_pct: listingGainPct,
    listing_day_high: null,
    listing_day_low: null,
    listing_day_volume: null,
    listing_day_close: null,
    price_1w: null,
    price_1m: null,
    price_3m: null,
    current_price: input.currentPrice,
    return_1w_pct: null,
    return_1m_pct: null,
    return_3m_pct: null,
    return_current_pct: currentReturnPct,
    ipo_lens_score: score,
    score_validated: scoreValidated(score, listingGainPct),
    data_updated_at: "2026-06-24T11:30:00.000Z",
    created_at: "2026-06-24T11:30:00.000Z",
    ipo: {
      id: `seed-${slug}`,
      name: input.name,
      slug,
      listing_date: input.listedDate,
      category: input.type === "MAINBOARD" ? "mainboard" : "sme",
    },
    return_from_issue_pct: currentReturnPct,
    score_source: "backfilled",
    data_source: DATA_SOURCE,
  };
}

const RECENT_IPO_INPUTS: RecentIPOInput[] = [
  { name: "Liotech Industries", listedDate: "2026-06-24", issuePrice: 321, listingPrice: 257, currentPrice: 244.15, type: "SME" },
  { name: "Clay Craft India", listedDate: "2026-06-24", issuePrice: 203, listingPrice: 211, currentPrice: 221.55, type: "SME" },
  { name: "Diksha Polymers", listedDate: "2026-06-24", issuePrice: 112, listingPrice: 114.5, currentPrice: 120.2, type: "SME" },
  { name: "Leapfrog Engineering Services", listedDate: "2026-06-24", issuePrice: 23, listingPrice: 22, currentPrice: 23.1, type: "SME" },
  { name: "Horizon Reclaim (India)", listedDate: "2026-06-19", issuePrice: 103, listingPrice: 151, currentPrice: 141.6, type: "SME" },
  { name: "Susan Electricals India", listedDate: "2026-06-18", issuePrice: 127, listingPrice: 186, currentPrice: 226.6, type: "SME" },
  { name: "Utkal Speciality Industries India", listedDate: "2026-06-17", issuePrice: 66, listingPrice: 66, currentPrice: 48.65, type: "SME" },
  { name: "Hexagon Nutrition", listedDate: "2026-06-12", issuePrice: 45, listingPrice: 48.25, currentPrice: 54.76, type: "MAINBOARD" },
  { name: "GenXAI Analytics", listedDate: "2026-06-12", issuePrice: 116, listingPrice: 92.8, currentPrice: 92.75, type: "SME" },
  { name: "UHM Vacation", listedDate: "2026-06-11", issuePrice: 166, listingPrice: 132.8, currentPrice: 88.35, type: "SME" },
  { name: "Vahh Chemicals", listedDate: "2026-06-11", issuePrice: 60, listingPrice: 70, currentPrice: 64, type: "SME" },
  { name: "CMR Green Technologies", listedDate: "2026-06-10", issuePrice: 192, listingPrice: 268, currentPrice: 258.95, type: "MAINBOARD" },
  { name: "Merritronix", listedDate: "2026-06-08", issuePrice: 149, listingPrice: 283.1, currentPrice: 456, type: "SME" },
  { name: "SMR Jewels", listedDate: "2026-06-08", issuePrice: 128, listingPrice: 102.95, currentPrice: 105, type: "SME" },
  { name: "Aureate Tradde", listedDate: "2026-06-05", issuePrice: 70, listingPrice: 70, currentPrice: 31.5, type: "SME" },
  { name: "Rajnandini Fashion India", listedDate: "2026-06-03", issuePrice: 63, listingPrice: 63, currentPrice: 47.5, type: "SME" },
  { name: "Harikanta Overseas", listedDate: "2026-06-02", issuePrice: 91, listingPrice: 79.75, currentPrice: 71.7, type: "SME" },
  { name: "Yaashvi Jewellers", listedDate: "2026-06-02", issuePrice: 83, listingPrice: 83, currentPrice: 93, type: "SME" },
  { name: "M R Maniveni Foods", listedDate: "2026-06-01", issuePrice: 52, listingPrice: 42.55, currentPrice: 37.7, type: "SME" },
  { name: "Autofurnish", listedDate: "2026-05-29", issuePrice: 41, listingPrice: 43, currentPrice: 45.4, type: "SME" },
  { name: "Q-Line Biotech", listedDate: "2026-05-29", issuePrice: 343, listingPrice: 452, currentPrice: 576.2, type: "SME" },
  { name: "Bio Medica Laboratories", listedDate: "2026-05-29", issuePrice: 139, listingPrice: 111.2, currentPrice: 143.4, type: "SME" },
  { name: "Vegorama Punjabi Angithi", listedDate: "2026-05-27", issuePrice: 77, listingPrice: 118.1, currentPrice: 129.9, type: "SME" },
  { name: "Teamtech Formwork Solutions", listedDate: "2026-05-26", issuePrice: 63, listingPrice: 75, currentPrice: 97.35, type: "SME" },
  { name: "NFP Sampoorna Foods", listedDate: "2026-05-25", issuePrice: 55, listingPrice: 54.5, currentPrice: 22.9, type: "SME" },
  { name: "Goldline Pharmaceutical", listedDate: "2026-05-19", issuePrice: 43, listingPrice: 59.75, currentPrice: 44.89, type: "SME" },
  { name: "RFBL Flexi Pack", listedDate: "2026-05-19", issuePrice: 50, listingPrice: 52.5, currentPrice: 82.05, type: "SME" },
  { name: "Simca Advertising", listedDate: "2026-05-15", issuePrice: 183, listingPrice: 156, currentPrice: 167.1, type: "SME" },
  { name: "Bagmane Prime Office REIT", listedDate: "2026-05-14", issuePrice: 100, listingPrice: 103.5, currentPrice: 102.74, type: "MAINBOARD" },
  { name: "Recode Studios", listedDate: "2026-05-12", issuePrice: 158, listingPrice: 213.1, currentPrice: 191, type: "SME" },
  { name: "Value 360 Communications", listedDate: "2026-05-11", issuePrice: 98, listingPrice: 78.4, currentPrice: 85.45, type: "SME" },
  { name: "OnEMI Technology Solutions", listedDate: "2026-05-08", issuePrice: 171, listingPrice: 190, currentPrice: 279.05, type: "MAINBOARD" },
  { name: "Amba Auto Sales and Services", listedDate: "2026-05-05", issuePrice: 135, listingPrice: 134.5, currentPrice: 83.6, type: "SME" },
  { name: "Adisoft Technologies", listedDate: "2026-04-30", issuePrice: 172, listingPrice: 205, currentPrice: 191.6, type: "SME" },
  { name: "Citius Transnet Investment Trust", listedDate: "2026-04-29", issuePrice: 100, listingPrice: 104.6, currentPrice: 106.15, type: "MAINBOARD" },
  { name: "Mehul Telecom", listedDate: "2026-04-24", issuePrice: 98, listingPrice: 108, currentPrice: 93, type: "SME" },
  { name: "Om Power Transmission", listedDate: "2026-04-17", issuePrice: 175, listingPrice: 186, currentPrice: 183.42, type: "MAINBOARD" },
  { name: "Safety Controls & Devices", listedDate: "2026-04-13", issuePrice: 80, listingPrice: 83, currentPrice: 78.99, type: "SME" },
  { name: "Emiac Technologies", listedDate: "2026-04-13", issuePrice: 98, listingPrice: 107.8, currentPrice: 100.01, type: "SME" },
  { name: "Vivid Electromech", listedDate: "2026-04-07", issuePrice: 555, listingPrice: 565, currentPrice: 1405.1, type: "SME" },
  { name: "Powerica", listedDate: "2026-04-02", issuePrice: 395, listingPrice: 375, currentPrice: 661.85, type: "MAINBOARD" },
  { name: "Sai Parenteral's", listedDate: "2026-04-02", issuePrice: 392, listingPrice: 405, currentPrice: 589.75, type: "MAINBOARD" },
  { name: "Highness Microelectronics", listedDate: "2026-04-02", issuePrice: 120, listingPrice: 125, currentPrice: 161, type: "SME" },
  { name: "Amir Chand Jagdish Kumar Exports", listedDate: "2026-04-02", issuePrice: 212, listingPrice: 195, currentPrice: 130.31, type: "MAINBOARD" },
  { name: "TIPCO Engineering India", listedDate: "2026-04-01", issuePrice: 89, listingPrice: 89.25, currentPrice: 193.7, type: "SME" },
  { name: "Speciality Medicines", listedDate: "2026-03-30", issuePrice: 124, listingPrice: 124, currentPrice: 205, type: "SME" },
  { name: "Central Mine Planning & Design Institute", listedDate: "2026-03-30", issuePrice: 172, listingPrice: 162.8, currentPrice: 258.41, type: "MAINBOARD" },
  { name: "Novus Loyalty", listedDate: "2026-03-25", issuePrice: 146, listingPrice: 146, currentPrice: 140.5, type: "SME" },
  { name: "GSP Crop Science", listedDate: "2026-03-24", issuePrice: 320, listingPrice: 332.3, currentPrice: 421.7, type: "MAINBOARD" },
  { name: "RaajMarg Infra Investment Trust", listedDate: "2026-03-24", issuePrice: 100, listingPrice: 108, currentPrice: 113.85, type: "MAINBOARD" },
];

export const RECENT_IPO_PERFORMANCE_SEED_ROWS: RecentIPOSeedRow[] = RECENT_IPO_INPUTS.map(toRow);

export function getRecentIPOSeedRows() {
  return RECENT_IPO_PERFORMANCE_SEED_ROWS;
}

export function findRecentIPOSeedPerformanceByName(ipoId: string, name: string) {
  const normalizedName = slugify(name);
  const match = RECENT_IPO_PERFORMANCE_SEED_ROWS.find((row) => {
    const rowName = slugify(row.ipo.name);
    return rowName === normalizedName || rowName.includes(normalizedName) || normalizedName.includes(rowName);
  });

  if (!match) {
    return null;
  }

  return {
    ...match,
    id: `seed-${ipoId}`,
    ipo_id: ipoId,
  };
}
