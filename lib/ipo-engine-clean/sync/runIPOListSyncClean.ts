import { parseChittorgarhIPOList } from "@/lib/ipo-engine-clean/providers/chittorgarhProvider";
import { CHITTORGARH_LIST_URL, createRun, disabledResult, emptyCleanResult, fetchConfiguredSource, finishRun, loadMatchingContext, rememberCleanAlias, shouldSkipForKillSwitch, stageSourceRecord, tryCreateIPOFromList } from "@/lib/ipo-engine-clean/sync/common";
import { slugifyIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { matchIPONameClean } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { saveSourceUrl } from "@/lib/ipo-engine-clean/source-discovery/resolveSourceUrlForIPO";

export async function runIPOListSyncClean() {
  if (shouldSkipForKillSwitch()) return { ...disabledResult(), syncType: "ipo_list" as const };
  let runId: string | null = null;
  try {
    const run = await createRun("ipo_list", "CHITTORGARH");
    runId = run.id;
    const fetched = await fetchConfiguredSource("CHITTORGARH", "ipo_list", CHITTORGARH_LIST_URL);
    if (!fetched.ok || !fetched.html) {
      const result = emptyCleanResult({ errors: [fetched.error ?? "Fetch failed."], failed: 1, provider: "CHITTORGARH", status: fetched.blocked ? "skipped" : "failed", success: false, syncType: "ipo_list" });
      await finishRun(runId, result, { fetched });
      return result;
    }

    const records = parseChittorgarhIPOList(fetched.html);
    const context = await loadMatchingContext();
    const existingSlugs = new Set(context.ipos.map((ipo) => ipo.slug ?? slugifyIPONameClean(ipo.name)));
    let matched = 0;
    let saved = 0;
    let skipped = 0;
    const warnings: string[] = [];

    for (const record of records) {
      const match = matchIPONameClean({ aliases: context.aliases, existingIpos: context.ipos, provider: "CHITTORGARH", rawName: record.rawName });
      const status = match.confidence >= 85 ? "matched" : match.confidence >= 70 ? "needs_review" : "staged";
      if (match.ipoId && match.confidence >= 85) matched += 1;
      await stageSourceRecord({ match, provider: "CHITTORGARH", record, runId, status });

      if (match.ipoId && match.confidence >= 90) {
        await rememberCleanAlias({ alias: record.rawName, confidence: match.confidence, ipoId: match.ipoId, provider: "CHITTORGARH" });
      }

      // 1.2: Save Chittorgarh detail URL when we have a high-confidence match
      if (match.ipoId && match.confidence >= 85 && record.sourceUrl) {
        await saveSourceUrl({
          ipoId: match.ipoId,
          provider: "CHITTORGARH",
          sourceType: "detail",
          sourceUrl: record.sourceUrl,
          discoveryMethod: "list_row",
          matchConfidence: match.confidence,
          status: "verified", // list_row URLs from Chittorgarh are considered verified
        });
      }

      if (!match.ipoId || match.confidence < 70) {
        const created = await tryCreateIPOFromList("CHITTORGARH", record, match.confidence, existingSlugs);
        if (created.created) saved += 1;
        else {
          skipped += 1;
          if (match.confidence >= 70) warnings.push(`${record.rawName}: ${created.reason}`);
        }
      }
    }

    const result = emptyCleanResult({ found: records.length, matched, provider: "CHITTORGARH", saved, skipped, status: warnings.length ? "partial" : "success", syncType: "ipo_list", warnings });
    await finishRun(runId, result, { sourceUrl: CHITTORGARH_LIST_URL });
    return result;
  } catch (error) {
    const result = emptyCleanResult({ errors: [error instanceof Error ? error.message : "IPO list sync failed."], failed: 1, provider: "CHITTORGARH", status: "failed", success: false, syncType: "ipo_list" });
    await finishRun(runId, result);
    return result;
  }
}
