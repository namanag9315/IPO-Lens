import { disabledResult, emptyCleanResult, shouldSkipForKillSwitch } from "@/lib/ipo-engine-clean/sync/common";
import { runDetailSyncClean } from "@/lib/ipo-engine-clean/sync/runDetailSyncClean";
import { runGMPSyncClean } from "@/lib/ipo-engine-clean/sync/runGMPSyncClean";
import { runIPOGuruListSync } from "@/lib/ipo-engine-clean/sync/runIPOGuruListSync";
import { runIPOListSyncClean } from "@/lib/ipo-engine-clean/sync/runIPOListSyncClean";
import { runSubscriptionSyncClean } from "@/lib/ipo-engine-clean/sync/runSubscriptionSyncClean";
import type { CleanSyncResult } from "@/lib/ipo-engine-clean/types";

function combine(results: CleanSyncResult[]): CleanSyncResult {
  const errors = results.flatMap((result) => result.errors);
  const warnings = results.flatMap((result) => result.warnings);
  const failedStages = results.filter((result) => result.status === "failed").length;
  const successfulStages = results.filter((result) => result.status === "success" || result.status === "partial").length;

  return emptyCleanResult({
    errors,
    failed: results.reduce((sum, result) => sum + result.failed, 0),
    found: results.reduce((sum, result) => sum + result.found, 0),
    matched: results.reduce((sum, result) => sum + result.matched, 0),
    provider: "CLEAN_ENGINE",
    saved: results.reduce((sum, result) => sum + result.saved, 0),
    skipped: results.reduce((sum, result) => sum + result.skipped, 0),
    status: failedStages === results.length ? "failed" : failedStages > 0 || warnings.length > 0 ? "partial" : "success",
    success: successfulStages > 0,
    syncType: "full",
    warnings,
  });
}

export async function runFullSyncClean(): Promise<CleanSyncResult> {
  if (shouldSkipForKillSwitch()) return { ...disabledResult(), syncType: "full" as const };

  const results: CleanSyncResult[] = [];
  for (const runner of [runIPOGuruListSync, runIPOListSyncClean, runDetailSyncClean, runGMPSyncClean, runSubscriptionSyncClean]) {
    try {
      results.push(await runner());
    } catch (error) {
      results.push(
        emptyCleanResult({
          errors: [error instanceof Error ? error.message : "Clean sync stage failed."],
          failed: 1,
          status: "failed",
          success: false,
          syncType: "full",
        }),
      );
    }
  }

  return combine(results);
}
