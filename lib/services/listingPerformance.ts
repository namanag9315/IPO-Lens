import { getRecentIPOSeedRows } from "@/lib/data/recentIpoPerformanceSeed";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { AIAnalysis, IPO, IPOListingPerformance } from "@/types/ipo";

const YAHOO_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0" };
const MIN_DASHBOARD_ROWS = 30;

export interface ListingPerformanceDashboardRow extends IPOListingPerformance {
  ipo: Pick<IPO, "id" | "name" | "slug" | "listing_date" | "category"> | null;
  current_price: number | null;
  return_from_issue_pct: number | null;
  score_source?: "live" | "backfilled";
  data_source?: string;
}

interface YahooChartResult {
  timestamp?: number[];
  meta?: {
    regularMarketPrice?: number;
  };
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
}

interface ListedIPOForSync extends IPO {
  symbol?: string | null;
  exchange?: string | null;
}

function dateOnlyInIST(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kolkata",
    year: "numeric",
  }).format(date);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(`${value}T00:00:00+05:30`);
}

function isDatePassed(date: Date, now = new Date()) {
  return date.getTime() <= now.getTime();
}

function cleanSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
}

function normalizeKey(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function toYahooSymbol(symbol: string, exchange: string | null | undefined = "NSE") {
  const trimmed = symbol.trim().toUpperCase();
  if (trimmed.endsWith(".NS") || trimmed.endsWith(".BO")) {
    return trimmed;
  }

  return `${cleanSymbol(trimmed)}.${exchange === "BSE" ? "BO" : "NS"}`;
}

function resolveExchange(ipo: ListedIPOForSync, rawSymbol: string) {
  if (ipo.exchange === "BSE" || rawSymbol.toUpperCase().endsWith(".BO")) return "BSE";
  return "NSE";
}

function resolveRawSymbol(ipo: ListedIPOForSync) {
  const enriched = (ipo.enriched_data ?? {}) as Record<string, unknown>;
  return (
    ipo.symbol ||
    (typeof enriched.yahoo_ticker === "string" ? enriched.yahoo_ticker : null) ||
    (typeof enriched.symbol === "string" ? enriched.symbol : null)
  );
}

function firstValid(values: Array<number | null | undefined> | undefined) {
  return values?.find((value): value is number => typeof value === "number" && Number.isFinite(value)) ?? null;
}

function calcReturn(price: number | null | undefined, issuePrice: number | null | undefined) {
  if (typeof price !== "number" || typeof issuePrice !== "number" || issuePrice <= 0) {
    return null;
  }

  return ((price - issuePrice) / issuePrice) * 100;
}

function validateScore(score: number | null | undefined, listingGainPct: number | null | undefined) {
  if (typeof score !== "number" || typeof listingGainPct !== "number") {
    return false;
  }

  if (score >= 70 && listingGainPct >= 10) {
    return true;
  }

  if (score < 40 && listingGainPct < 0) {
    return true;
  }

  return false;
}

async function fetchYahooChart(url: string): Promise<YahooChartResult | null> {
  const res = await fetch(url, {
    headers: YAHOO_HEADERS,
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance request failed with status ${res.status}`);
  }

  const data = await res.json();
  return data?.chart?.result?.[0] ?? null;
}

export async function fetchStockPrice(symbol: string): Promise<number | null> {
  const url = `${YAHOO_CHART_BASE_URL}/${toYahooSymbol(symbol)}?interval=1d&range=1d`;
  const data = await fetchYahooChart(url);
  return data?.meta?.regularMarketPrice ?? null;
}

export async function fetchHistoricalPrices(symbol: string, fromDate: Date, toDate: Date) {
  const from = Math.floor(fromDate.getTime() / 1000);
  const to = Math.floor(toDate.getTime() / 1000);
  const url = `${YAHOO_CHART_BASE_URL}/${toYahooSymbol(symbol)}?period1=${from}&period2=${to}&interval=1d`;
  return fetchYahooChart(url);
}

export async function fetchListingDayData(symbol: string, listingDate: Date) {
  const data = await fetchHistoricalPrices(symbol, listingDate, addDays(listingDate, 1));
  const quote = data?.indicators?.quote?.[0];

  if (!quote) {
    return null;
  }

  return {
    open: firstValid(quote.open),
    high: firstValid(quote.high),
    low: firstValid(quote.low),
    close: firstValid(quote.close),
    volume: firstValid(quote.volume),
  };
}

async function fetchCloseNearDate(symbol: string, date: Date) {
  const data = await fetchHistoricalPrices(symbol, date, addDays(date, 7));
  return firstValid(data?.indicators?.quote?.[0]?.close);
}

function latestKnownPrice(row: IPOListingPerformance) {
  return row.current_price ?? row.price_3m ?? row.price_1m ?? row.price_1w ?? row.listing_day_close ?? row.listing_price ?? null;
}

function mapDashboardRow(row: IPOListingPerformance & { ipo?: ListingPerformanceDashboardRow["ipo"] }) {
  const currentPrice = latestKnownPrice(row);
  return {
    ...row,
    ipo: row.ipo ?? null,
    current_price: currentPrice,
    return_from_issue_pct: row.return_current_pct ?? calcReturn(currentPrice, row.issue_price),
    score_source: "live" as const,
  };
}

function rowSortDate(row: ListingPerformanceDashboardRow) {
  return row.ipo?.listing_date ?? row.data_updated_at ?? row.created_at ?? "";
}

function withRecentSeedFallback(rows: ListingPerformanceDashboardRow[]) {
  if (rows.length >= MIN_DASHBOARD_ROWS) {
    return rows;
  }

  const seen = new Set(
    rows.map((row) => normalizeKey(row.ipo?.name ?? row.symbol ?? row.ipo_id)).filter(Boolean),
  );
  const seedRows = getRecentIPOSeedRows().filter((row) => {
    const key = normalizeKey(row.ipo?.name ?? row.symbol ?? row.ipo_id);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return [...rows, ...seedRows].sort((a, b) => rowSortDate(b).localeCompare(rowSortDate(a)));
}

export async function getListingPerformanceByIPOId(ipoId: string): Promise<IPOListingPerformance | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("ipo_listing_performance")
    .select("*")
    .eq("ipo_id", ipoId)
    .order("data_updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching IPO listing performance:", error.message);
    return null;
  }

  return (data as IPOListingPerformance | null) ?? null;
}

export async function getListingPerformanceDashboardRows(): Promise<ListingPerformanceDashboardRow[]> {
  if (!isSupabaseConfigured()) {
    return withRecentSeedFallback([]);
  }

  const { data, error } = await supabaseAdmin
    .from("ipo_listing_performance")
    .select("*, ipo:ipos(id, name, slug, listing_date, category)")
    .order("data_updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching listing performance dashboard rows:", error.message);
    return withRecentSeedFallback([]);
  }

  const liveRows = ((data ?? []) as Array<IPOListingPerformance & { ipo?: ListingPerformanceDashboardRow["ipo"] }>).map(mapDashboardRow);
  return withRecentSeedFallback(liveRows);
}

async function fetchLatestScores(ipoIds: string[]) {
  const { data, error } = await supabaseAdmin
    .from("ai_analysis")
    .select("ipo_id, score, generated_at")
    .in("ipo_id", ipoIds)
    .order("generated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const scoreByIPO = new Map<string, number | null>();
  for (const row of (data ?? []) as Pick<AIAnalysis, "ipo_id" | "score" | "generated_at">[]) {
    if (!scoreByIPO.has(row.ipo_id)) {
      scoreByIPO.set(row.ipo_id, row.score ?? null);
    }
  }

  return scoreByIPO;
}

export function getYahooTickerForCompany(name: string): string | null {
  const clean = name.toLowerCase();
  if (clean.includes("utkal speciality")) return "UTKAL-SM.NS";
  if (clean.includes("susan electricals")) return "SUSAN.BO";
  if (clean.includes("horizon reclaim")) return "HORIZON.BO";
  if (clean.includes("leapfrog engineering")) return "544797.BO";
  if (clean.includes("liotech")) return "LIOTECH.BO";
  if (clean.includes("clay craft")) return "CLAYCRAFT-SM.NS";
  if (clean.includes("diksha polymers")) return "DIKSHA.BO";
  if (clean.includes("avience biomedical")) return "AVIENCE.NS";
  if (clean.includes("turtlemint")) return "TURTLEMINT.NS";
  if (clean.includes("advit jewels")) return "ADVIT.NS";
  if (clean.includes("saffron speciality")) return "SAFFRON.BO";
  if (clean.includes("anubhav plast")) return "ANUBHAV.BO";
  if (clean.includes("riyaasat")) return "RIYA.BO";
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

export async function updateListingPerformanceForListedIPOs() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const today = dateOnlyInIST();
  const { data: ipos, error } = await supabaseAdmin
    .from("ipos")
    .select("*")
    .not("listing_date", "is", null)
    .lte("listing_date", today);

  if (error) {
    throw error;
  }

  const listedIPOs = (ipos ?? []) as ListedIPOForSync[];
  const scores = await fetchLatestScores(listedIPOs.map((ipo) => ipo.id));
  const errors: Array<{ ipo: string; error: string }> = [];
  let updated = 0;
  let skipped = 0;

  for (const ipo of listedIPOs) {
    let rawSymbol = resolveRawSymbol(ipo);

    // Fallback: If not set, resolve ticker dynamically and save it
    if (!rawSymbol) {
      rawSymbol = await searchYahooTicker(ipo.name);
      if (rawSymbol) {
        const enriched = { ...(ipo.enriched_data as any || {}), yahoo_ticker: rawSymbol };
        const { error: updateErr } = await supabaseAdmin
          .from("ipos")
          .update({ enriched_data: enriched })
          .eq("id", ipo.id);
        
        if (updateErr) {
          console.error(`[Perf-Sync] Error saving yahoo_ticker for ${ipo.name}:`, updateErr);
        } else {
          console.log(`[Perf-Sync] Resolved and saved ticker ${rawSymbol} for ${ipo.name}`);
          ipo.enriched_data = enriched;
        }
      }
    }

    const listingDate = toDate(ipo.listing_date);
    const issuePrice = ipo.price_band_high ?? null;

    if (!rawSymbol || !listingDate || !issuePrice) {
      skipped += 1;
      continue;
    }

    const exchange = resolveExchange(ipo, rawSymbol);
    const symbol = cleanSymbol(rawSymbol);
    const yahooSymbol = toYahooSymbol(rawSymbol, exchange);

    try {
      const currentPrice = await fetchStockPrice(yahooSymbol);
      const listingDay = await fetchListingDayData(yahooSymbol, listingDate);
      const listingPrice = listingDay?.open ?? null;
      const listingGainPct = calcReturn(listingPrice, issuePrice);
      const score = scores.get(ipo.id) ?? null;

      const oneWeekDate = addDays(listingDate, 7);
      const oneMonthDate = addDays(listingDate, 30);
      const threeMonthDate = addDays(listingDate, 90);

      const [price1w, price1m, price3m] = await Promise.all([
        isDatePassed(oneWeekDate) ? fetchCloseNearDate(yahooSymbol, oneWeekDate) : Promise.resolve(null),
        isDatePassed(oneMonthDate) ? fetchCloseNearDate(yahooSymbol, oneMonthDate) : Promise.resolve(null),
        isDatePassed(threeMonthDate) ? fetchCloseNearDate(yahooSymbol, threeMonthDate) : Promise.resolve(null),
      ]);

      const row = {
        ipo_id: ipo.id,
        symbol: cleanSymbol(symbol),
        exchange,
        issue_price: issuePrice,
        listing_price: listingPrice,
        listing_gain_pct: listingGainPct,
        listing_day_high: listingDay?.high ?? null,
        listing_day_low: listingDay?.low ?? null,
        listing_day_volume: listingDay?.volume ?? null,
        listing_day_close: listingDay?.close ?? null,
        price_1w: price1w,
        price_1m: price1m,
        price_3m: price3m,
        current_price: currentPrice,
        return_1w_pct: calcReturn(price1w, issuePrice),
        return_1m_pct: calcReturn(price1m, issuePrice),
        return_3m_pct: calcReturn(price3m, issuePrice),
        return_current_pct: calcReturn(currentPrice, issuePrice),
        ipo_lens_score: score,
        score_validated: validateScore(score, listingGainPct),
        data_updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabaseAdmin
        .from("ipo_listing_performance")
        .upsert(row, { onConflict: "ipo_id,exchange" });

      if (upsertError) {
        throw upsertError;
      }

      updated += 1;
    } catch (err) {
      errors.push({
        ipo: ipo.name,
        error: err instanceof Error ? err.message : "Unknown listing performance sync error",
      });
    }
  }

  return {
    errors,
    skipped,
    updated,
  };
}
