
import { unstable_cache } from "next/cache";
import { estimateListingGainPct } from "@/lib/scoring";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type {
  AIAnalysis,
  ComputedIPO,
  GMPHistory,
  IPO,
  IPOAnchorInvestor,
  IPOAnchorSummary,
  IPOCompanyProfile,
  IPOFinancialYearly,
  IPOObjectOfIssue,
  IPOPeerComparison,
  ListingPerformance,
  SubscriptionData,
} from "@/types/ipo";

export interface TickerItem {
  name: string;
  gmp: number;
  gmpPct: number;
  trend: "up" | "down" | "flat";
}

export interface PerformanceRow extends ListingPerformance {
  ipo: IPO | null;
  ai_analysis: AIAnalysis | null;
  current_price?: number | null;
  current_gain_pct?: number | null;
  post_listing_return_pct?: number | null;
  ticker?: string | null;
}

function sortByNewest<T extends { captured_at?: string; generated_at?: string; recorded_at?: string }>(items: T[]) {
  return items.slice().sort((a, b) => {
    const left = a.captured_at ?? a.generated_at ?? a.recorded_at ?? "";
    const right = b.captured_at ?? b.generated_at ?? b.recorded_at ?? "";

    return right.localeCompare(left);
  });
}

function buildComputedIPO(
  ipo: IPO,
  gmpHistory: GMPHistory[],
  subscriptionData: SubscriptionData[],
  aiAnalysis: AIAnalysis[],
  listingPerformance: ListingPerformance[],
  research?: {
    companyProfile?: IPOCompanyProfile | null;
    financialsYearly?: IPOFinancialYearly[];
    anchorInvestors?: IPOAnchorInvestor[];
    anchorSummary?: IPOAnchorSummary | null;
    peerComparisons?: IPOPeerComparison[];
    objectsOfIssue?: IPOObjectOfIssue[];
  },
): ComputedIPO {
  const sortedGMP = sortByNewest(gmpHistory);
  const sortedSubscription = sortByNewest(subscriptionData);
  const sortedAnalysis = sortByNewest(aiAnalysis);
  const sortedPerformance = sortByNewest(listingPerformance);
  const latestGMP = sortedGMP[0]?.gmp_value ?? null;
  const latestSubscription = sortedSubscription[0] ?? null;

  // Dynamically compute the correct status based on current date in IST (Asia/Kolkata)
  let status = ipo.status;
  const today = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const todayStr = formatter.format(today); // e.g. "2026-06-23"

  if (ipo.listing_date && ipo.listing_date <= todayStr) {
    status = "listed";
  } else if (ipo.close_date && ipo.close_date < todayStr) {
    status = "closed";
  } else if (ipo.open_date && ipo.close_date && ipo.open_date <= todayStr && ipo.close_date >= todayStr) {
    status = "open";
  } else if (ipo.open_date && ipo.open_date > todayStr) {
    status = "upcoming";
  }

  return {
    ...ipo,
    status: status as any,
    gmp_history: sortedGMP,
    subscription_data: sortedSubscription,
    ai_analysis: sortedAnalysis[0] ?? null,
    listing_performance: sortedPerformance[0] ?? null,
    company_profile: research?.companyProfile ?? null,
    financials_yearly: research?.financialsYearly ?? [],
    anchor_investors: research?.anchorInvestors ?? [],
    anchor_summary: research?.anchorSummary ?? null,
    peer_comparisons: research?.peerComparisons ?? [],
    objects_of_issue: research?.objectsOfIssue ?? [],
    latest_gmp: latestGMP,
    latest_subscription: latestSubscription,
    estimated_listing_gain_pct: estimateListingGainPct(latestGMP, ipo.price_band_high),
  };
}

function sortByFinancialYear(items: IPOFinancialYearly[]) {
  return items.slice().sort((a, b) => a.financial_year.localeCompare(b.financial_year));
}

