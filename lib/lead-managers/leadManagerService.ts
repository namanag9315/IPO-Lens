import { calculateLeadManagerScore } from "@/lib/lead-managers/calculateLeadManagerScore";
import { leadManagerSlug } from "@/lib/lead-managers/normalizeLeadManagerName";
import { fetchIPOPremiumLeadManagerDirectory, ipoPremiumLeadManagerProvider } from "@/lib/lead-managers/providers/ipoPremiumLeadManagerProvider";
import type { LeadManagerHistoryInput, LeadManagerProfileInput } from "@/lib/lead-managers/types";
import { supabaseAdmin } from "@/lib/supabase";

function dataConfidence(value: string | null | undefined) {
  return value === "high" || value === "low" || value === "medium" ? value : "medium";
}

function nullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function historyToDb(row: LeadManagerHistoryInput, leadManagerId: string) {
  return {
    current_price: nullableNumber(row.currentPrice),
    current_return_percent: nullableNumber(row.currentReturnPercent),
    data_confidence: dataConfidence(row.dataConfidence),
    day_30_close: nullableNumber(row.day30Close),
    day_30_return_percent: nullableNumber(row.day30ReturnPercent),
    day_90_close: nullableNumber(row.day90Close),
    day_90_return_percent: nullableNumber(row.day90ReturnPercent),
    exchange: row.exchange ?? null,
    ipo_name: row.ipoName,
    ipo_slug: row.ipoSlug ?? leadManagerSlug(row.ipoName),
    ipo_type: row.ipoType ?? "SME",
    issue_date: row.issueDate ?? null,
    issue_price: nullableNumber(row.issuePrice),
    issue_size_cr: nullableNumber(row.issueSizeCr),
    lead_manager_id: leadManagerId,
    listing_date: row.listingDate ?? null,
    listing_gain_amount: nullableNumber(row.listingGainAmount),
    listing_gain_percent: nullableNumber(row.listingGainPercent),
    listing_price: nullableNumber(row.listingPrice),
    lot_size: nullableNumber(row.lotSize),
    market_maker: row.marketMaker ?? null,
    price_band: row.priceBand ?? null,
    retail_subscription: nullableNumber(row.retailSubscription),
    source: row.source ?? null,
    source_url: row.sourceUrl ?? null,
    status: row.status ?? null,
    total_subscription: nullableNumber(row.totalSubscription),
    updated_at: new Date().toISOString(),
  };
}

export async function upsertLeadManagerProfile(profile: LeadManagerProfileInput) {
  const slug = profile.slug ?? leadManagerSlug(profile.name);
  const { data: existing } = await supabaseAdmin.from("lead_managers").select("id").eq("slug", slug).maybeSingle();

  const payload = {
    address: profile.address ?? null,
    data_confidence: dataConfidence(profile.dataConfidence),
    description: profile.description ?? null,
    discovery_confidence: dataConfidence(profile.discoveryConfidence ?? profile.dataConfidence),
    email: profile.email ?? null,
    import_status: profile.importStatus ?? "imported",
    last_imported_at: profile.importStatus === "queued" || profile.importStatus === "needs_review" ? null : new Date().toISOString(),
    lead_manager_profile_url: profile.leadManagerProfileUrl ?? profile.sourceUrl ?? null,
    name: profile.name,
    phone: profile.phone ?? null,
    sebi_registration_no: profile.sebiRegistrationNo ?? null,
    slug,
    source: profile.source ?? null,
    source_url: profile.sourceUrl ?? null,
    type: profile.type ?? "merchant_banker",
    updated_at: new Date().toISOString(),
    website: profile.website ?? null,
  };

  if (existing?.id) {
    const { data, error } = await supabaseAdmin.from("lead_managers").update(payload).eq("id", existing.id).select("*").single();
    if (error) throw error;
    return data as { id: string };
  }

  const { data, error } = await supabaseAdmin.from("lead_managers").insert(payload).select("*").single();
  if (error) throw error;
  return data as { id: string };
}

