import { runIPOGuruResearchSync } from "@/lib/ipo-data/researchRunner";
import { emptySummary, insertAggregateSyncLog, nowIso } from "@/lib/ipo-data/sync/syncGuards";
import { runGmpSync } from "@/lib/ipo-data/sync/runGmpSync";
import { runSubscriptionSync } from "@/lib/ipo-data/sync/runSubscriptionSync";
import type { CronSyncSummary, SyncRunOptions, SyncSummaryStatus } from "@/lib/ipo-data/sync/types";

function combinedStatus(gmp: CronSyncSummary, subscription: CronSyncSummary): { skippedReason: string | null; status: SyncSummaryStatus } {
  const statuses = [gmp.status, subscription.status];

  if (statuses.every((status) => status === "SKIPPED")) {
    return {
      skippedReason: [gmp.skippedReason, subscription.skippedReason].filter(Boolean).join(" ") || "No public data sync was needed.",
      status: "SKIPPED",
    };
  }

  if (statuses.every((status) => status === "FAILED")) {
    return { skippedReason: null, status: "FAILED" };
  }

  if (statuses.some((status) => status === "FAILED" || status === "PARTIAL_SUCCESS")) {
    return { skippedReason: null, status: "PARTIAL_SUCCESS" };
  }

  return { skippedReason: null, status: "SUCCESS" };
}

export async function runPublicDataSync(options: SyncRunOptions): Promise<
  CronSyncSummary & {
    enrichmentJobCreated: boolean;
    enrichmentJobId: string | null;
    enrichmentSkippedReason: string | null;
    gmp: CronSyncSummary;
    leadManagerDiscoveryFailures: number;
    leadManagerImportsQueued: number;
    leadManagersDiscovered: number;
    leadManagersLinked: number;
    missingFieldsDetected: number;
    subscription: CronSyncSummary;
  }
> {
  const startedAt = nowIso();
  const gmp = await runGmpSync(options);
  const subscription = await runSubscriptionSync(options);
  const status = combinedStatus(gmp, subscription);
  let researchError: string | null = null;
  let leadManagersDiscovered = 0;
  let leadManagersLinked = 0;
  let leadManagerImportsQueued = 0;
  let leadManagerDiscoveryFailures = 0;
  let missingFieldsDetected = 0;
  let enrichmentJobCreated = false;
  let enrichmentJobId: string | null = null;
  let enrichmentSkippedReason: string | null = null;

  if (options.includeResearch !== false && (options.force || options.triggeredBy === "vercel_cron")) {
    try {
      const research = await runIPOGuruResearchSync({ maxRecords: options.maxResearchRecords ?? 15 });
      leadManagersDiscovered = research.providers.reduce((sum, provider) => sum + provider.leadManagersDiscovered, 0);
      leadManagersLinked = research.providers.reduce((sum, provider) => sum + provider.leadManagersLinked, 0);
      leadManagerImportsQueued = research.providers.reduce((sum, provider) => sum + provider.leadManagerImportsQueued, 0);
      leadManagerDiscoveryFailures = research.providers.reduce((sum, provider) => sum + provider.leadManagerDiscoveryFailures, 0);
      missingFieldsDetected = research.providers.reduce((sum, provider) => sum + provider.missingFieldsDetected, 0);
      const createdJob = research.providers.find((provider) => provider.enrichmentJobCreated && provider.enrichmentJobId);
      enrichmentJobCreated = Boolean(createdJob);
      enrichmentJobId = createdJob?.enrichmentJobId ?? null;
      enrichmentSkippedReason = research.providers.find((provider) => provider.enrichmentSkippedReason)?.enrichmentSkippedReason ?? null;
    } catch (error) {
      researchError = error instanceof Error ? error.message : "Research sync failed.";
    }
  }

  const summary = emptySummary({
    finishedAt: nowIso(),
    providersRun: gmp.providersRun + subscription.providersRun,
    recordsFound: gmp.recordsFound + subscription.recordsFound,
    recordsSaved: gmp.recordsSaved + subscription.recordsSaved,
    skippedReason: status.skippedReason,
    startedAt,
    status: researchError && status.status === "SUCCESS" ? "PARTIAL_SUCCESS" : status.status,
    triggeredBy: options.triggeredBy,
    unmatchedRecords: gmp.unmatchedRecords + subscription.unmatchedRecords,
  });

  await insertAggregateSyncLog({
    ...summary,
    dataType: "public_data",
    errorMessage: researchError,
    provider: "full_public_data_sync",
    triggeredByUserId: options.triggeredByUserId,
  });

  return {
    ...summary,
    enrichmentJobCreated,
    enrichmentJobId,
    enrichmentSkippedReason,
    gmp,
    leadManagerDiscoveryFailures,
    leadManagerImportsQueued,
    leadManagersDiscovered,
    leadManagersLinked,
    missingFieldsDetected,
    subscription,
  };
}