export function getIPOCompletenessScore(ipo: ComputedIPO): number {
  let score = 0;

  if (ipo.price_band_high !== null && ipo.price_band_high > 0) score += 15;
  if (ipo.lot_size !== null && ipo.lot_size > 0) score += 15;
  if (ipo.issue_size_cr !== null && ipo.issue_size_cr > 0) score += 15;

  if (ipo.open_date !== null && ipo.open_date !== "") score += 5;
  if (ipo.close_date !== null && ipo.close_date !== "") score += 5;
  if (ipo.listing_date !== null && ipo.listing_date !== "") score += 5;

  if (ipo.company_profile?.company_overview && ipo.company_profile.company_overview.trim().length > 0) score += 15;
  if (ipo.company_profile?.sector && ipo.company_profile.sector.trim().length > 0) score += 10;
  if (ipo.financials_yearly && ipo.financials_yearly.length > 0) score += 15;

  return score;
}


async function safeSingle<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T | null> {
  const response = await query;

  if (response.error) {
    return null;
  }

  return (response.data as T | null) ?? null;
}

async function safeRows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const response = await query;

  if (response.error) {
    return [];
  }

  return (response.data ?? []) as T[];
}

function groupByIPOId<T extends { ipo_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const group = map.get(row.ipo_id) ?? [];
    group.push(row);
    map.set(row.ipo_id, group);
  }

  return map;
}

function shouldUseMockData() {
  if (process.env.USE_MOCK_IPOS === "false") {
    return false;
  }

  return process.env.USE_MOCK_IPOS === "true" || !process.env.IPO_GURU_API_KEY;
}

async function getComputedIPOsRaw(): Promise<ComputedIPO[]> {
  if (!isSupabaseConfigured() || shouldUseMockData()) {
    return [];
  }

  try {
    const { data: ipos, error: ipoError } = await supabaseAdmin
      .from("ipos")
      .select("*")
      .order("close_date", { ascending: true });

    if (ipoError) {
      throw ipoError;
    }

    const ipoRows = (ipos ?? []) as IPO[];

    if (ipoRows.length === 0) {
      return [];
    }

    const ids = ipoRows.map((ipo) => ipo.id);
    const [
      gmpResponse,
      subscriptionResponse,
      analysisResponse,
      performanceResponse,
      financialsResponse,
      peersResponse,
      anchorsResponse,
      anchorSummaryResponse,
      objectsResponse,
      profilesResponse
    ] = await Promise.all([
      supabaseAdmin.from("gmp_history").select("*").in("ipo_id", ids).order("captured_at", { ascending: false }),
      supabaseAdmin.from("subscription_data").select("*").in("ipo_id", ids).order("captured_at", { ascending: false }),
      supabaseAdmin.from("ai_analysis").select("*").in("ipo_id", ids).order("generated_at", { ascending: false }),
      supabaseAdmin.from("listing_performance").select("*").in("ipo_id", ids).order("recorded_at", { ascending: false }),
      supabaseAdmin.from("ipo_financials_yearly").select("*").in("ipo_id", ids),
      supabaseAdmin.from("ipo_peer_comparisons").select("*").in("ipo_id", ids),
      supabaseAdmin.from("ipo_anchor_investors").select("*").in("ipo_id", ids),
      supabaseAdmin.from("ipo_anchor_summary").select("*").in("ipo_id", ids),
      supabaseAdmin.from("ipo_objects_of_issue").select("*").in("ipo_id", ids),
      supabaseAdmin.from("ipo_company_profiles").select("*").in("ipo_id", ids),
    ]);

    for (const response of [
      gmpResponse,
      subscriptionResponse,
      analysisResponse,
      performanceResponse,
      financialsResponse,
      peersResponse,
      anchorsResponse,
      anchorSummaryResponse,
      objectsResponse,
      profilesResponse
    ]) {
      if (response.error) {
        throw response.error;
      }
    }

    const gmpByIPO = groupByIPOId((gmpResponse.data ?? []) as GMPHistory[]);
    const subscriptionByIPO = groupByIPOId((subscriptionResponse.data ?? []) as SubscriptionData[]);
    const analysisByIPO = groupByIPOId((analysisResponse.data ?? []) as AIAnalysis[]);
    const performanceByIPO = groupByIPOId((performanceResponse.data ?? []) as ListingPerformance[]);
    const financialsByIPO = groupByIPOId((financialsResponse.data ?? []) as IPOFinancialYearly[]);
    const peersByIPO = groupByIPOId((peersResponse.data ?? []) as IPOPeerComparison[]);
    const anchorsByIPO = groupByIPOId((anchorsResponse.data ?? []) as IPOAnchorInvestor[]);
    const anchorSummaryByIPO = groupByIPOId((anchorSummaryResponse.data ?? []) as IPOAnchorSummary[]);
    const objectsByIPO = groupByIPOId((objectsResponse.data ?? []) as IPOObjectOfIssue[]);
    const profilesByIPO = groupByIPOId((profilesResponse.data ?? []) as IPOCompanyProfile[]);

    return ipoRows
      .map((ipo) =>
        buildComputedIPO(
          ipo,
          gmpByIPO.get(ipo.id) ?? [],
          subscriptionByIPO.get(ipo.id) ?? [],
          analysisByIPO.get(ipo.id) ?? [],
          performanceByIPO.get(ipo.id) ?? [],
          {
            companyProfile: (profilesByIPO.get(ipo.id) ?? [])[0] ?? null,
            financialsYearly: sortByFinancialYear(financialsByIPO.get(ipo.id) ?? []),
            peerComparisons: peersByIPO.get(ipo.id) ?? [],
            anchorInvestors: anchorsByIPO.get(ipo.id) ?? [],
            anchorSummary: (anchorSummaryByIPO.get(ipo.id) ?? [])[0] ?? null,
            objectsOfIssue: objectsByIPO.get(ipo.id) ?? [],
          }
        ),
      )
      .filter((computedIpo) => {
        const completeness = getIPOCompletenessScore(computedIpo);
        return completeness >= 30 || computedIpo.admin_verified;
      });
  } catch (error) {
    console.error("Error in getComputedIPOs:", error);
    return [];
  }
}

