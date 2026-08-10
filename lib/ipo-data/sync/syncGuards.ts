import { getDataFreshness, isSnapshotStale } from "@/lib/ipo-data/dataFreshness";
import type { PublicDataType } from "@/lib/ipo-data/providers/baseProvider";
import type { CronSyncSummary, SyncRunOptions, SyncSummaryStatus } from "@/lib/ipo-data/sync/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

interface IPOReference {
  close_date: string | null;
  id: string;
  listing_date: string | null;
  open_date: string | null;
  status: string | null;
}

export function nowIso() {
  return new Date().toISOString();
}

export function emptySummary(input: {
  finishedAt?: string;
  providersRun?: number;
  recordsFound?: number;
  recordsSaved?: number;
  skippedReason?: string | null;
  startedAt: string;
  status: SyncSummaryStatus;
  triggeredBy: SyncRunOptions["triggeredBy"];
  unmatchedRecords?: number;
}): CronSyncSummary {
  return {
    finishedAt: input.finishedAt ?? nowIso(),
    providersRun: input.providersRun ?? 0,
    recordsFound: input.recordsFound ?? 0,
    recordsSaved: input.recordsSaved ?? 0,
    skippedReason: input.skippedReason ?? null,
    startedAt: input.startedAt,
    status: input.status,
    triggeredBy: input.triggeredBy,
    unmatchedRecords: input.unmatchedRecords ?? 0,
  };
}

export async function latestSnapshotCapturedAt(dataType: PublicDataType) {
  const table = dataType === "gmp" ? "ipo_gmp_snapshots" : "ipo_subscription_snapshots";
  const { data, error } = await supabaseAdmin.from(table).select("captured_at").order("captured_at", { ascending: false }).limit(1).maybeSingle();

  if (error) {
    return null;
  }

  return (data as { captured_at?: string } | null)?.captured_at ?? null;
}

async function getIPOReferences() {
  const { data, error } = await supabaseAdmin
    .from("ipos")
    .select("id, open_date, close_date, listing_date, status")
    .order("close_date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as IPOReference[];
}

function isActiveIPO(ipo: IPOReference, latestCapturedAt: string | null) {
  const today = nowIso().slice(0, 10);
  const status = (ipo.status ?? "").toLowerCase();

  if (status === "open" || status === "upcoming" || status === "closed" || status === "allotment_pending") {
    return true;
  }

  const start = ipo.open_date ?? ipo.close_date;
  const end = ipo.listing_date ?? ipo.close_date;

  if (start && end && start <= today && end >= today) {
    return true;
  }

  return status !== "listed" && isSnapshotStale(latestCapturedAt, 24);
}

export async function shouldRunSync(dataType: PublicDataType, options: SyncRunOptions) {
  if (!isSupabaseConfigured()) {
    return {
      canRun: false,
      latestCapturedAt: null,
      skippedReason: "Supabase environment variables are not configured.",
      status: "FAILED" as const,
    };
  }

  const latestCapturedAt = await latestSnapshotCapturedAt(dataType);
  const ipos = await getIPOReferences();

  if (!ipos.some((ipo) => isActiveIPO(ipo, latestCapturedAt))) {
    return {
      canRun: false,
      latestCapturedAt,
      skippedReason: "No active IPOs require sync.",
      status: "SKIPPED" as const,
    };
  }

  if (!options.force && getDataFreshness(latestCapturedAt) === "Fresh") {
    return {
      canRun: false,
      latestCapturedAt,
      skippedReason: `Latest ${dataType} data is already fresh.`,
      status: "SKIPPED" as const,
    };
  }

  return {
    canRun: true,
    latestCapturedAt,
    skippedReason: null,
    status: null,
  };
}

export async function insertAggregateSyncLog(
  input: CronSyncSummary & { dataType: string; errorMessage?: string | null; provider?: string; triggeredByUserId?: string | null },
) {
  const status = input.status;
  const legacyPayload = {
    data_type: input.dataType,
    error_message: input.errorMessage ?? null,
    finished_at: input.finishedAt,
    provider: input.provider ?? "all_public_providers",
    records_found: input.recordsFound,
    records_saved: input.recordsSaved,
    started_at: input.startedAt,
    status,
  };

  try {
    const { error } = await supabaseAdmin.from("ipo_data_sync_logs").insert({
      ...legacyPayload,
      triggered_by: input.triggeredBy,
      triggered_by_user_id: input.triggeredByUserId ?? null,
      unmatched_records: input.unmatchedRecords,
    });

    if (!error) return;

    const { error: legacyError } = await supabaseAdmin.from("ipo_data_sync_logs").insert(legacyPayload);
    if (legacyError) {
      console.warn("Unable to insert sync log", legacyError.message);
    }
  } catch {
    // Aggregate sync logs should not break the user-facing/admin sync result.
  }
}

export function summarizeProviderResult(input: {
  dataType: string;
  providerResult: {
    providers: Array<{ errorMessage: string | null; recordsFound: number; recordsSaved: number; status: string; unmatchedRecords?: number }>;
    skipped: boolean;
  };
  skippedReason?: string | null;
  startedAt: string;
  triggeredBy: SyncRunOptions["triggeredBy"];
}): CronSyncSummary & { errorMessage: string | null } {
  const providers = input.providerResult.providers;
  const recordsFound = providers.reduce((sum, provider) => sum + provider.recordsFound, 0);
  const recordsSaved = providers.reduce((sum, provider) => sum + provider.recordsSaved, 0);
  const unmatchedRecords = providers.reduce((sum, provider) => sum + (provider.unmatchedRecords ?? 0), 0);
  const failed = providers.filter((provider) => provider.status === "failed");
  const partial = providers.filter((provider) => provider.status === "partial");
  const skipped = providers.filter((provider) => provider.status === "skipped");
  const finishedAt = nowIso();
  const errorMessage = providers.map((provider) => provider.errorMessage).filter(Boolean).join(" | ") || null;

  let status: SyncSummaryStatus = "SUCCESS";
  let skippedReason = input.skippedReason ?? null;

  if (input.providerResult.skipped || providers.length === 0 || skipped.length === providers.length) {
    status = "SKIPPED";
    skippedReason = skippedReason ?? "No provider records needed saving.";
  } else if (failed.length === providers.length) {
    status = "FAILED";
  } else if (failed.length > 0 || partial.length > 0) {
    status = "PARTIAL_SUCCESS";
  }

  return {
    errorMessage,
    finishedAt,
    providersRun: providers.length,
    recordsFound,
    recordsSaved,
    skippedReason,
    startedAt: input.startedAt,
    status,
    triggeredBy: input.triggeredBy,
    unmatchedRecords,
  };
}
