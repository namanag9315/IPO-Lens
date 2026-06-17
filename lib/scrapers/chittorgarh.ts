import axios from "axios";

const PARSE_BOT_URL = "https://api.parse.bot/scraper";
const SCRAPER_ID = process.env.PARSE_BOT_SCRAPER_ID || "dfde1c74-045f-48c7-aa57-718721ee66e4";
const API_KEY = process.env.PARSE_BOT_API_KEY || "pmx_593bac3a565d331f7f4a29b51a6e452e";

interface ChittorgarhSearchResult {
  id: number;
  urlrewrite_folder_name: string;
  company_name: string;
}

interface ChittorgarhDetails {
  [key: string]: string;
}

interface ChittorgarhDetailResponse {
  status: string;
  data?: {
    id: string;
    slug: string;
    url: string;
    title: string;
    details: ChittorgarhDetails;
    financials: string[][];
  };
}

interface ChittorgarhDashboardSubscription {
  id: number;
  company_name: string;
  urlrewrite_folder_name: string;
  bid_date: string;
  bid_value: number;
}

interface ChittorgarhDashboardResponse {
  status: string;
  data?: {
    IpoSubscriptionList?: ChittorgarhDashboardSubscription[];
  };
}

// Cleans an IPO name to improve matching against Chittorgarh's search engine.
export function cleanNameForSearch(name: string): string {
  return name
    .replace(/\b(Limited|Ltd|IPO|FPO|Infrastructure|Technologies|Technology|Services|Service|Industries|Industry|Enterprise|Enterprises|India|Solutions|Solution|Chemicals|Chemical|Engineering|Holdings|Holding|Group|and)\b/gi, "")
    .replace(/[^a-zA-Z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Searches for an IPO on Chittorgarh and returns the closest match's ID and slug
export async function searchChittorgarhIPO(companyName: string): Promise<ChittorgarhSearchResult | null> {
  try {
    const cleaned = cleanNameForSearch(companyName);
    if (!cleaned) return null;

    const response = await axios.get<{ status: string; data?: { results?: ChittorgarhSearchResult[] } }>(
      `${PARSE_BOT_URL}/${SCRAPER_ID}/search_ipo`,
      {
        params: { query: cleaned },
        headers: {
          "X-API-Key": API_KEY,
        },
        timeout: 10000,
      }
    );

    if (response.data?.status !== "success" || !response.data?.data?.results?.length) {
      // Fallback search with the raw name if cleaned name returned nothing, but limited to 1st few words
      const rawFirstWords = companyName.split(/\s+/).slice(0, 3).join(" ");
      const fallbackResponse = await axios.get<{ status: string; data?: { results?: ChittorgarhSearchResult[] } }>(
        `${PARSE_BOT_URL}/${SCRAPER_ID}/search_ipo`,
        {
          params: { query: rawFirstWords },
          headers: {
            "X-API-Key": API_KEY,
          },
          timeout: 10000,
        }
      );
      if (fallbackResponse.data?.status !== "success" || !fallbackResponse.data?.data?.results?.length) {
        return null;
      }
      return fallbackResponse.data.data.results[0];
    }

    return response.data.data.results[0];
  } catch (err) {
    console.error("Error searching Chittorgarh IPO:", err);
    return null;
  }
}

export interface ParsedFinancialRow {
  financial_year: string;
  revenue_cr: number | null;
  pat_cr: number | null;
  ebitda_cr: number | null;
  ebitda_margin_pct: number | null;
  pat_margin_pct: number | null;
  net_worth_cr: number | null;
  total_borrowings_cr: number | null;
  debt_equity: number | null;
  eps: number | null;
  roe_pct: number | null;
  roce_pct: number | null;
}

export interface ChittorgarhIPODetails {
  faceValue: number | null;
  lotSize: number | null;
  issueSizeCr: number | null;
  registrar: string | null;
  exchange: string | null;
  openDate: string | null;
  closeDate: string | null;
  listingDate: string | null;
  financials: ParsedFinancialRow[];
}

function parseNumber(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function fetchChittorgarhDetails(slug: string, ipoId: string | number): Promise<ChittorgarhIPODetails | null> {
  try {
    const response = await axios.get<ChittorgarhDetailResponse>(
      `${PARSE_BOT_URL}/${SCRAPER_ID}/get_ipo_detail`,
      {
        params: { slug, ipo_id: String(ipoId) },
        headers: {
          "X-API-Key": API_KEY,
        },
        timeout: 15000,
      }
    );

    if (response.data?.status !== "success" || !response.data?.data) {
      return null;
    }

    const { details, financials } = response.data.data;

    // Parse details
    const faceValue = parseNumber(details["Face Value"]);
    const lotSize = parseNumber(details["Lot Size"]);
    
    // Total issue size parsing, e.g. "52,69,200shares(agg. up to ₹54Cr)" -> 54
    let issueSizeCr: number | null = null;
    const sizeStr = details["Total Issue Size"] || details["Issue Size"] || "";
    const sizeMatch = sizeStr.match(/₹\s*(\d+(?:\.\d+)?)\s*Cr/i);
    if (sizeMatch) {
      issueSizeCr = parseFloat(sizeMatch[1]);
    } else {
      issueSizeCr = parseNumber(sizeStr);
    }

    const registrar = details["Registrar"] || null;
    
    // Exchange parsing: e.g. "BSE SME", "BSE, NSE"
    const exchange = details["Listing At"] || details["Listing on"] || null;

    // Transpose financials table
    // Row 0: Period Ended, Column 1: "31 Mar 2026", Column 2: "31 Mar 2025"
    // Row 1: Assets, Column 1: "64.88", Column 2: "26.08"
    const parsedFinancials: ParsedFinancialRow[] = [];
    if (financials && financials.length > 0) {
      const headerRow = financials.find(row => row[0] && /period|ended/i.test(row[0]));
      if (headerRow) {
        const years = headerRow.slice(1).filter(Boolean);
        
        // Initialize records
        const records: ParsedFinancialRow[] = years.map(yr => ({
          financial_year: yr.trim(),
          revenue_cr: null,
          pat_cr: null,
          ebitda_cr: null,
          ebitda_margin_pct: null,
          pat_margin_pct: null,
          net_worth_cr: null,
          total_borrowings_cr: null,
          debt_equity: null,
          eps: null,
          roe_pct: null,
          roce_pct: null,
        }));

        for (const row of financials) {
          const rowName = row[0]?.trim() || "";
          if (/period|ended/i.test(rowName) || /amount in/i.test(rowName)) {
            continue;
          }

          const isRevenue = /total income|revenue|turnover/i.test(rowName) && !/margin/i.test(rowName);
          const isPat = /profit after tax|pat|net profit/i.test(rowName) && !/margin/i.test(rowName);
          const isEbitda = /ebitda/i.test(rowName) && !/margin/i.test(rowName);
          const isNetWorth = /net worth/i.test(rowName);
          const isBorrowing = /borrowing|debt/i.test(rowName) && !/equity/i.test(rowName);
          const isDebtEquity = /debt.?equity/i.test(rowName);
          const isEps = /eps/i.test(rowName);
          const isRoe = /roe|ronw/i.test(rowName);
          const isRoce = /roce/i.test(rowName);

          for (let i = 0; i < years.length; i++) {
            const val = parseNumber(row[i + 1]);
            if (val === null) continue;

            if (isRevenue) records[i].revenue_cr = val;
            else if (isPat) records[i].pat_cr = val;
            else if (isEbitda) records[i].ebitda_cr = val;
            else if (isNetWorth) records[i].net_worth_cr = val;
            else if (isBorrowing) records[i].total_borrowings_cr = val;
            else if (isDebtEquity) records[i].debt_equity = val;
            else if (isEps) records[i].eps = val;
            else if (isRoe) records[i].roe_pct = val;
            else if (isRoce) records[i].roce_pct = val;
          }
        }

        // Apply KPIs/Ratios from details block (which correspond to the latest financial year stated in details["KPI"])
        const kpiYearStr = details["KPI"]?.trim(); // e.g. "Mar 31, 2026" or "31 Mar 2026"
        if (kpiYearStr) {
          // Find the record matching this year
          // Simple match: check if the financial_year contains the KPI year's last 4 digits (year) or similar
          const kpiYearNormalized = kpiYearStr.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
          const matchedRecord = records.find(rec => {
            const fyNorm = rec.financial_year.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
            return fyNorm === kpiYearNormalized || 
                   (fyNorm.includes("mar") && kpiYearNormalized.includes("mar") && fyNorm.slice(-4) === kpiYearNormalized.slice(-4));
          });

          if (matchedRecord) {
            if (details["ROE"]) matchedRecord.roe_pct = parseNumber(details["ROE"]);
            if (details["ROCE"]) matchedRecord.roce_pct = parseNumber(details["ROCE"]);
            if (details["Debt/Equity"]) matchedRecord.debt_equity = parseNumber(details["Debt/Equity"]);
            if (details["PAT Margin"]) matchedRecord.pat_margin_pct = parseNumber(details["PAT Margin"]);
            if (details["EBITDA Margin"]) matchedRecord.ebitda_margin_pct = parseNumber(details["EBITDA Margin"]);
            // RoNW can be ROE if ROE is not present
            if (!matchedRecord.roe_pct && details["RoNW"]) matchedRecord.roe_pct = parseNumber(details["RoNW"]);
          }
        }

        // Calculate missing margins and ratios where possible
        for (const rec of records) {
          if (rec.revenue_cr && rec.revenue_cr > 0) {
            if (rec.ebitda_cr && rec.ebitda_margin_pct === null) {
              rec.ebitda_margin_pct = parseFloat(((rec.ebitda_cr / rec.revenue_cr) * 100).toFixed(2));
            }
            if (rec.pat_cr && rec.pat_margin_pct === null) {
              rec.pat_margin_pct = parseFloat(((rec.pat_cr / rec.revenue_cr) * 100).toFixed(2));
            }
          }
          if (rec.net_worth_cr && rec.net_worth_cr > 0 && rec.total_borrowings_cr !== null && rec.debt_equity === null) {
            rec.debt_equity = parseFloat((rec.total_borrowings_cr / rec.net_worth_cr).toFixed(2));
          }
        }

        parsedFinancials.push(...records);
      }
    }

    return {
      faceValue,
      lotSize,
      issueSizeCr,
      registrar,
      exchange,
      openDate: null,
      closeDate: null,
      listingDate: null,
      financials: parsedFinancials,
    };
  } catch (err) {
    console.error("Error fetching Chittorgarh IPO details:", err);
    return null;
  }
}

// Fetches the subscription value for a given IPO name by checking the SME and Mainline dashboards
export async function fetchChittorgarhSubscription(companyName: string): Promise<number | null> {
  try {
    // We clean and normalize names for matching
    const searchSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const cleanedName = cleanNameForSearch(companyName).toLowerCase();

    // Fetch both dashboards
    const [smeResponse, mainlineResponse] = await Promise.all([
      axios.get<ChittorgarhDashboardResponse>(`${PARSE_BOT_URL}/${SCRAPER_ID}/get_ipo_dashboard`, {
        params: { type: "iposubscription", category: "sme" },
        headers: { "X-API-Key": API_KEY },
        timeout: 10000,
      }).catch(() => null),
      axios.get<ChittorgarhDashboardResponse>(`${PARSE_BOT_URL}/${SCRAPER_ID}/get_ipo_dashboard`, {
        params: { type: "iposubscription", category: "mainline" },
        headers: { "X-API-Key": API_KEY },
        timeout: 10000,
      }).catch(() => null),
    ]);

    const allSubs: ChittorgarhDashboardSubscription[] = [];
    if (smeResponse?.data?.status === "success" && smeResponse.data.data?.IpoSubscriptionList) {
      allSubs.push(...smeResponse.data.data.IpoSubscriptionList);
    }
    if (mainlineResponse?.data?.status === "success" && mainlineResponse.data.data?.IpoSubscriptionList) {
      allSubs.push(...mainlineResponse.data.data.IpoSubscriptionList);
    }

    // Attempt matching
    // 1. Precise slug match
    let match = allSubs.find(sub => sub.urlrewrite_folder_name === searchSlug);
    if (!match) {
      // 2. Contains normalized cleaned name
      match = allSubs.find(sub => {
        const subName = sub.company_name.toLowerCase();
        return subName.includes(cleanedName) || cleanedName.includes(subName.replace(/\b(ipo)\b/gi, "").trim());
      });
    }

    if (match) {
      return match.bid_value;
    }

    return null;
  } catch (err) {
    console.error("Error fetching Chittorgarh subscription:", err);
    return null;
  }
}

export interface ChittorgarhSubscriptionRow {
  name: string;
  total: number;
}

export async function fetchAllChittorgarhSubscriptions(): Promise<ChittorgarhSubscriptionRow[]> {
  try {
    const [smeResponse, mainlineResponse] = await Promise.all([
      axios.get<ChittorgarhDashboardResponse>(`${PARSE_BOT_URL}/${SCRAPER_ID}/get_ipo_dashboard`, {
        params: { type: "iposubscription", category: "sme" },
        headers: { "X-API-Key": API_KEY },
        timeout: 10000,
      }).catch(() => null),
      axios.get<ChittorgarhDashboardResponse>(`${PARSE_BOT_URL}/${SCRAPER_ID}/get_ipo_dashboard`, {
        params: { type: "iposubscription", category: "mainline" },
        headers: { "X-API-Key": API_KEY },
        timeout: 10000,
      }).catch(() => null),
    ]);

    const rows: ChittorgarhSubscriptionRow[] = [];
    const processDashboard = (res: any) => {
      if (res?.data?.status === "success" && res.data.data?.IpoSubscriptionList) {
        for (const item of res.data.data.IpoSubscriptionList) {
          if (item.company_name && item.bid_value !== null && item.bid_value !== undefined) {
            rows.push({
              name: item.company_name,
              total: item.bid_value,
            });
          }
        }
      }
    };

    processDashboard(smeResponse);
    processDashboard(mainlineResponse);
    return rows;
  } catch (err) {
    console.error("Error fetching all Chittorgarh subscriptions:", err);
    return [];
  }
}

