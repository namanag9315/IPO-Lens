import { parseInvestorGainGMP } from "@/lib/ipo-engine-clean/providers/investorGainProvider";
import { parseIPOWatchGMP } from "@/lib/ipo-engine-clean/providers/ipoWatchProvider";
import { createRun, disabledResult, emptyCleanResult, fetchConfiguredSource, finishRun, INVESTORGAIN_GMP_URL, IPOWATCH_GMP_URL, loadMatchingContext, shouldSkipForKillSwitch, stageSourceRecord } from "@/lib/ipo-engine-clean/sync/common";
import { matchIPONameClean } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { saveFactsClean } from "@/lib/ipo-engine-clean/saveFactsClean";
import { supabaseAdmin } from "@/lib/supabase";
import type { GMPRecord } from "@/lib/ipo-engine-clean/types";

async function saveGMP(record: GMPRecord, ipoId: string, provider: string) {
  const now = new Date();
  const minuteStart = new Date(now);
  minuteStart.setUTCMinutes(Math.floor(now.getUTCMinutes() / 5) * 5, 0, 0);
  const duplicateWindowStart = new Date(now.getTime() - 15 * 60_000);

  let existingQuery = supabaseAdmin
    .from("ipo_gmp_history_clean")
    .select("id")
    .eq("ipo_id", ipoId)
    .eq("source_provider", provider)
    .gte("captured_at", duplicateWindowStart.toISOString())
    .limit(1);

  existingQuery = record.gmpValue === null ? existingQuery.is("gmp_value", null) : existingQuery.eq("gmp_value", record.gmpValue);
  existingQuery = record.gmpPct === null || record.gmpPct === undefined ? existingQuery.is("gmp_pct", null) : existingQuery.eq("gmp_pct", record.gmpPct);
  const existing = await existingQuery;

  if (existing.error) return { error: existing.error.message, saved: false };
  if ((existing.data ?? []).length > 0) return { reason: "duplicate_same_values_recent", saved: false };

  const { error } = await supabaseAdmin.from("ipo_gmp_history_clean").insert({
    captured_minute: minuteStart.toISOString(),
    estimated_listing_price: record.estimatedListingPrice ?? null,
    gmp_pct: record.gmpPct ?? null,
    gmp_value: record.gmpValue,
    ipo_id: ipoId,
    source_provider: provider,
    source_url: record.sourceUrl,
  });
  if (error) return { error: error.message, saved: false };
  await saveFactsClean({
    facts: [{ confidence: "medium", displayValue: record.gmpValue === null ? null : `₹${record.gmpValue}`, factKey: "latest_gmp", factValue: { gmpPct: record.gmpPct, gmpValue: record.gmpValue, estimatedListingPrice: record.estimatedListingPrice } }],
    ipoId,
    sourcePriority: provider === "INVESTORGAIN" ? 40 : 60,
    sourceProvider: provider,
    sourceUrl: record.sourceUrl,
  });
  return { saved: true };
}

export async function runGMPSyncClean() {
  if (shouldSkipForKillSwitch()) return { ...disabledResult(), syncType: "gmp" as const };
  let runId: string | null = null;
  try {
    const run = await createRun("gmp", "INVESTORGAIN,IPOWATCH");
    runId = run.id;
    const providerFetches = await Promise.all([
      fetchConfiguredSource("INVESTORGAIN", "gmp", INVESTORGAIN_GMP_URL).then((result) => ({ provider: "INVESTORGAIN" as const, result })),
      fetchConfiguredSource("IPOWATCH", "gmp", IPOWATCH_GMP_URL).then((result) => ({ provider: "IPOWATCH" as const, result })),
    ]);
    const records: Array<{ provider: "INVESTORGAIN" | "IPOWATCH"; record: GMPRecord }> = [];
    const errors: string[] = [];
    for (const item of providerFetches) {
      if (!item.result.ok || !item.result.html) {
        errors.push(`${item.provider}: ${item.result.error ?? "fetch skipped"}`);
        continue;
      }
      const parsed = item.provider === "INVESTORGAIN" ? parseInvestorGainGMP(item.result.html, item.result.status ? INVESTORGAIN_GMP_URL : INVESTORGAIN_GMP_URL) : parseIPOWatchGMP(item.result.html, IPOWATCH_GMP_URL);
      records.push(...parsed.map((record) => ({ provider: item.provider, record })));
    }

    const context = await loadMatchingContext();
    let matched = 0;
    let saved = 0;
    let skipped = 0;
    const saveErrors: string[] = [];
    const saveWarnings: string[] = [];
    for (const { provider, record } of records) {
      const match = matchIPONameClean({ aliases: context.aliases, existingIpos: context.ipos, provider, rawName: record.rawName });
      await stageSourceRecord({ match, provider, record, runId, status: match.confidence >= 85 ? "matched" : match.confidence >= 70 ? "needs_review" : "ignored" });
      if (match.ipoId && match.confidence >= 85) {
        matched += 1;
        const saveResult = await saveGMP(record, match.ipoId, provider);
        if (saveResult.saved) saved += 1;
        else {
          skipped += 1;
          if (saveResult.error) saveErrors.push(`${record.rawName}: ${saveResult.error}`);
          if (saveResult.reason) saveWarnings.push(`${record.rawName}: ${saveResult.reason}`);
        }
      } else skipped += 1;
    }

    const allErrors = [...errors, ...saveErrors];
    const result = emptyCleanResult({
      errors: allErrors,
      found: records.length,
      matched,
      provider: "INVESTORGAIN,IPOWATCH",
      saved,
      skipped,
      status: allErrors.length ? "partial" : "success",
      syncType: "gmp",
      warnings: saveWarnings,
    });
    await finishRun(runId, result);
    return result;
  } catch (error) {
    const result = emptyCleanResult({ errors: [error instanceof Error ? error.message : "GMP sync failed."], failed: 1, status: "failed", success: false, syncType: "gmp" });
    await finishRun(runId, result);
    return result;
  }
}
