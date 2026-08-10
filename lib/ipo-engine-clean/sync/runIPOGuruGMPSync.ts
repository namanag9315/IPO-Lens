import { fetchIPOGMPFromIPOGuru } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruProvider";
import { isIPOGuruConfigured } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruClient";
import {
  createRun,
  disabledResult,
  emptyCleanResult,
  finishRun,
  loadMatchingContext,
  shouldSkipForKillSwitch,
  stageSourceRecord,
} from "@/lib/ipo-engine-clean/sync/common";
import { matchIPONameClean } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { saveFactsClean } from "@/lib/ipo-engine-clean/saveFactsClean";
import { supabaseAdmin } from "@/lib/supabase";
import type { CleanSyncResult, GMPRecord } from "@/lib/ipo-engine-clean/types";

async function saveIPOGuruGMP(record: GMPRecord, ipoId: string) {
  const duplicateWindowStart = new Date(Date.now() - 15 * 60_000);

  const recent = await supabaseAdmin
    .from("ipo_gmp_history_clean")
    .select("id")
    .eq("ipo_id", ipoId)
    .eq("gmp_value", record.gmpValue)
    .gte("captured_at", duplicateWindowStart.toISOString())
    .limit(1);

  if (recent.error) return { error: recent.error.message, saved: false };
  if ((recent.data ?? []).length > 0) return { reason: "duplicate_same_values_recent", saved: false };

  const { error } = await supabaseAdmin.from("ipo_gmp_history_clean").insert({
    ipo_id: ipoId,
    gmp_value: record.gmpValue,
    gmp_pct: record.gmpPct ?? null,
    estimated_listing_price: record.estimatedListingPrice ?? null,
    source_provider: "IPO_GURU_API",
    source_url: null,
    captured_at: new Date().toISOString(),
  });


  if (error) return { error: error.message, saved: false };

  await saveFactsClean({
    facts: [
      {
        confidence: "medium",
        displayValue: record.gmpValue === null ? null : `₹${record.gmpValue}`,
        factKey: "latest_gmp",
        factValue: {
          gmpValue: record.gmpValue,
          gmpPct: record.gmpPct,
          estimatedListingPrice: record.estimatedListingPrice,
        },
      },
    ],
    ipoId,
    sourcePriority: 25,
    sourceProvider: "IPO_GURU_API",
    sourceUrl: null,
  });

  return { saved: true };
}

export async function runIPOGuruGMPSync(): Promise<CleanSyncResult> {
  if (shouldSkipForKillSwitch()) return { ...disabledResult(), syncType: "gmp" as const };

  if (!isIPOGuruConfigured()) {
    console.warn("[IPOGuruGMPSync] IPO_GURU_API not configured, skipping.");
    return {
      ...emptyCleanResult({ provider: "IPO_GURU_API", status: "skipped", syncType: "gmp" }),
      status: "skipped",
    };
  }

  let runId: string | null = null;
  try {
    const run = await createRun("gmp", "IPO_GURU_API");
    runId = run.id;

    const fetched = await fetchIPOGMPFromIPOGuru();
    if (!fetched.ok) {
      const result = emptyCleanResult({
        errors: [fetched.error ?? "IPO Guru GMP fetch failed."],
        failed: 1,
        provider: "IPO_GURU_API",
        status: "failed",
        success: false,
        syncType: "gmp",
      });
      await finishRun(runId, result);
      return result;
    }

    const context = await loadMatchingContext();
    let matched = 0;
    let saved = 0;
    let skipped = 0;
    const saveErrors: string[] = [];
    const saveWarnings: string[] = [];

    for (const gmpRecord of fetched.records) {
      const match = matchIPONameClean({
        aliases: context.aliases,
        existingIpos: context.ipos,
        provider: "IPO_GURU_API",
        rawName: gmpRecord.rawName,
      });

      await stageSourceRecord({
        match,
        provider: "IPO_GURU_API",
        record: gmpRecord,
        runId,
        status: match.confidence >= 85 ? "matched" : match.confidence >= 70 ? "needs_review" : "ignored",
      });

      if (match.ipoId && match.confidence >= 85) {
        matched += 1;
        const saveResult = await saveIPOGuruGMP(gmpRecord, match.ipoId);
        if (saveResult.saved) saved += 1;
        else {
          skipped += 1;
          if (saveResult.error) saveErrors.push(`${gmpRecord.rawName}: ${saveResult.error}`);
          if (saveResult.reason) saveWarnings.push(`${gmpRecord.rawName}: ${saveResult.reason}`);
        }
      } else {
        skipped += 1;
      }
    }

    const result = emptyCleanResult({
      errors: saveErrors,
      found: fetched.records.length,
      matched,
      provider: "IPO_GURU_API",
      saved,
      skipped,
      status: saveErrors.length ? "partial" : "success",
      syncType: "gmp",
      warnings: saveWarnings,
    });
    await finishRun(runId, result);
    return result;
  } catch (error) {
    const result = emptyCleanResult({
      errors: [error instanceof Error ? error.message : "IPO Guru GMP sync failed."],
      failed: 1,
      provider: "IPO_GURU_API",
      status: "failed",
      success: false,
      syncType: "gmp",
    });
    await finishRun(runId, result);
    return result;
  }
}
