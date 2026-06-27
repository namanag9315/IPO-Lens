import { supabaseAdmin } from "@/lib/supabase";
import { fetchSubscriptionData } from "@/lib/scrapers/bseScraper";
import { fetchAllChittorgarhSubscriptions, fetchChittorgarhDetails, searchChittorgarhIPO } from "@/lib/scrapers/chittorgarh";
import { fetchAllIPOs } from "@/lib/scrapers/ipoGuru";
import { scrapeIPOPlatform } from "@/lib/scrapers/ipoPlatform";
import type { IPOFinancialYearlyInsert, IPOPeerComparisonInsert, SubscriptionDataInsert } from "@/types/ipo";

type RepairSection = "financials" | "peers" | "subscription";

interface AdminRepairIPO {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  enriched_data: Record<string, unknown> | null;
  ipo_financials_yearly?: Array<{ id: string }>;
  ipo_peer_comparisons?: Array<{ id: string }>;
  subscription_data?: Array<{ id: string }>;
}

interface SubscriptionFallbacks {
  guruIPOs: Awaited<ReturnType<typeof fetchAllIPOs>>;
  bseSubs: Awaited<ReturnType<typeof fetchSubscriptionData>>;
  chittorgarhSubs: Awaited<ReturnType<typeof fetchAllChittorgarhSubscriptions>>;
}

export interface DataIntegrityRepairRowResult {
  ipoId: string;
  name: string;
  attempted: RepairSection[];
  repaired: RepairSection[];
  remaining: RepairSection[];
  errors: string[];
}

export interface DataIntegrityRepairResult {
  checked: number;
  fixed: number;
  stillFailing: number;
  totals: {
    financialRows: number;
    peerRows: number;
    subscriptionRows: number;
  };
  rows: DataIntegrityRepairRowResult[];
}

