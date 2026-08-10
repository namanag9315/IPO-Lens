import { dataConfidence } from "@/lib/ipo-data/dataQuality";
import { isSnapshotStale } from "@/lib/ipo-data/dataFreshness";
import { normalizeIPOName } from "@/lib/ipo-data/normalizeIPOName";
import { matchIPOByName, type IPOAlias } from "@/lib/ipo-data/matchIPOByName";
import { investorGainGmpProvider } from "@/lib/ipo-data/providers/investorGainGmpProvider";
import { investorGainSubscriptionProvider } from "@/lib/ipo-data/providers/investorGainSubscriptionProvider";
import { ipoGuruGmpProvider } from "@/lib/ipo-data/providers/ipoGuruGmpProvider";
import { ipoWatchGmpProvider } from "@/lib/ipo-data/providers/ipoWatchGmpProvider";
import { ipoWatchSubscriptionProvider } from "@/lib/ipo-data/providers/ipoWatchSubscriptionProvider";
import type { GMPDataPoint, PublicDataProvider, PublicDataType, SubscriptionDataPoint } from "@/lib/ipo-data/providers/baseProvider";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

interface IPOReference {
  id: string;
  slug: string;
  name: string;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  status: string;
}

interface SyncLogInput {
  dataType: PublicDataType | "ipo_detail";
  errorMessage?: string | null;
  finishedAt?: string | null;
  provider: string;
  recordsFound: number;
  recordsAutoMatched?: number;
  recordsSaved: number;
  recordsSentToReview?: number;
  recordsIgnoredLowConfidence?: number;
  recordsFailed?: number;
  startedAt: string;
  status: "success" | "partial" | "failed" | "skipped";
  triggeredBy?: string | null;
  triggeredByUserId?: string | null;
  unmatchedRecords?: number;
}

export interface PublicDataSyncResult {
  dataType: PublicDataType | "ipo_detail";
  providers: Array<{
    errorMessage: string | null;
    iposCreated?: number;
    provider: string;
    recordsFound: number;
    recordsAutoMatched?: number;
    recordsSaved: number;
    recordsSentToReview?: number;
    recordsIgnoredLowConfidence?: number;
    recordsFailed?: number;
    status: string;
    unmatchedRecords: number;
  }>;
  skipped: boolean;
}

const gmpProviders: Array<PublicDataProvider<GMPDataPoint>> = [ipoGuruGmpProvider, investorGainGmpProvider, ipoWatchGmpProvider];
const subscriptionProviders: Array<PublicDataProvider<SubscriptionDataPoint>> = [
  investorGainSubscriptionProvider,
  ipoWatchSubscriptionProvider,
];

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Provider failed.";
}

function nowIso() {
  return new Date().toISOString();
}

function isActiveIPO(ipo: IPOReference) {
  const today = nowIso().slice(0, 10);
  if (ipo.status === "open") return true;
  const start = ipo.open_date ?? ipo.close_date;
  const end = ipo.listing_date ?? ipo.close_date;
  return Boolean(start && end && start <= today && end >= today);
}

