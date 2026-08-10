import { unstable_noStore as noStore } from "next/cache";
import { gmpValuesDifferSignificantly, subscriptionValuesDifferSignificantly } from "@/lib/ipo-data/dataQuality";
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
  IPOEnrichedField,
  IPOFieldQuality,
  IPOGMPSnapshot,
  IPOLeadManagerWithManager,
  IPOMarketMakerWithMaker,
  IPOObjectOfIssue,
  IPOPeerComparison,
  IPOSubscriptionSnapshot,
  IPOValuationMetrics,
  LeadManager,
  LeadManagerIPOHistory,
  LeadManagerTrackRecordScore,
  ListingPerformance,
  MarketMaker,
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
}

function sortByNewest<T extends { captured_at?: string; generated_at?: string; recorded_at?: string }>(items: T[]) {
  return items.slice().sort((a, b) => {
    const left = a.captured_at ?? a.generated_at ?? a.recorded_at ?? "";
    const right = b.captured_at ?? b.generated_at ?? b.recorded_at ?? "";

    return right.localeCompare(left);
  });
}

function isCanonicalIPO(row: unknown) {
  if (!row || typeof row !== "object") return false;
  return (row as { is_duplicate?: boolean | null }).is_duplicate !== true;
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
    valuationMetrics?: IPOValuationMetrics | null;
    objectsOfIssue?: IPOObjectOfIssue[];
    leadManagers?: IPOLeadManagerWithManager[];
    leadManagerHistory?: LeadManagerIPOHistory[];
    leadManagerScores?: LeadManagerTrackRecordScore[];
    marketMakers?: IPOMarketMakerWithMaker[];
    enrichedFields?: IPOEnrichedField[];
    fieldQuality?: IPOFieldQuality[];
  },
  publicSnapshots?: {
    gmp?: IPOGMPSnapshot[];
    subscription?: IPOSubscriptionSnapshot[];
  },
): ComputedIPO {
  const sortedAnalysis = sortByNewest(aiAnalysis);
  const sortedPerformance = sortByNewest(listingPerformance);
  const publicGmpSnapshots = sortByNewest(publicSnapshots?.gmp ?? []);
  const publicSubscriptionSnapshots = sortByNewest(publicSnapshots?.subscription ?? []);
  const latestPublicGMP = publicGmpSnapshots[0] ?? null;
  const latestPublicSubscription = publicSubscriptionSnapshots[0] ?? null;
  const alternatePublicGMP = publicGmpSnapshots.find((item) => item.source !== latestPublicGMP?.source) ?? null;
  const alternatePublicSubscription =
    publicSubscriptionSnapshots.find((item) => item.source !== latestPublicSubscription?.source) ?? null;
  const publicGmpHistory: GMPHistory[] = publicGmpSnapshots
    .filter((snapshot) => snapshot.gmp !== null && snapshot.gmp !== undefined)
    .map((snapshot) => ({
      captured_at: snapshot.captured_at,
      gmp_value: snapshot.gmp ?? 0,
      id: snapshot.id,
      ipo_id: snapshot.ipo_id,
      source: snapshot.source,
    }));
  const publicSubscriptionHistory: SubscriptionData[] = publicSubscriptionSnapshots.map((snapshot) => ({
    captured_at: snapshot.captured_at,
    id: snapshot.id,
    ipo_id: snapshot.ipo_id,
    nii_x: snapshot.nii_times ?? 0,
    qib_x: snapshot.qib_times ?? 0,
    retail_x: snapshot.retail_times ?? 0,
    total_x: snapshot.total_times ?? 0,
  }));
  const sortedGMP = sortByNewest([...publicGmpHistory, ...gmpHistory]);
  const sortedSubscription = sortByNewest([...publicSubscriptionHistory, ...subscriptionData]);
  const latestLegacyGMP = sortByNewest(gmpHistory)[0]?.gmp_value ?? null;
  const latestLegacySubscription = sortByNewest(subscriptionData)[0] ?? null;
  const publicSubscriptionAsLatest: SubscriptionData | null = latestPublicSubscription
    ? {
        captured_at: latestPublicSubscription.captured_at,
        id: latestPublicSubscription.id,
        ipo_id: latestPublicSubscription.ipo_id,
        nii_x: latestPublicSubscription.nii_times ?? 0,
        qib_x: latestPublicSubscription.qib_times ?? 0,
        retail_x: latestPublicSubscription.retail_times ?? 0,
        total_x: latestPublicSubscription.total_times ?? 0,
      }
    : null;
  const effectiveGMP = latestPublicGMP?.gmp ?? latestLegacyGMP;
  const effectiveGMPPercent = latestPublicGMP?.gmp_percent ?? estimateListingGainPct(effectiveGMP, latestPublicGMP?.issue_price ?? ipo.price_band_high);
  const effectiveSubscription = publicSubscriptionAsLatest ?? latestLegacySubscription;

  return {
    ...ipo,
    gmp_history: sortedGMP,
    subscription_data: sortedSubscription,
    ai_analysis: sortedAnalysis[0] ?? null,
    listing_performance: sortedPerformance[0] ?? null,
    public_gmp_snapshots: publicGmpSnapshots,
    public_subscription_snapshots: publicSubscriptionSnapshots,
    latest_public_gmp_snapshot: latestPublicGMP,
    latest_public_subscription_snapshot: latestPublicSubscription,
    gmp_source_variance: gmpValuesDifferSignificantly(latestPublicGMP, alternatePublicGMP),
    subscription_source_variance: subscriptionValuesDifferSignificantly(latestPublicSubscription, alternatePublicSubscription),
    company_profile: research?.companyProfile ?? null,
    financials_yearly: research?.financialsYearly ?? [],
    anchor_investors: research?.anchorInvestors ?? [],
    anchor_summary: research?.anchorSummary ?? null,
    peer_comparisons: research?.peerComparisons ?? [],
    valuation_metrics: research?.valuationMetrics ?? null,
    objects_of_issue: research?.objectsOfIssue ?? [],
    lead_managers: research?.leadManagers ?? [],
    lead_manager_history: research?.leadManagerHistory ?? [],
    lead_manager_scores: research?.leadManagerScores ?? [],
    market_makers: research?.marketMakers ?? [],
    enriched_fields: research?.enrichedFields ?? [],
    field_quality: research?.fieldQuality ?? [],
    latest_gmp: effectiveGMP,
    latest_gmp_percent: effectiveGMPPercent,
    latest_subscription: effectiveSubscription,
    estimated_listing_gain_pct: effectiveGMPPercent,
  };
}