function getLinkInfoFromUrl(url: string | null | undefined) {
  if (!url) return null;

  const match = url.match(/\/ipo\/(?:(?:financial-report|subscription|peer-comparison|review|anchor-investor)\/)?([a-zA-Z0-9-]+)\/(\d+)/);
  if (!match) return null;

  let origin = "https://www.ipoplatform.com";
  try {
    origin = new URL(url).origin;
  } catch {
    // Keep the default IPOPlatform origin for manually entered path fragments.
  }

  return {
    slug: match[1],
    id: match[2],
    url: `${origin}/ipo/${match[1]}/${match[2]}`,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function needsSubscription(status: string | null | undefined) {
  return status === "open" || status === "closed" || status === "listed";
}

function getMissingSections(ipo: AdminRepairIPO): RepairSection[] {
  const missing: RepairSection[] = [];

  if (!ipo.ipo_financials_yearly || ipo.ipo_financials_yearly.length === 0) {
    missing.push("financials");
  }

  if (!ipo.ipo_peer_comparisons || ipo.ipo_peer_comparisons.length === 0) {
    missing.push("peers");
  }

  if (needsSubscription(ipo.status) && (!ipo.subscription_data || ipo.subscription_data.length === 0)) {
    missing.push("subscription");
  }

  return missing;
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(ipo|limited|ltd)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesIPOName(sourceName: string, ipo: AdminRepairIPO) {
  const source = normalizeForMatch(sourceName);
  const name = normalizeForMatch(ipo.name);
  const slug = normalizeForMatch(ipo.slug.replace(/-/g, " "));

  if (!source || (!name && !slug)) return false;

  return source.includes(name) || name.includes(source) || source.includes(slug) || slug.includes(source);
}

function hasValidGuruSubscription(subscription: Awaited<ReturnType<typeof fetchAllIPOs>>[number]["subscription"]) {
  return Boolean(
    subscription &&
      ((subscription.qib !== null && subscription.qib > 0) ||
        (subscription.nii !== null && subscription.nii > 0) ||
        (subscription.retail !== null && subscription.retail > 0) ||
        (subscription.total !== null && subscription.total > 0))
  );
}

function hasUsefulPlatformSubscription(subscription: { qib_x: number | null; nii_x: number | null; retail_x: number | null; total_x: number | null } | null) {
  return Boolean(
    subscription &&
      (subscription.qib_x !== null || subscription.nii_x !== null || subscription.retail_x !== null || subscription.total_x !== null)
  );
}

function hasUsefulFinancialRow(row: {
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
}) {
  return Boolean(
    row.financial_year &&
      [
        row.revenue_cr,
        row.pat_cr,
        row.ebitda_cr,
        row.ebitda_margin_pct,
        row.pat_margin_pct,
        row.net_worth_cr,
        row.total_borrowings_cr,
        row.debt_equity,
        row.eps,
        row.roe_pct,
        row.roce_pct,
      ].some((value) => value !== null && value !== undefined)
  );
}

function hasUsefulPeerRow(row: {
  peer_name: string;
  pe_ratio: number | null;
  roe_pct: number | null;
  revenue_cr: number | null;
  pat_cr?: number | null;
  market_cap_cr?: number | null;
}) {
  return Boolean(
    row.peer_name &&
      [row.pe_ratio, row.roe_pct, row.revenue_cr, row.pat_cr, row.market_cap_cr].some(
        (value) => value !== null && value !== undefined
      )
  );
}

function uniqueBy<T>(items: T[], keyFor: (item: T) => string) {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const key = keyFor(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function resolveFallbackSubscription(ipo: AdminRepairIPO, fallbacks: SubscriptionFallbacks): { source: string; row: SubscriptionDataInsert } | null {
  const guruMatch = fallbacks.guruIPOs.find((candidate) => matchesIPOName(candidate.name, ipo) && hasValidGuruSubscription(candidate.subscription));
  if (guruMatch?.subscription) {
    return {
      source: "ipoguru",
      row: {
        ipo_id: ipo.id,
        qib_x: guruMatch.subscription.qib ?? 0,
        nii_x: guruMatch.subscription.nii ?? 0,
        retail_x: guruMatch.subscription.retail ?? 0,
        total_x: guruMatch.subscription.total ?? 0,
      },
    };
  }

  const bseMatch = fallbacks.bseSubs.find((candidate) => matchesIPOName(candidate.name, ipo) && candidate.total > 0);
  if (bseMatch) {
    return {
      source: "bse",
      row: {
        ipo_id: ipo.id,
        qib_x: bseMatch.qib,
        nii_x: bseMatch.nii,
        retail_x: bseMatch.retail,
        total_x: bseMatch.total,
      },
    };
  }

  const chittorgarhMatch = fallbacks.chittorgarhSubs.find((candidate) => matchesIPOName(candidate.name, ipo) && candidate.total > 0);
  if (chittorgarhMatch) {
    return {
      source: "chittorgarh",
      row: {
        ipo_id: ipo.id,
        qib_x: 0,
        nii_x: 0,
        retail_x: 0,
        total_x: chittorgarhMatch.total,
      },
    };
  }

  return null;
}

async function fetchFlaggedIPOs() {
  const { data, error } = await supabaseAdmin
    .from("ipos")
    .select(`
      id,
      slug,
      name,
      status,
      enriched_data,
      ipo_financials_yearly (
        id
      ),
      ipo_peer_comparisons (
        id
      ),
      subscription_data (
        id
      )
    `)
    .order("close_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AdminRepairIPO[]).filter((ipo) => getMissingSections(ipo).length > 0);
}

async function fetchSubscriptionFallbacks(shouldFetch: boolean): Promise<SubscriptionFallbacks> {
  if (!shouldFetch) {
    return { guruIPOs: [], bseSubs: [], chittorgarhSubs: [] };
  }

  const useChittorgarhFallback = process.env.USE_CHITTORGARH_FALLBACK === "true";
  const [guruIPOs, bseSubs, chittorgarhSubs] = await Promise.all([
    fetchAllIPOs().catch(() => []),
    fetchSubscriptionData().catch(() => []),
    useChittorgarhFallback ? fetchAllChittorgarhSubscriptions().catch(() => []) : Promise.resolve([]),
  ]);

  return { guruIPOs, bseSubs, chittorgarhSubs };
}

async function saveRepairSources(ipo: AdminRepairIPO, sources: Record<string, string>, ipoPlatformUrl: string | null) {
  const enriched = asRecord(ipo.enriched_data);
  const existingSources = asRecord(enriched.sources);
  const updates: Record<string, unknown> = {
    ...enriched,
  };

  if (ipoPlatformUrl && !updates.ipoplatform_url) {
    updates.ipoplatform_url = ipoPlatformUrl;
  }

  if (Object.keys(sources).length > 0) {
    updates.sources = {
      ...existingSources,
      ...sources,
    };
    updates.last_integrity_repair_at = new Date().toISOString();
  }

  if (Object.keys(sources).length === 0 && updates.ipoplatform_url === enriched.ipoplatform_url) {
    return;
  }

  const { error } = await supabaseAdmin.from("ipos").update({ enriched_data: updates }).eq("id", ipo.id);
  if (error) {
    throw new Error(error.message);
  }
}

async function repairOneIPO(ipo: AdminRepairIPO, fallbacks: SubscriptionFallbacks): Promise<DataIntegrityRepairRowResult & { totals: DataIntegrityRepairResult["totals"] }> {
  const attempted = getMissingSections(ipo);
  const repaired: RepairSection[] = [];
  const errors: string[] = [];
  const totals = {
    financialRows: 0,
    peerRows: 0,
    subscriptionRows: 0,
  };
  const sources: Record<string, string> = {};
  const enriched = asRecord(ipo.enriched_data);
  const linkInfo = getLinkInfoFromUrl(typeof enriched.ipoplatform_url === "string" ? enriched.ipoplatform_url : null);
  const needsFullPlatformScrape = attempted.includes("financials") || attempted.includes("peers");
  let ipoPlatformUrl: string | null = linkInfo?.url ?? null;
  let platformData: Awaited<ReturnType<typeof scrapeIPOPlatform>> = null;

  try {
    platformData = await scrapeIPOPlatform(ipo.name, linkInfo, needsFullPlatformScrape ? undefined : { onlySubscription: true });
    ipoPlatformUrl = platformData?.url ?? ipoPlatformUrl;
  } catch (error: any) {
    errors.push(`IPOPlatform scrape failed: ${error?.message || "unknown error"}`);
  }

  if (attempted.includes("financials")) {
    let financialRows: IPOFinancialYearlyInsert[] = [];
    let financialSource = "";

    if (platformData?.financials?.length) {
      financialRows = uniqueBy(
        platformData.financials
          .filter(hasUsefulFinancialRow)
          .map((financial) => ({
            ipo_id: ipo.id,
            financial_year: financial.financial_year,
            revenue_cr: financial.revenue_cr,
            pat_cr: financial.pat_cr,
            ebitda_cr: financial.ebitda_cr,
            ebitda_margin_pct: financial.ebitda_margin_pct,
            pat_margin_pct: financial.pat_margin_pct,
            net_worth_cr: financial.net_worth_cr,
            total_borrowings_cr: financial.total_borrowings_cr,
            debt_equity: financial.debt_equity,
            eps: financial.eps,
            roe_pct: financial.roe_pct,
            roce_pct: financial.roce_pct,
          })),
        (financial) => financial.financial_year
      );
      financialSource = financialRows.length > 0 ? "ipoplatform" : "";
    }

    if (financialRows.length === 0 && process.env.USE_CHITTORGARH_FALLBACK === "true") {
      try {
        const match = await searchChittorgarhIPO(ipo.name);
        const details = match ? await fetchChittorgarhDetails(match.urlrewrite_folder_name, match.id) : null;
        financialRows = uniqueBy(
          (details?.financials ?? [])
            .filter(hasUsefulFinancialRow)
            .map((financial) => ({
              ipo_id: ipo.id,
              financial_year: financial.financial_year,
              revenue_cr: financial.revenue_cr,
              pat_cr: financial.pat_cr,
              ebitda_cr: financial.ebitda_cr,
              ebitda_margin_pct: financial.ebitda_margin_pct,
              pat_margin_pct: financial.pat_margin_pct,
              net_worth_cr: financial.net_worth_cr,
              total_borrowings_cr: financial.total_borrowings_cr,
              debt_equity: financial.debt_equity,
              eps: financial.eps,
              roe_pct: financial.roe_pct,
              roce_pct: financial.roce_pct,
            })),
          (financial) => financial.financial_year
        );

        if (financialRows.length > 0) {
          financialSource = "chittorgarh";
        }
      } catch (error: any) {
        errors.push(`Chittorgarh financial fallback failed: ${error?.message || "unknown error"}`);
      }
    }

    if (financialRows.length > 0) {
      const { error } = await supabaseAdmin
        .from("ipo_financials_yearly")
        .upsert(financialRows, { onConflict: "ipo_id,financial_year" });

      if (error) {
        errors.push(`Financials save failed: ${error.message}`);
      } else {
        repaired.push("financials");
        totals.financialRows = financialRows.length;
        if (financialSource) {
          sources.financials = financialSource;
        }
      }
    }
  }

  if (attempted.includes("peers") && platformData?.peers?.length) {
    const peerRows: IPOPeerComparisonInsert[] = uniqueBy(
      platformData.peers
        .filter(hasUsefulPeerRow)
        .map((peer) => ({
          ipo_id: ipo.id,
          peer_name: peer.peer_name,
          revenue_cr: peer.revenue_cr,
          pat_cr: peer.pat_cr ?? null,
          pe_ratio: peer.pe_ratio,
          pb_ratio: null,
          roe_pct: peer.roe_pct,
          roce_pct: null,
          market_cap_cr: peer.market_cap_cr ?? null,
          notes: peer.notes ?? null,
        })),
      (peer) => normalizeForMatch(peer.peer_name)
    );

    if (peerRows.length > 0) {
      const { error } = await supabaseAdmin.from("ipo_peer_comparisons").insert(peerRows);

      if (error) {
        errors.push(`Peers save failed: ${error.message}`);
      } else {
        repaired.push("peers");
        totals.peerRows = peerRows.length;
        sources.peers = "ipoplatform";
      }
    }
  }

  if (attempted.includes("subscription")) {
    let subscriptionRow: SubscriptionDataInsert | null = null;
    let subscriptionSource = "";

    if (hasUsefulPlatformSubscription(platformData?.subscription ?? null) && platformData?.subscription) {
      subscriptionRow = {
        ipo_id: ipo.id,
        qib_x: platformData.subscription.qib_x ?? 0,
        nii_x: platformData.subscription.nii_x ?? 0,
        retail_x: platformData.subscription.retail_x ?? 0,
        total_x: platformData.subscription.total_x ?? 0,
      };
      subscriptionSource = "ipoplatform";
    } else {
      const fallback = resolveFallbackSubscription(ipo, fallbacks);
      if (fallback) {
        subscriptionRow = fallback.row;
        subscriptionSource = fallback.source;
      }
    }

    if (subscriptionRow) {
      const { error } = await supabaseAdmin.from("subscription_data").insert(subscriptionRow);

      if (error) {
        errors.push(`Subscription save failed: ${error.message}`);
      } else {
        repaired.push("subscription");
        totals.subscriptionRows = 1;
        sources.subscription = subscriptionSource;
      }
    }
  }

  try {
    await saveRepairSources(ipo, sources, ipoPlatformUrl);
  } catch (error: any) {
    errors.push(`Source metadata save failed: ${error?.message || "unknown error"}`);
  }

  return {
    ipoId: ipo.id,
    name: ipo.name,
    attempted,
    repaired,
    remaining: attempted.filter((section) => !repaired.includes(section)),
    errors,
    totals,
  };
}

export async function repairDataIntegrityWarnings(): Promise<DataIntegrityRepairResult> {
  const flaggedIPOs = await fetchFlaggedIPOs();
  const needsSubscriptionBackfill = flaggedIPOs.some((ipo) => getMissingSections(ipo).includes("subscription"));
  const fallbacks = await fetchSubscriptionFallbacks(needsSubscriptionBackfill);
  const rowResults: Array<DataIntegrityRepairRowResult & { totals: DataIntegrityRepairResult["totals"] }> = [];

  for (const ipo of flaggedIPOs) {
    rowResults.push(await repairOneIPO(ipo, fallbacks));
  }

  const finalRows = flaggedIPOs.length > 0 ? await fetchFlaggedIPOs() : [];
  const finalMissingById = new Map(finalRows.map((ipo) => [ipo.id, getMissingSections(ipo)]));
  const rows = rowResults.map(({ totals, ...row }) => ({
    ...row,
    remaining: finalMissingById.get(row.ipoId) ?? [],
  }));
  const totals = rowResults.reduce(
    (acc, row) => ({
      financialRows: acc.financialRows + row.totals.financialRows,
      peerRows: acc.peerRows + row.totals.peerRows,
      subscriptionRows: acc.subscriptionRows + row.totals.subscriptionRows,
    }),
    { financialRows: 0, peerRows: 0, subscriptionRows: 0 }
  );

  return {
    checked: flaggedIPOs.length,
    fixed: rows.filter((row) => row.attempted.length > 0 && row.remaining.length === 0).length,
    stillFailing: rows.filter((row) => row.remaining.length > 0).length,
    totals,
    rows,
  };
}