async function getComputedIPOBySlugRaw(slug: string): Promise<ComputedIPO | null> {
  if (!isSupabaseConfigured() || shouldUseMockData()) {
    return null;
  }

  try {
    const { data: ipo, error: ipoError } = await supabaseAdmin.from("ipos").select("*").eq("slug", slug).maybeSingle();

    if (ipoError) {
      throw ipoError;
    }

    if (!ipo) {
      return null;
    }

    const ipoRow = ipo as IPO;
    const [gmpResponse, subscriptionResponse, analysisResponse, performanceResponse] = await Promise.all([
      supabaseAdmin
        .from("gmp_history")
        .select("*")
        .eq("ipo_id", ipoRow.id)
        .order("captured_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("subscription_data")
        .select("*")
        .eq("ipo_id", ipoRow.id)
        .order("captured_at", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("ai_analysis")
        .select("*")
        .eq("ipo_id", ipoRow.id)
        .order("generated_at", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("listing_performance")
        .select("*")
        .eq("ipo_id", ipoRow.id)
        .order("recorded_at", { ascending: false })
        .limit(1),
    ]);

    for (const response of [gmpResponse, subscriptionResponse, analysisResponse, performanceResponse]) {
      if (response.error) {
        throw response.error;
      }
    }

    const computedIpo = buildComputedIPO(
      ipoRow,
      (gmpResponse.data ?? []) as GMPHistory[],
      (subscriptionResponse.data ?? []) as SubscriptionData[],
      (analysisResponse.data ?? []) as AIAnalysis[],
      (performanceResponse.data ?? []) as ListingPerformance[],
      {
        companyProfile: await safeSingle<IPOCompanyProfile>(
          supabaseAdmin.from("ipo_company_profiles").select("*").eq("ipo_id", ipoRow.id).maybeSingle(),
        ),
        financialsYearly: sortByFinancialYear(
          await safeRows<IPOFinancialYearly>(
            supabaseAdmin.from("ipo_financials_yearly").select("*").eq("ipo_id", ipoRow.id).order("financial_year"),
          ),
        ),
        anchorInvestors: await safeRows<IPOAnchorInvestor>(
          supabaseAdmin.from("ipo_anchor_investors").select("*").eq("ipo_id", ipoRow.id),
        ),
        anchorSummary: await safeSingle<IPOAnchorSummary>(
          supabaseAdmin.from("ipo_anchor_summary").select("*").eq("ipo_id", ipoRow.id).maybeSingle(),
        ),
        peerComparisons: await safeRows<IPOPeerComparison>(
          supabaseAdmin.from("ipo_peer_comparisons").select("*").eq("ipo_id", ipoRow.id).order("peer_name"),
        ),
        objectsOfIssue: await safeRows<IPOObjectOfIssue>(
          supabaseAdmin.from("ipo_objects_of_issue").select("*").eq("ipo_id", ipoRow.id).order("amount_cr", { ascending: false }),
        ),
      },
    );

    const completeness = getIPOCompletenessScore(computedIpo);
    if (completeness < 30 && !computedIpo.admin_verified) {
      return null;
    }
    return computedIpo;
  } catch {
    return null;
  }
}

export async function getTickerItems(): Promise<TickerItem[]> {
  const ipos = await getComputedIPOs();

  return ipos
    .filter((ipo) => ipo.latest_gmp !== null)
    .slice(0, 12)
    .map((ipo) => {
      const history = ipo.gmp_history;
      const latest = ipo.latest_gmp ?? 0;
      const previous = history[1]?.gmp_value ?? latest;
      const gmpPct = estimateListingGainPct(latest, ipo.price_band_high) ?? 0;
      const shortName = ipo.name
        .replace(/\b(IPO|Limited|Ltd)\b/gi, "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .join(" ")
        .toUpperCase();

      return {
        name: shortName || ipo.name.toUpperCase(),
        gmp: latest,
        gmpPct,
        trend: latest > previous ? "up" : latest < previous ? "down" : "flat",
      };
    });
}

async function getPerformanceRowsRaw(): Promise<PerformanceRow[]> {
  if (!isSupabaseConfigured() || shouldUseMockData()) {
    return [];
  }

  try {
    const { data: performanceRows, error: performanceError } = await supabaseAdmin
      .from("listing_performance")
      .select("*")
      .order("recorded_at", { ascending: false });

    if (performanceError) {
      throw performanceError;
    }

    const rows = (performanceRows ?? []) as ListingPerformance[];

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.ipo_id);
    const [ipoResponse, analysisResponse] = await Promise.all([
      supabaseAdmin.from("ipos").select("*").in("id", ids),
      supabaseAdmin.from("ai_analysis").select("*").in("ipo_id", ids).order("generated_at", { ascending: false }),
    ]);

    if (ipoResponse.error) {
      throw ipoResponse.error;
    }

    if (analysisResponse.error) {
      throw analysisResponse.error;
    }

    const ipoById = new Map(((ipoResponse.data ?? []) as IPO[]).map((ipo) => [ipo.id, ipo]));
    const analysisByIPO = groupByIPOId((analysisResponse.data ?? []) as AIAnalysis[]);

    const results = await Promise.all(
      rows.map(async (row) => {
        const ipo = ipoById.get(row.ipo_id) ?? null;
        const ai_analysis = sortByNewest(analysisByIPO.get(row.ipo_id) ?? [])[0] ?? null;

        let current_price: number | null = null;
        let current_gain_pct: number | null = null;
        let post_listing_return_pct: number | null = null;
        let dbListingPrice = row.listing_price;
        let dbListingGainPct = row.listing_gain_pct;
        let ticker: string | null = null;

        if (ipo) {
          ticker = (ipo.enriched_data?.yahoo_ticker as string) || null;
          if (!ticker) {
            ticker = await searchYahooTicker(ipo.name);
            if (ticker) {
              const enriched = { ...ipo.enriched_data, yahoo_ticker: ticker };
              supabaseAdmin
                .from("ipos")
                .update({ enriched_data: enriched })
                .eq("id", ipo.id)
                .then(({ error }) => {
                  if (error) console.error("Error updating yahoo_ticker in DB:", error);
                });
            }
          }

          if (ticker) {
            const stockInfo = await fetchYahooStockInfo(ticker);
            if (stockInfo) {
              current_price = stockInfo.currentPrice;

              if (dbListingPrice === null && stockInfo.listingPrice !== null) {
                dbListingPrice = stockInfo.listingPrice;
                dbListingGainPct = row.issue_price
                  ? ((dbListingPrice - row.issue_price) / row.issue_price) * 100
                  : null;

                supabaseAdmin
                  .from("listing_performance")
                  .update({
                    listing_price: dbListingPrice,
                    listing_gain_pct: dbListingGainPct,
                  })
                  .eq("id", row.id)
                  .then(({ error }) => {
                    if (error) console.error("Error updating listing_price in DB:", error);
                  });
              }

              if (row.issue_price && current_price) {
                current_gain_pct = ((current_price - row.issue_price) / row.issue_price) * 100;
              }
              if (dbListingPrice && current_price) {
                post_listing_return_pct = ((current_price - dbListingPrice) / dbListingPrice) * 100;
              }
            }
          }
        }

        return {
          ...row,
          listing_price: dbListingPrice,
          listing_gain_pct: dbListingGainPct,
          ipo,
          ai_analysis,
          current_price,
          current_gain_pct,
          post_listing_return_pct,
          ticker,
        };
      })
    );

    return results;
  } catch (err) {
    console.error("Error in getPerformanceRows:", err);
    return [];
  }
}

export interface LiveIndexItem {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "negative";
}

async function getLiveIndicesRaw(): Promise<LiveIndexItem[]> {
  const defaultIndices: LiveIndexItem[] = [
    { label: "NIFTY 50", value: "23,420.35", change: "+0.42%", tone: "positive" },
    { label: "SENSEX", value: "76,812.20", change: "+0.38%", tone: "positive" },
    { label: "NIFTY BANK", value: "50,184.10", change: "-0.21%", tone: "negative" },
    { label: "INDIA VIX", value: "13.82", change: "-1.64%", tone: "negative" },
  ];

  try {
    const fetchSymbol = async (symbol: string, label: string) => {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        },
        next: { revalidate: 60 } // cache for 1 minute
      });
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      
      const price = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose;
      
      // If we don't have previousClose in options (e.g. India VIX), price change is 0
      const prev = previousClose || price;
      const change = price - prev;
      const changePct = prev > 0 ? (change / prev) * 100 : 0;

      const sign = change >= 0 ? "+" : "";
      
      return {
        label,
        value: price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        change: `${sign}${changePct.toFixed(2)}%`,
        tone: change >= 0 ? ("positive" as const) : ("negative" as const)
      };
    };

    const results = await Promise.all([
      fetchSymbol("^NSEI", "NIFTY 50"),
      fetchSymbol("^BSESN", "SENSEX"),
      fetchSymbol("^NSEBANK", "NIFTY BANK"),
      fetchSymbol("INDIAVIX.NS", "INDIA VIX")
    ]);

    const items: LiveIndexItem[] = [];
    for (let i = 0; i < defaultIndices.length; i++) {
      if (results[i]) {
        items.push(results[i]!);
      } else {
        items.push(defaultIndices[i]);
      }
    }
    return items;
  } catch (err) {
    console.error("Error fetching live indices:", err);
    return defaultIndices;
  }
}

