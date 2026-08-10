import { fetchIPOListFromIPOGuru } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruProvider";
import { mapIPOGuruEntry } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruMapper";
import { isIPOGuruConfigured, isIPOGuruEnabled } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruClient";
import {
  createRun,
  disabledResult,
  emptyCleanResult,
  finishRun,
  loadMatchingContext,
  rememberCleanAlias,
  shouldSkipForKillSwitch,
  stageSourceRecord,
  tryCreateIPOFromList,
} from "@/lib/ipo-engine-clean/sync/common";
import { matchIPONameClean } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { saveFactsClean } from "@/lib/ipo-engine-clean/saveFactsClean";
import { slugifyIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import type { CleanSyncResult } from "@/lib/ipo-engine-clean/types";

export async function runIPOGuruListSync(): Promise<CleanSyncResult> {
  if (shouldSkipForKillSwitch()) return { ...disabledResult(), syncType: "ipo_list" as const };

  if (!isIPOGuruConfigured()) {
    console.warn("[IPOGuruListSync] IPO_GURU_API not configured, skipping.");
    return {
      ...emptyCleanResult({ provider: "IPO_GURU_API", status: "skipped", syncType: "ipo_list" }),
      status: "skipped",
    };
  }

  let runId: string | null = null;
  try {
    const run = await createRun("ipo_list", "IPO_GURU_API");
    runId = run.id;

    const fetched = await fetchIPOListFromIPOGuru();
    if (!fetched.ok) {
      const result = emptyCleanResult({
        errors: [fetched.error ?? "IPO Guru list fetch failed."],
        failed: 1,
        provider: "IPO_GURU_API",
        status: "failed",
        success: false,
        syncType: "ipo_list",
      });
      await finishRun(runId, result, { error: fetched.error });
      return result;
    }

    const context = await loadMatchingContext();
    const existingSlugs = new Set(context.ipos.map((ipo) => ipo.slug ?? slugifyIPONameClean(ipo.name)));

    let matched = 0;
    let saved = 0;
    let skipped = 0;
    const warnings: string[] = [];

    for (const entry of fetched.entries) {
      const mapped = mapIPOGuruEntry(entry);
      if (!mapped) continue;

      const priceBand = mapped.listRecord.payload as Record<string, unknown>;

      const match = matchIPONameClean({
        aliases: context.aliases,
        existingIpos: context.ipos,
        provider: "IPO_GURU_API",
        rawName: mapped.rawName,
        openDate: typeof priceBand.openDate === "string" ? priceBand.openDate : undefined,
        closeDate: typeof priceBand.closeDate === "string" ? priceBand.closeDate : undefined,
        priceBandHigh: typeof priceBand.priceBandHigh === "number" ? priceBand.priceBandHigh : undefined,
        issueSizeCr: typeof priceBand.issueSizeCr === "number" ? priceBand.issueSizeCr : undefined,
      });

      const status =
        match.confidence >= 95
          ? "matched"
          : match.confidence >= 70
            ? "needs_review"
            : "staged";

      if (match.ipoId && match.confidence >= 95) matched += 1;

      await stageSourceRecord({
        match,
        provider: "IPO_GURU_API",
        record: mapped.listRecord,
        runId,
        status,
      });

      if (match.ipoId && match.confidence >= 90) {
        await rememberCleanAlias({ alias: mapped.rawName, confidence: match.confidence, ipoId: match.ipoId, provider: "IPO_GURU_API" });
      }

      // Save facts if high-confidence match
      if (match.ipoId && match.confidence >= 95 && mapped.facts.length > 0) {
        await saveFactsClean({
          facts: mapped.facts,
          ipoId: match.ipoId,
          sourcePriority: 25,
          sourceProvider: "IPO_GURU_API",
          sourceUrl: null,
        });
      }

      // Try to create if low confidence
      if (match.confidence < 70) {
        const created = await tryCreateIPOFromList("IPO_GURU_API", mapped.listRecord, match.confidence, existingSlugs);
        if (created.created) saved += 1;
        else {
          skipped += 1;
          if (match.confidence >= 70) warnings.push(`${mapped.rawName}: ${created.reason}`);
        }
      }
    }

    const result = emptyCleanResult({
      found: fetched.entries.length,
      matched,
      provider: "IPO_GURU_API",
      saved,
      skipped,
      status: warnings.length ? "partial" : "success",
      syncType: "ipo_list",
      warnings,
    });
    await finishRun(runId, result, { sourceUrl: "https://www.ipoguru.in/api/v1/ipos" });
    return result;
  } catch (error) {
    const result = emptyCleanResult({
      errors: [error instanceof Error ? error.message : "IPO Guru list sync failed."],
      failed: 1,
      provider: "IPO_GURU_API",
      status: "failed",
      success: false,
      syncType: "ipo_list",
    });
    await finishRun(runId, result);
    return result;
  }
}
