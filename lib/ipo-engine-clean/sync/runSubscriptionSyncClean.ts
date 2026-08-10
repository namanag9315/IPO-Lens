import { parseIPOWatchSubscription } from "@/lib/ipo-engine-clean/providers/ipoWatchProvider";
import { createRun, disabledResult, emptyCleanResult, fetchConfiguredSource, finishRun, IPOWATCH_SUBSCRIPTION_URL, loadMatchingContext, shouldSkipForKillSwitch, stageSourceRecord } from "@/lib/ipo-engine-clean/sync/common";
import { matchIPONameClean } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { saveFactsClean } from "@/lib/ipo-engine-clean/saveFactsClean";
import { supabaseAdmin } from "@/lib/supabase";
import type { SubscriptionRecord } from "@/lib/ipo-engine-clean/types";

async function saveSubscription(record: SubscriptionRecord, ipoId: string) {
  const now = new Date();
  const minuteStart = new Date(now);
  minuteStart.setUTCMinutes(Math.floor(now.getUTCMinutes() / 5) * 5, 0, 0);
  const duplicateWindowStart = new Date(now.getTime() - 15 * 60_000);

  let existingQuery = supabaseAdmin
    .from("ipo_subscription_history_clean")
    .select("id")
    .eq("ipo_id", ipoId)
    .eq("source_provider", "IPOWATCH")
    .gte("captured_at", duplicateWindowStart.toISOString())
    .limit(1);

  existingQuery = record.totalX === null ? existingQuery.is("total_x", null) : existingQuery.eq("total_x", record.totalX);
  existingQuery = record.qibX === null ? existingQuery.is("qib_x", null) : existingQuery.eq("qib_x", record.qibX);
  existingQuery = record.niiX === null ? existingQuery.is("nii_x", null) : existingQuery.eq("nii_x", record.niiX);
  existingQuery = record.retailX === null ? existingQuery.is("retail_x", null) : existingQuery.eq("retail_x", record.retailX);
  const existing = await existingQuery;
  if (existing.error) return { error: existing.error.message, saved: false };
  if ((existing.data ?? []).length > 0) return { reason: "duplicate_same_values_recent", saved: false };

  const { error } = await supabaseAdmin.from("ipo_subscription_history_clean").insert({
    captured_minute: minuteStart.toISOString(),
    ipo_id: ipoId,
    nii_x: record.niiX,
    qib_x: record.qibX,
    retail_x: record.retailX,
    source_provider: "IPOWATCH",
    source_url: record.sourceUrl,
    total_x: record.totalX,
  });
  if (error) return { error: error.message, saved: false };
  await saveFactsClean({
    facts: [{ confidence: "medium", displayValue: record.totalX === null ? null : `${record.totalX}x`, factKey: "latest_subscription", factValue: { niiX: record.niiX, qibX: record.qibX, retailX: record.retailX, totalX: record.totalX } }],
    ipoId,
    sourcePriority: 40,
    sourceProvider: "IPOWATCH",
    sourceUrl: record.sourceUrl,
  });
  return { saved: true };
}

export async function runSubscriptionSyncClean() {
  if (shouldSkipForKillSwitch()) return { ...disabledResult(), syncType: "subscription" as const };
  let runId: string | null = null;
  try {
    const run = await createRun("subscription", "IPOWATCH");
    runId = run.id;
    const fetched = await fetchConfiguredSource("IPOWATCH", "subscription", IPOWATCH_SUBSCRIPTION_URL);
    if (!fetched.ok || !fetched.html) {
      const result = emptyCleanResult({ errors: [fetched.error ?? "Fetch failed."], failed: 1, provider: "IPOWATCH", status: fetched.blocked ? "skipped" : "failed", success: false, syncType: "subscription" });
      await finishRun(runId, result, { fetched });
      return result;
    }
    const records = parseIPOWatchSubscription(fetched.html, IPOWATCH_SUBSCRIPTION_URL);
    const context = await loadMatchingContext();
    let matched = 0;
    let saved = 0;
    let skipped = 0;
    const saveErrors: string[] = [];
    const saveWarnings: string[] = [];
    for (const record of records) {
      const match = matchIPONameClean({ aliases: context.aliases, existingIpos: context.ipos, provider: "IPOWATCH", rawName: record.rawName });
      await stageSourceRecord({ match, provider: "IPOWATCH", record, runId, status: match.confidence >= 85 ? "matched" : match.confidence >= 70 ? "needs_review" : "ignored" });
      if (match.ipoId && match.confidence >= 85) {
        matched += 1;
        const saveResult = await saveSubscription(record, match.ipoId);
        if (saveResult.saved) saved += 1;
        else {
          skipped += 1;
          if (saveResult.error) saveErrors.push(`${record.rawName}: ${saveResult.error}`);
          if (saveResult.reason) saveWarnings.push(`${record.rawName}: ${saveResult.reason}`);
        }
      } else skipped += 1;
    }
    const result = emptyCleanResult({
      errors: saveErrors,
      found: records.length,
      matched,
      provider: "IPOWATCH",
      saved,
      skipped,
      status: saveErrors.length ? "partial" : "success",
      syncType: "subscription",
      warnings: saveWarnings,
    });
    await finishRun(runId, result);
    return result;
  } catch (error) {
    const result = emptyCleanResult({ errors: [error instanceof Error ? error.message : "Subscription sync failed."], failed: 1, status: "failed", success: false, syncType: "subscription" });
    await finishRun(runId, result);
    return result;
  }
}