async function getIPOReferences() {
  const { data, error } = await supabaseAdmin
    .from("ipos")
    .select("id, slug, name, open_date, close_date, listing_date, status")
    .order("close_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as IPOReference[];
}

async function getIPOAliases() {
  const { data, error } = await supabaseAdmin.from("ipo_aliases").select("*");
  if (error) return [];
  return data as IPOAlias[];
}

async function latestSnapshotCapturedAt(dataType: PublicDataType) {
  const table = dataType === "gmp" ? "ipo_gmp_snapshots" : "ipo_subscription_snapshots";
  const { data, error } = await supabaseAdmin.from(table).select("captured_at").order("captured_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return null;
  return (data as { captured_at?: string } | null)?.captured_at ?? null;
}

async function shouldSync(dataType: PublicDataType, force = false) {
  if (force) return true;
  const ipos = await getIPOReferences();
  if (!ipos.some(isActiveIPO)) return false;
  return isSnapshotStale(await latestSnapshotCapturedAt(dataType), 1);
}

function slugifyIPOName(value: string) {
  const normalized = normalizeIPOName(value);
  return normalized.replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
}

function statusFromPublicValue(value: string | null | undefined) {
  if (!value) return null;
  if (/open/i.test(value)) return "open";
  if (/upcoming/i.test(value)) return "upcoming";
  return null;
}

async function seedMissingIPOsFromGmp(points: GMPDataPoint[], ipos: IPOReference[], aliases: IPOAlias[], providerName: string) {
  const existingSlugs = new Set(ipos.map((ipo) => ipo.slug));
  const seenSlugs = new Set<string>();
  const rows = [];

  for (const point of points) {
    const status = statusFromPublicValue(point.status);
    const slug = slugifyIPOName(point.ipoName);

    if (!status || !slug || existingSlugs.has(slug) || seenSlugs.has(slug)) continue;

    const match = matchIPOByName(point.ipoName, providerName, ipos, aliases);
    if (match && match.score >= 0.85) continue; // Already exists or closely matches

    seenSlugs.add(slug);
    rows.push({
      category: point.category ?? null,
      close_date: point.closeDate ?? null,
      name: point.ipoName,
      open_date: point.openDate ?? null,
      price_band_high: point.issuePrice,
      price_band_low: point.issuePrice,
      slug,
      status,
    });
  }

  if (rows.length === 0) return 0;
  const { error } = await supabaseAdmin.from("ipos").upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
  if (error) throw error;
  return rows.length;
}

export async function insertLog(input: SyncLogInput) {
  const status =
    input.status === "success"
      ? "SUCCESS"
      : input.status === "partial"
        ? "PARTIAL_SUCCESS"
        : input.status === "failed"
          ? "FAILED"
          : "SKIPPED";

  const legacyPayload = {
    data_type: input.dataType,
    error_message: input.errorMessage ?? null,
    finished_at: input.finishedAt ?? nowIso(),
    provider: input.provider,
    records_found: input.recordsFound,
    records_saved: input.recordsSaved,
    started_at: input.startedAt,
    status,
    unmatched_records: input.unmatchedRecords ?? 0,
    triggered_by: input.triggeredBy ?? null,
    triggered_by_user_id: input.triggeredByUserId ?? null,
  };

  try {
    const { error } = await supabaseAdmin.from("ipo_data_sync_logs").insert(legacyPayload);
    if (error) console.warn("Unable to insert provider sync log", error.message);
  } catch {
    // Sync logs are useful diagnostics but should not break execution
  }
}

function providerKey(providerName: string) {
  const knownKeys: Record<string, string> = {
    "InvestorGain GMP": "investor_gain_gmp",
    "InvestorGain Subscription": "investor_gain_subscription",
    "IPO Guru GMP": "ipo_guru_gmp",
    "IPOWatch GMP": "ipo_watch_gmp",
    "IPOWatch Subscription": "ipo_watch_subscription",
  };
  if (knownKeys[providerName]) return knownKeys[providerName];
  return providerName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function updateProviderHealth(provider: string, status: "success" | "partial" | "failed" | "skipped", errorMessage?: string | null) {
  try {
    await supabaseAdmin
      .from("ipo_data_providers")
      .update({
        failure_count: status === "failed" ? 1 : 0,
        last_error: errorMessage ?? null,
        last_failure_at: status === "failed" ? nowIso() : null,
        last_success_at: status !== "failed" ? nowIso() : null,
        updated_at: nowIso(),
      })
      .eq("provider_key", providerKey(provider));
  } catch {
    // optional
  }
}

async function queueUnmatchedRecord(payload: any, provider: string, dataType: string, sourceName: string, sourceUrl: string | null, scrapedName: string, matchScore: number | undefined, suggestedIpoId: string | null) {
  try {
    await supabaseAdmin.from("ipo_unmatched_source_records").insert({
      provider,
      data_type: dataType,
      source_name: sourceName,
      source_url: sourceUrl,
      raw_name: scrapedName,
      normalized_name: normalizeIPOName(scrapedName),
      suggested_ipo_id: suggestedIpoId,
      confidence: matchScore,
      payload,
      status: "needs_review"
    });
  } catch (e) {
    console.error("Failed to queue unmatched record:", e);
  }
}

export async function saveGmpSnapshots(points: GMPDataPoint[], ipos: IPOReference[], aliases: IPOAlias[], providerName: string) {
  const rows = [];
  let recordsAutoMatched = 0;
  let recordsSentToReview = 0;
  let recordsIgnoredLowConfidence = 0;
  let unmatched = 0;

  for (const point of points) {
    const match = matchIPOByName(point.ipoName, providerName, ipos, aliases);

    if (!match || match.score < 0.7) {
      recordsIgnoredLowConfidence++;
      unmatched++;
      continue;
    }

    if (match.score >= 0.7 && match.score < 0.85) {
      recordsSentToReview++;
      unmatched++;
      await queueUnmatchedRecord(point, providerName, "gmp", point.source, point.sourceUrl ?? null, point.ipoName, match.score, match.ipo.id);
      continue;
    }

    recordsAutoMatched++;
    rows.push({
      captured_at: point.capturedAt,
      confidence: dataConfidence(match.score, point.gmp !== null),
      estimated_listing_price: point.estimatedListingPrice,
      gmp: point.gmp,
      gmp_percent: point.gmpPercent,
      ipo_id: match.ipo.id,
      issue_price: point.issuePrice,
      source: point.source,
      source_type: "public_reference",
      source_url: point.sourceUrl,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from("ipo_gmp_snapshots").insert(rows);
    if (error) throw error;
  }

  return { recordsSaved: rows.length, unmatched, recordsAutoMatched, recordsSentToReview, recordsIgnoredLowConfidence };
}

export async function saveSubscriptionSnapshots(points: SubscriptionDataPoint[], ipos: IPOReference[], aliases: IPOAlias[], providerName: string) {
  const rows = [];
  let recordsAutoMatched = 0;
  let recordsSentToReview = 0;
  let recordsIgnoredLowConfidence = 0;
  let unmatched = 0;

  for (const point of points) {
    const match = matchIPOByName(point.ipoName, providerName, ipos, aliases);

    if (!match || match.score < 0.7) {
      recordsIgnoredLowConfidence++;
      unmatched++;
      continue;
    }

    if (match.score >= 0.7 && match.score < 0.85) {
      recordsSentToReview++;
      unmatched++;
      await queueUnmatchedRecord(point, providerName, "subscription", point.source, point.sourceUrl ?? null, point.ipoName, match.score, match.ipo.id);
      continue;
    }

    recordsAutoMatched++;
    rows.push({
      captured_at: point.capturedAt,
      confidence: dataConfidence(match.score, point.totalTimes !== null || point.retailTimes !== null),
      employee_times: point.employeeTimes,
      ipo_id: match.ipo.id,
      nii_times: point.niiTimes,
      qib_times: point.qibTimes,
      retail_times: point.retailTimes,
      shareholder_times: point.shareholderTimes,
      source: point.source,
      source_type: "public_reference",
      source_url: point.sourceUrl,
      total_times: point.totalTimes,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from("ipo_subscription_snapshots").insert(rows);
    if (error) throw error;
  }

  return { recordsSaved: rows.length, unmatched, recordsAutoMatched, recordsSentToReview, recordsIgnoredLowConfidence };
}

export async function runPublicDataSync(
  dataType: PublicDataType,
  options: { force?: boolean; seedMissingIpos?: boolean; triggeredBy?: string | null; triggeredByUserId?: string | null } = {},
): Promise<PublicDataSyncResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (!(await shouldSync(dataType, options.force))) {
    return { dataType, providers: [], skipped: true };
  }

  let ipos = await getIPOReferences();
  const aliases = await getIPOAliases();
  const providers = dataType === "gmp" ? gmpProviders : subscriptionProviders;
  const providerResults: PublicDataSyncResult["providers"] = [];

  for (const provider of providers) {
    const startedAt = nowIso();
    let recordsFound = 0;

    try {
      const result = await provider.fetch();
      recordsFound = result.data.length;

      const iposCreated = dataType === "gmp" && options.seedMissingIpos
        ? await seedMissingIPOsFromGmp(result.data as GMPDataPoint[], ipos, aliases, provider.name)
        : 0;

      if (iposCreated > 0) {
        ipos = await getIPOReferences();
      }

      const saveResult = dataType === "gmp"
        ? await saveGmpSnapshots(result.data as GMPDataPoint[], ipos, aliases, provider.name)
        : await saveSubscriptionSnapshots(result.data as SubscriptionDataPoint[], ipos, aliases, provider.name);

      const status: SyncLogInput["status"] = saveResult.recordsSaved > 0 ? "success" : result.data.length > 0 ? "partial" : "skipped";
      const errorMessage = saveResult.unmatched > 0 ? `${saveResult.unmatched} unmatched records skipped due to low confidence.` : null;

      await insertLog({
        dataType,
        errorMessage,
        finishedAt: nowIso(),
        provider: provider.name,
        recordsFound: result.data.length,
        recordsAutoMatched: saveResult.recordsAutoMatched,
        recordsSaved: saveResult.recordsSaved,
        recordsSentToReview: saveResult.recordsSentToReview,
        recordsIgnoredLowConfidence: saveResult.recordsIgnoredLowConfidence,
        startedAt,
        status,
        triggeredBy: options.triggeredBy ?? null,
        triggeredByUserId: options.triggeredByUserId ?? null,
        unmatchedRecords: saveResult.unmatched,
      });
      await updateProviderHealth(provider.name, status, errorMessage);

      providerResults.push({
        errorMessage,
        iposCreated,
        provider: provider.name,
        recordsFound: result.data.length,
        recordsAutoMatched: saveResult.recordsAutoMatched,
        recordsSaved: saveResult.recordsSaved,
        recordsSentToReview: saveResult.recordsSentToReview,
        recordsIgnoredLowConfidence: saveResult.recordsIgnoredLowConfidence,
        status,
        unmatchedRecords: saveResult.unmatched,
      });
    } catch (error) {
      const message = errorMessage(error);
      await insertLog({
        dataType,
        errorMessage: message,
        finishedAt: nowIso(),
        provider: provider.name,
        recordsFound,
        recordsSaved: 0,
        recordsFailed: recordsFound,
        startedAt,
        status: "failed",
        triggeredBy: options.triggeredBy ?? null,
        triggeredByUserId: options.triggeredByUserId ?? null,
      });
      await updateProviderHealth(provider.name, "failed", message);

      providerResults.push({
        errorMessage: message,
        iposCreated: 0,
        provider: provider.name,
        recordsFound,
        recordsSaved: 0,
        recordsFailed: recordsFound,
        status: "failed",
        unmatchedRecords: 0,
      });
    }
  }

  return { dataType, providers: providerResults, skipped: false };
}