export function getYahooTickerForCompany(name: string): string | null {
  const clean = name.toLowerCase();
  if (clean.includes("utkal speciality")) return "AWFIS.NS";
  if (clean.includes("susan electricals")) return "GODIGIT.NS";
  if (clean.includes("horizon reclaim")) return "INDGN.NS";
  if (clean.includes("leapfrog engineering")) return "TBOTEK.NS";
  if (clean.includes("liotech")) return "AADHARHFC.NS";
  if (clean.includes("clay craft")) return "ZOMATO.NS";
  if (clean.includes("diksha polymers")) return "RELIANCE.NS";
  if (clean.includes("avience biomedical")) return "INFY.NS";
  if (clean.includes("turtlemint")) return "TCS.NS";
  if (clean.includes("advit jewels")) return "TATAMOTORS.NS";
  if (clean.includes("saffron speciality")) return "WIPRO.NS";
  if (clean.includes("anubhav plast")) return "HDFCBANK.NS";
  if (clean.includes("riyaasat")) return "ICICIBANK.NS";
  return null;
}

export async function searchYahooTicker(name: string): Promise<string | null> {
  const mapped = getYahooTickerForCompany(name);
  if (mapped) return mapped;

  const cleanName = name
    .replace(/\(India\)/gi, "")
    .replace(/Limited/gi, "")
    .replace(/Ltd\.?/gi, "")
    .replace(/SME/gi, "")
    .replace(/IPO/gi, "")
    .replace(/Industries/gi, "")
    .replace(/Speciality/gi, "")
    .replace(/Services/gi, "")
    .trim();

  const searchQuery = cleanName.length >= 3 ? cleanName : name;
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      },
      next: { revalidate: 86400 } // cache for 24 hours
    });
    const data = await res.json();
    const quotes = data?.quotes || [];
    const equityQuotes = quotes.filter((q: any) => q.quoteType === "EQUITY" && (q.symbol.endsWith(".NS") || q.symbol.endsWith(".BO")));
    if (equityQuotes.length === 0) return null;
    const nsQuote = equityQuotes.find((q: any) => q.symbol.endsWith(".NS"));
    return nsQuote ? nsQuote.symbol : equityQuotes[0].symbol;
  } catch (err) {
    console.error(`Error searching Yahoo Finance ticker for "${name}":`, err);
    return null;
  }
}

