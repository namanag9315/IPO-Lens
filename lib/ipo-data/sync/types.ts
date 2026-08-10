export type SyncSummaryStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED" | "SKIPPED";
export type SyncTriggeredBy = "vercel_cron" | "admin_manual" | "legacy_route";

export interface CronSyncSummary {
  finishedAt: string;
  providersRun: number;
  recordsFound: number;
  recordsSaved: number;
  skippedReason: string | null;
  startedAt: string;
  status: SyncSummaryStatus;
  triggeredBy: SyncTriggeredBy;
  unmatchedRecords: number;
}

export interface SyncRunOptions {
  force?: boolean;
  includeResearch?: boolean;
  maxResearchRecords?: number;
  seedMissingIpos?: boolean;
  triggeredBy: SyncTriggeredBy;
  triggeredByUserId?: string | null;
}