export async function insertLeadManagerHistory(leadManagerId: string, history: LeadManagerHistoryInput[]) {
  let recordsSaved = 0;

  for (const row of history) {
    const payload = historyToDb(row, leadManagerId);
    const query = supabaseAdmin
      .from("lead_manager_ipo_history")
      .select("id")
      .eq("lead_manager_id", leadManagerId)
      .eq("ipo_name", row.ipoName)
      .limit(1);
    const { data: existing } = await (row.listingDate ? query.eq("listing_date", row.listingDate) : query);

    if (existing?.[0]?.id) {
      await supabaseAdmin.from("lead_manager_ipo_history").update(payload).eq("id", existing[0].id);
    } else {
      await supabaseAdmin.from("lead_manager_ipo_history").insert(payload);
    }
    recordsSaved += 1;
  }

  return recordsSaved;
}

export async function recalculateLeadManagerTrackRecord(leadManagerId: string) {
  const { data, error } = await supabaseAdmin.from("lead_manager_ipo_history").select("*").eq("lead_manager_id", leadManagerId);
  if (error) throw error;

  const history = (data ?? []).map((row) => ({
    day30ReturnPercent: row.day_30_return_percent,
    day90ReturnPercent: row.day_90_return_percent,
    ipoName: row.ipo_name,
    listingGainPercent: row.listing_gain_percent,
    totalSubscription: row.total_subscription,
  }));
  const score = calculateLeadManagerScore(history);

  const { error: insertError } = await supabaseAdmin.from("lead_manager_track_record_scores").insert({
    average_30_day_return_percent: score.average30DayReturnPercent,
    average_90_day_return_percent: score.average90DayReturnPercent,
    average_listing_gain_percent: score.averageListingGainPercent,
    average_subscription: score.averageSubscription,
    calculated_at: new Date().toISOString(),
    compliance_flag_count: 0,
    consistency_score: score.dataConfidence === "High" ? 85 : score.dataConfidence === "Medium" ? 60 : 35,
    final_track_record_score: score.finalScore,
    flat_listing_count: score.flatListingCount,
    lead_manager_id: leadManagerId,
    liquidity_quality_score: null,
    median_30_day_return_percent: score.median30DayReturnPercent,
    median_90_day_return_percent: score.median90DayReturnPercent,
    median_listing_gain_percent: score.medianListingGainPercent,
    median_subscription: score.medianSubscription,
    negative_listing_count: score.negativeListingCount,
    non_negative_listing_percent: score.nonNegativeListingPercent,
    period: "3Y",
    positive_listing_count: score.positiveListingCount,
    positive_listing_percent: score.positiveListingPercent,
    severe_negative_count: score.severeNegativeCount,
    total_ipos_managed: score.totalIposManaged,
  });

  if (insertError) throw insertError;
  return score;
}

export async function saveLeadManagerImport(input: { history: LeadManagerHistoryInput[]; profile: LeadManagerProfileInput }) {
  const manager = await upsertLeadManagerProfile(input.profile);
  const recordsSaved = await insertLeadManagerHistory(manager.id, input.history);
  const score = await recalculateLeadManagerTrackRecord(manager.id);

  return {
    leadManagerId: manager.id,
    recordsSaved,
    score,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function importIPOPremiumLeadManagerDirectory(input: { limit?: number } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 50);
  const directory = await fetchIPOPremiumLeadManagerDirectory(limit);
  const errors: string[] = [];
  let recordsFound = 0;
  let recordsSaved = 0;
  let managersSaved = 0;

  for (const [index, entry] of directory.entries()) {
    const parsed = await ipoPremiumLeadManagerProvider.fetch({ sourceUrl: entry.sourceUrl });
    recordsFound += parsed.recordsFound;

    if (parsed.profile) {
      const saved = await saveLeadManagerImport({
        history: parsed.history,
        profile: {
          ...parsed.profile,
          description: parsed.profile.description ?? null,
          sourceUrl: entry.sourceUrl,
        },
      });
      recordsSaved += saved.recordsSaved;
      managersSaved += 1;
    }

    for (const error of parsed.errors) {
      errors.push(`${entry.name}: ${error}`);
    }

    if (index < directory.length - 1) {
      await sleep(450);
    }
  }

  return {
    directoryFound: directory.length,
    errors,
    managersSaved,
    recordsFound,
    recordsSaved,
    status: errors.length && managersSaved ? "PARTIAL_SUCCESS" : errors.length ? "FAILED" : "SUCCESS",
  };
}
