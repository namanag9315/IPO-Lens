import { runPublicDataSync as runProviderDataSync } from "@/lib/ipo-data/providerRunner";
import { emptySummary, insertAggregateSyncLog, shouldRunSync, summarizeProviderResult } from "@/lib/ipo-data/sync/syncGuards";
import type { CronSyncSummary, SyncRunOptions } from "@/lib/ipo-data/sync/types";

export async function runGmpSync(options: SyncRunOptions): Promise<CronSyncSummary> {
  const startedAt = new Date().toISOString();
  const guard = await shouldRunSync("gmp", options);

  if (!guard.canRun) {
    const summary = emptySummary({
      skippedReason: guard.skippedReason,
      startedAt,
      status: guard.status ?? "SKIPPED",
      triggeredBy: options.triggeredBy,
    });
    await insertAggregateSyncLog({
      ...summary,
      dataType: "gmp",
      errorMessage: guard.status === "FAILED" ? guard.skippedReason : null,
      triggeredByUserId: options.triggeredByUserId,
    });
    return summary;
  }

  const providerResult = await runProviderDataSync("gmp", {
    force: true,
    seedMissingIpos: options.seedMissingIpos === true,
    triggeredBy: options.triggeredBy,
    triggeredByUserId: options.triggeredByUserId ?? null,
  });
  const summary = summarizeProviderResult({
    dataType: "gmp",
    providerResult,
    startedAt,
    triggeredBy: options.triggeredBy,
  });

  await insertAggregateSyncLog({
    ...summary,
    dataType: "gmp",
    errorMessage: summary.errorMessage,
    triggeredByUserId: options.triggeredByUserId,
  });

  const { errorMessage: _errorMessage, ...publicSummary } = summary;
  return publicSummary;
}
