import { fetchIPOListFromIPOGuru } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruProvider";
import { mapIPOGuruEntry } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruMapper";
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
import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { saveFactsClean } from "@/lib/ipo-engine-clean/saveFactsClean";
import { supabaseAdmin } from "@/lib/supabase";
import type { CleanSyncResult } from "@/lib/ipo-engine-clean/types";
import type { IPOGuruIPOEntry } from "@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruTypes";

const COVERAGE_GROUPS_GURU = {
  ipoDetails: ["open_date", "close_date", "price_band", "issue_size", "lot_size", "listing_date"],
  managers: ["lead_manager_name", "registrar_name"],
  subscription: ["total_subscription"],
};

function findBestGuruEntry(
  entries: IPOGuruIPOEntry[],
  ipoName: string,
): IPOGuruIPOEntry | null {
  const normalizedTarget = normalizeIPONameClean(ipoName);
  if (!normalizedTarget) return null;

  let bestEntry: IPOGuruIPOEntry | null = null;
  let bestScore = 0;

  for (const entry of entries) {
    const entryName = ((entry.name ?? entry.company_name ?? "") as string).trim();
    if (!entryName) continue;
    const normalized = normalizeIPONameClean(entryName);
    if (!normalized) continue;

    // Exact match
    if (normalized === normalizedTarget) return entry;

    // Token overlap score
    const targetTokens = new Set(normalizedTarget.split(" ").filter(Boolean));
    const entryTokens = new Set(normalized.split(" ").filter(Boolean));
    let hits = 0;
    for (const token of targetTokens) if (entryTokens.has(token)) hits++;
    const union = targetTokens.size + entryTokens.size - hits;
    const score = union > 0 ? hits / union : 0;

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Only return if score is reasonably good (>= 0.5)
  return bestScore >= 0.5 ? bestEntry : null;
}

async function loadDetailTargetIPOs(ipoId?: string) {
  let query = supabaseAdmin
    .from("ipos")
    .select("id,name,slug,category,open_date,close_date,is_duplicate,admin_verified")
    .or("is_duplicate.is.null,is_duplicate.eq.false")
    .order("close_date", { ascending: false })
    .limit(30);

  if (ipoId) {
    query = query.eq("id", ipoId).limit(1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    name: string;
    slug?: string | null;
    category?: string | null;
    open_date?: string | null;
    close_date?: string | null;
    is_duplicate?: boolean | null;
    admin_verified?: boolean | null;
  }>;
}

export async function runIPOGuruDetailSync(
  ipoId?: string,
): Promise<CleanSyncResult & { coverageReport?: Record<string, boolean> }> {
  if (shouldSkipForKillSwitch()) return { ...disabledResult(), syncType: "detail" as const };

  if (!isIPOGuruConfigured()) {
    console.warn("[IPOGuruDetailSync] IPO_GURU_API not configured, skipping.");
    return {
      ...emptyCleanResult({ provider: "IPO_GURU_API", status: "skipped", syncType: "detail" }),
      status: "skipped",
    };
  }

  let runId: string | null = null;
  try {
    const run = await createRun("detail", "IPO_GURU_API");
    runId = run.id;

    const listResult = await fetchIPOListFromIPOGuru();
    if (!listResult.ok) {
      const result = emptyCleanResult({
        errors: [listResult.error ?? "IPO Guru detail sync: list fetch failed."],
        failed: 1,
        provider: "IPO_GURU_API",
        status: "failed",
        success: false,
        syncType: "detail",
      });
      await finishRun(runId, result);
      return result;
    }

    const ipos = await loadDetailTargetIPOs(ipoId);

    let matched = 0;
    let saved = 0;
    let skipped = 0;
    let failed = 0;
    const warnings: string[] = [];
    const errors: string[] = [];
    const coverageReport: Record<string, boolean> = {};

    for (const ipo of ipos) {
      const bestEntry = findBestGuruEntry(listResult.entries, ipo.name);
      if (!bestEntry) {
        skipped += 1;
        warnings.push(`${ipo.name}: no matching IPO Guru entry found`);
        coverageReport[ipo.id] = false;
        continue;
      }

      // Verify with matchIPONameClean
      const context = await loadMatchingContext();
      const match = matchIPONameClean({
        aliases: context.aliases,
        existingIpos: context.ipos,
        provider: "IPO_GURU_API",
        rawName: ((bestEntry.name ?? bestEntry.company_name ?? "") as string).trim(),
      });

      if (!match.ipoId || match.confidence < 85) {
        skipped += 1;
        warnings.push(`${ipo.name}: IPO Guru match confidence too low (${match.confidence})`);
        coverageReport[ipo.id] = false;
        continue;
      }

      const mapped = mapIPOGuruEntry(bestEntry);
      if (!mapped || mapped.facts.length === 0) {
        skipped += 1;
        warnings.push(`${ipo.name}: no mappable facts from IPO Guru entry`);
        coverageReport[ipo.id] = false;
        continue;
      }

      // Check if we have at least one ipoDetails-group fact
      const factKeys = new Set(mapped.facts.map((f) => f.factKey));
      const hasIpoDetailFact = COVERAGE_GROUPS_GURU.ipoDetails.some((k) => factKeys.has(k));

      if (!hasIpoDetailFact) {
        skipped += 1;
        warnings.push(`${ipo.name}: IPO Guru entry has no ipoDetails-group facts`);
        coverageReport[ipo.id] = false;
        continue;
      }

      const savedFacts = await saveFactsClean({
        facts: mapped.facts,
        ipoId: ipo.id,
        sourcePriority: 25,
        sourceProvider: "IPO_GURU_API",
        sourceUrl: null,
      });

      await stageSourceRecord({
        match: { confidence: match.confidence, ipoId: ipo.id, matchType: match.matchType, reason: match.reason },
        provider: "IPO_GURU_API",
        record: mapped.listRecord,
        runId,
        status: "matched",
      });

      matched += 1;
      saved += savedFacts.saved;
      skipped += savedFacts.skipped.length + savedFacts.rejected;
      coverageReport[ipo.id] = savedFacts.saved > 0;

      if (savedFacts.skipped.length > 0) {
        warnings.push(...savedFacts.skipped.map((s) => `${ipo.name}: ${s}`));
      }
    }

    const result = emptyCleanResult({
      errors,
      failed,
      found: ipos.length,
      matched,
      provider: "IPO_GURU_API",
      saved,
      skipped,
      status: errors.length ? "partial" : "success",
      success: errors.length === 0 || saved > 0,
      syncType: "detail",
      warnings,
    });

    await finishRun(runId, result, { coverageReport });
    return { ...result, coverageReport };
  } catch (error) {
    const result = emptyCleanResult({
      errors: [error instanceof Error ? error.message : "IPO Guru detail sync failed."],
      failed: 1,
      provider: "IPO_GURU_API",
      status: "failed",
      success: false,
      syncType: "detail",
    });
    await finishRun(runId, result);
    return result;
  }
}