function sortByFinancialYear(items: IPOFinancialYearly[]) {
  return items.slice().sort((a, b) => a.financial_year.localeCompare(b.financial_year));
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

async function getIPOLeadManagers(ipoId: string): Promise<IPOLeadManagerWithManager[]> {
  const embeddedRows = await safeRows<IPOLeadManagerWithManager>(
    supabaseAdmin.from("ipo_lead_managers").select("*, lead_manager:lead_managers(*)").eq("ipo_id", ipoId).order("is_primary", { ascending: false }),
  );
  const rows =
    embeddedRows.length > 0
      ? embeddedRows
      : await safeRows<IPOLeadManagerWithManager>(
          supabaseAdmin.from("ipo_lead_managers").select("*").eq("ipo_id", ipoId).order("is_primary", { ascending: false }),
        );

  if (rows.length === 0 || rows.every((row) => row.lead_manager)) {
    return rows;
  }

  const managerIds = Array.from(new Set(rows.map((row) => row.lead_manager_id).filter(Boolean)));
  const managers =
    managerIds.length > 0
      ? await safeRows<LeadManager>(supabaseAdmin.from("lead_managers").select("*").in("id", managerIds))
      : [];
  const managerById = new Map(managers.map((manager) => [manager.id, manager]));

  return rows.map((row) => ({
    ...row,
    lead_manager: row.lead_manager ?? managerById.get(row.lead_manager_id) ?? null,
  }));
}

async function getIPOMarketMakers(ipoId: string): Promise<IPOMarketMakerWithMaker[]> {
  const embeddedRows = await safeRows<IPOMarketMakerWithMaker>(
    supabaseAdmin.from("ipo_market_makers").select("*, market_maker:market_makers(*)").eq("ipo_id", ipoId),
  );
  const rows =
    embeddedRows.length > 0
      ? embeddedRows
      : await safeRows<IPOMarketMakerWithMaker>(supabaseAdmin.from("ipo_market_makers").select("*").eq("ipo_id", ipoId));

  if (rows.length === 0 || rows.every((row) => row.market_maker)) {
    return rows;
  }

  const marketMakerIds = Array.from(new Set(rows.map((row) => row.market_maker_id).filter(Boolean)));
  const marketMakers =
    marketMakerIds.length > 0
      ? await safeRows<MarketMaker>(supabaseAdmin.from("market_makers").select("*").in("id", marketMakerIds))
      : [];
  const marketMakerById = new Map(marketMakers.map((maker) => [maker.id, maker]));

  return rows.map((row) => ({
    ...row,
    market_maker: row.market_maker ?? marketMakerById.get(row.market_maker_id) ?? null,
  }));
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

export async function getComputedIPOs(): Promise<ComputedIPO[]> {
  noStore();

  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    let { data: ipos, error: ipoError } = await supabaseAdmin
      .from("ipos")
      .select("*")
      .or("is_duplicate.is.null,is_duplicate.eq.false")
      .order("close_date", { ascending: true });

    if (ipoError) {
      const fallback = await supabaseAdmin.from("ipos").select("*").order("close_date", { ascending: true });
      ipos = fallback.data;
      ipoError = fallback.error;
    }

    if (ipoError) {
      throw ipoError;
    }

    const ipoRows = ((ipos ?? []) as unknown[]).filter(isCanonicalIPO) as IPO[];

    if (ipoRows.length === 0) {
      return [];
    }

    const ids = ipoRows.map((ipo) => ipo.id);
    const [gmpResponse, subscriptionResponse, analysisResponse, performanceResponse] = await Promise.all([
      supabaseAdmin.from("gmp_history").select("*").in("ipo_id", ids).order("captured_at", { ascending: false }),
      supabaseAdmin.from("subscription_data").select("*").in("ipo_id", ids).order("captured_at", { ascending: false }),
      supabaseAdmin.from("ai_analysis").select("*").in("ipo_id", ids).order("generated_at", { ascending: false }),
      supabaseAdmin.from("listing_performance").select("*").in("ipo_id", ids).order("recorded_at", { ascending: false }),
    ]);

    for (const response of [gmpResponse, subscriptionResponse, analysisResponse, performanceResponse]) {
      if (response.error) {
        throw response.error;
      }
    }

    const [publicGmpRows, publicSubscriptionRows] = await Promise.all([
      safeRows<IPOGMPSnapshot>(
        supabaseAdmin.from("ipo_gmp_snapshots").select("*").in("ipo_id", ids).order("captured_at", { ascending: false }),
      ),
      safeRows<IPOSubscriptionSnapshot>(
        supabaseAdmin.from("ipo_subscription_snapshots").select("*").in("ipo_id", ids).order("captured_at", { ascending: false }),
      ),
    ]);

    const gmpByIPO = groupByIPOId((gmpResponse.data ?? []) as GMPHistory[]);
    const subscriptionByIPO = groupByIPOId((subscriptionResponse.data ?? []) as SubscriptionData[]);
    const analysisByIPO = groupByIPOId((analysisResponse.data ?? []) as AIAnalysis[]);
    const performanceByIPO = groupByIPOId((performanceResponse.data ?? []) as ListingPerformance[]);
    const publicGmpByIPO = groupByIPOId(publicGmpRows);
    const publicSubscriptionByIPO = groupByIPOId(publicSubscriptionRows);

    return ipoRows.map((ipo) =>
      buildComputedIPO(
        ipo,
        gmpByIPO.get(ipo.id) ?? [],
        subscriptionByIPO.get(ipo.id) ?? [],
        analysisByIPO.get(ipo.id) ?? [],
        performanceByIPO.get(ipo.id) ?? [],
        undefined,
        {
          gmp: publicGmpByIPO.get(ipo.id) ?? [],
          subscription: publicSubscriptionByIPO.get(ipo.id) ?? [],
        },
      ),
    );
  } catch (error) {
    console.error("Unable to load IPO data", error);
    return [];
  }
}

export async function getComputedIPOBySlug(slug: string): Promise<ComputedIPO | null> {
  noStore();

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    let { data: ipo, error: ipoError } = await supabaseAdmin
      .from("ipos")
      .select("*")
      .eq("slug", slug)
      .or("is_duplicate.is.null,is_duplicate.eq.false")
      .maybeSingle();

    if (ipoError) {
      const fallback = await supabaseAdmin.from("ipos").select("*").eq("slug", slug).maybeSingle();
      ipo = fallback.data;
      ipoError = fallback.error;
    }

    if (ipoError) {
      throw ipoError;
    }

    if (!ipo || !isCanonicalIPO(ipo)) {
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

    const [
      companyProfile,
      financialsYearly,
      anchorInvestors,
      anchorSummary,
      peerComparisons,
      objectsOfIssue,
      valuationMetrics,
      publicGmpSnapshots,
      publicSubscriptionSnapshots,
      leadManagers,
      marketMakers,
      enrichedFields,
      fieldQuality,
    ] = await Promise.all([
      safeSingle<IPOCompanyProfile>(supabaseAdmin.from("ipo_company_profiles").select("*").eq("ipo_id", ipoRow.id).maybeSingle()),
      safeRows<IPOFinancialYearly>(supabaseAdmin.from("ipo_financials_yearly").select("*").eq("ipo_id", ipoRow.id).order("financial_year")),
      safeRows<IPOAnchorInvestor>(supabaseAdmin.from("ipo_anchor_investors").select("*").eq("ipo_id", ipoRow.id)),
      safeSingle<IPOAnchorSummary>(supabaseAdmin.from("ipo_anchor_summary").select("*").eq("ipo_id", ipoRow.id).maybeSingle()),
      safeRows<IPOPeerComparison>(supabaseAdmin.from("ipo_peer_comparisons").select("*").eq("ipo_id", ipoRow.id).order("peer_name")),
      safeRows<IPOObjectOfIssue>(
        supabaseAdmin.from("ipo_objects_of_issue").select("*").eq("ipo_id", ipoRow.id).order("amount_cr", { ascending: false }),
      ),
      safeSingle<IPOValuationMetrics>(supabaseAdmin.from("ipo_valuation_metrics").select("*").eq("ipo_id", ipoRow.id).maybeSingle()),
      safeRows<IPOGMPSnapshot>(
        supabaseAdmin.from("ipo_gmp_snapshots").select("*").eq("ipo_id", ipoRow.id).order("captured_at", { ascending: false }).limit(20),
      ),
      safeRows<IPOSubscriptionSnapshot>(
        supabaseAdmin
          .from("ipo_subscription_snapshots")
          .select("*")
          .eq("ipo_id", ipoRow.id)
          .order("captured_at", { ascending: false })
          .limit(20),
      ),
      getIPOLeadManagers(ipoRow.id),
      getIPOMarketMakers(ipoRow.id),
      safeRows<IPOEnrichedField>(
        supabaseAdmin
          .from("ipo_enriched_fields")
          .select("*")
          .eq("ipo_id", ipoRow.id)
          .in("status", ["auto_applied", "needs_review"])
          .order("created_at", { ascending: false })
          .limit(80),
      ),
      safeRows<IPOFieldQuality>(supabaseAdmin.from("ipo_field_quality").select("*").eq("ipo_id", ipoRow.id)),
    ]);
    const leadManagerIds = leadManagers.map((item) => item.lead_manager_id).filter(Boolean);
    const [leadManagerHistory, leadManagerScores] =
      leadManagerIds.length > 0
        ? await Promise.all([
            safeRows<LeadManagerIPOHistory>(
              supabaseAdmin
                .from("lead_manager_ipo_history")
                .select("*")
                .in("lead_manager_id", leadManagerIds)
                .order("listing_date", { ascending: false })
                .limit(60),
            ),
            safeRows<LeadManagerTrackRecordScore>(
              supabaseAdmin
                .from("lead_manager_track_record_scores")
                .select("*")
                .in("lead_manager_id", leadManagerIds)
                .order("calculated_at", { ascending: false }),
            ),
          ])
        : [[], []];

    return buildComputedIPO(
      ipoRow,
      (gmpResponse.data ?? []) as GMPHistory[],
      (subscriptionResponse.data ?? []) as SubscriptionData[],
      (analysisResponse.data ?? []) as AIAnalysis[],
      (performanceResponse.data ?? []) as ListingPerformance[],
      {
        companyProfile,
        financialsYearly: sortByFinancialYear(financialsYearly),
        anchorInvestors,
        anchorSummary,
        peerComparisons,
        valuationMetrics,
        objectsOfIssue,
        leadManagers,
        leadManagerHistory,
        leadManagerScores,
        marketMakers,
        enrichedFields,
        fieldQuality,
      },
      {
        gmp: publicGmpSnapshots,
        subscription: publicSubscriptionSnapshots,
      },
    );
  } catch (error) {
    console.error(`Unable to load IPO detail for ${slug}`, error);
    return null;
  }
}

export async function getTickerItems(): Promise<TickerItem[]> {
  noStore();

  const ipos = await getComputedIPOs();

  return ipos
    .filter((ipo) => ipo.latest_gmp !== null)
    .slice(0, 12)
    .map((ipo) => {
      const history = ipo.gmp_history;
      const latest = ipo.latest_gmp ?? 0;
      const previous = history[1]?.gmp_value ?? latest;
      const gmpPct = ipo.latest_gmp_percent ?? 0;
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

export async function getPerformanceRows(): Promise<PerformanceRow[]> {
  noStore();

  if (!isSupabaseConfigured()) {
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
      supabaseAdmin.from("ipos").select("*").in("id", ids).or("is_duplicate.is.null,is_duplicate.eq.false"),
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

    return rows.map((row) => ({
      ...row,
      ipo: ipoById.get(row.ipo_id) ?? null,
      ai_analysis: sortByNewest(analysisByIPO.get(row.ipo_id) ?? [])[0] ?? null,
    }));
  } catch (error) {
    console.error("Unable to load performance rows", error);
    return [];
  }
}