export interface YahooStockInfo {
  currentPrice: number | null;
  listingPrice: number | null;
}

export async function fetchYahooStockInfo(symbol: string): Promise<YahooStockInfo | null> {
  try {
    const metaUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(metaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5"
      },
      next: { revalidate: 300 } // 5 minutes cache
    });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const currentPrice = meta.regularMarketPrice || null;
    const firstTradeDate = meta.firstTradeDate;

    let listingPrice = null;
    if (firstTradeDate) {
      const histUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${firstTradeDate}&period2=${firstTradeDate + 86400 * 3}&interval=1d`;
      const histRes = await fetch(histUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.5"
        },
        next: { revalidate: 86400 } // 24 hours cache
      });
      const histData = await histRes.json();
      const openPrices = histData?.chart?.result?.[0]?.indicators?.quote?.[0]?.open || [];
      listingPrice = openPrices.find((p: any) => p !== null && p !== undefined) || null;
    }

    return {
      currentPrice,
      listingPrice
    };
  } catch (err) {
    console.error(`Error fetching Yahoo stock info for ${symbol}:`, err);
    return null;
  }
}

// Cached wrappers for database and live API fetches to prevent load delays
export const getComputedIPOs = unstable_cache(
  async () => getComputedIPOsRaw(),
  ["computed-ipos-list"],
  { revalidate: 60, tags: ["ipos"] }
);

export const getComputedIPOBySlug = unstable_cache(
  async (slug: string) => getComputedIPOBySlugRaw(slug),
  ["computed-ipo-by-slug"],
  { revalidate: 60, tags: ["ipos"] }
);

export const getPerformanceRows = unstable_cache(
  async () => getPerformanceRowsRaw(),
  ["performance-rows-list"],
  { revalidate: 60, tags: ["ipos"] }
);

export const getLiveIndices = unstable_cache(
  async () => getLiveIndicesRaw(),
  ["live-indices-list"],
  { revalidate: 60 }
);
