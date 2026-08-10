import { canCreateIPO } from "@/lib/ipo-engine-clean/canCreateIPO";
import { fetchSource } from "@/lib/ipo-engine-clean/fetchSource";
import { isAutoSyncDisabled, skippedByKillSwitch } from "@/lib/ipo-engine-clean/killSwitch";
import { matchIPONameClean, type CleanIPOReference } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { normalizeIPONameClean, sanitizeIPONameClean, slugifyIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { supabaseAdmin } from "@/lib/supabase";
import type { CleanProvider, CleanRecordType, CleanSourceRecord, CleanSyncResult, CleanSyncType } from "@/lib/ipo-engine-clean/types";

export const CHITTORGARH_LIST_URL = "https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/";
export const INVESTORGAIN_GMP_URL = "https://www.investorgain.com/report/live-ipo-gmp/331/";
export const IPOWATCH_GMP_URL = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";
export const IPOWATCH_SUBSCRIPTION_URL = "https://ipowatch.in/ipo-subscription-status-today/";

export function emptyCleanResult(input: Partial<CleanSyncResult> & { syncType: CleanSyncType | "disabled" }): CleanSyncResult {
  return {
    errors: input.errors ?? [],
    failed: input.failed ?? 0,
    found: input.found ?? 0,
    matched: input.matched ?? 0,
    provider: input.provider,
    saved: input.saved ?? 0,
    skipped: input.skipped ?? 0,
    status: input.status ?? "success",
    success: input.success ?? true,
    syncType: input.syncType,
    warnings: input.warnings ?? [],
  };
}

export async function createRun(syncType: CleanSyncType, provider?: string) {
  const { data, error } = await supabaseAdmin
    .from("ipo_sync_runs_clean")
    .insert({ provider: provider ?? null, status: "running", sync_type: syncType })
    .select("id, started_at")
    .single();
  if (error) throw error;
  return data as { id: string; started_at: string };
}

export async function finishRun(runId: string | null, result: CleanSyncResult, debug: Record<string, unknown> = {}) {
  if (!runId) return;
  const finished = new Date();
  const { data: run } = await supabaseAdmin.from("ipo_sync_runs_clean").select("started_at").eq("id", runId).maybeSingle();
  const started = typeof run?.started_at === "string" ? new Date(run.started_at) : finished;
  await supabaseAdmin
    .from("ipo_sync_runs_clean")
    .update({
      debug_json: debug,
      duration_ms: Math.max(0, finished.getTime() - started.getTime()),
      errors: result.errors,
      failed: result.failed,
      finished_at: finished.toISOString(),
      found: result.found,
      matched: result.matched,
      saved: result.saved,
      skipped: result.skipped,
      status: result.status,
      warnings: result.warnings,
    })
    .eq("id", runId);
}

export async function loadMatchingContext() {
  const [iposResponse, duplicateResponse, aliasesResponse] = await Promise.all([
    supabaseAdmin
      .from("ipos")
      .select("id,name,slug,open_date,close_date,price_band_low,price_band_high,issue_size_cr")
      .or("is_duplicate.is.null,is_duplicate.eq.false"),
    supabaseAdmin.from("ipos").select("id,name,canonical_ipo_id").eq("is_duplicate", true).not("canonical_ipo_id", "is", null),
    supabaseAdmin.from("ipo_aliases_clean").select("ipo_id, normalized_alias, provider"),
  ]);

  const storedAliases = aliasesResponse.error ? [] : ((aliasesResponse.data ?? []) as Array<{ ipo_id: string; normalized_alias: string; provider?: string | null }>);
  const duplicateAliases = ((duplicateResponse.data ?? []) as Array<{ canonical_ipo_id: string | null; name: string }>)
    .filter((row) => row.canonical_ipo_id)
    .map((row) => ({
      ipo_id: row.canonical_ipo_id as string,
      normalized_alias: normalizeIPONameClean(row.name),
      provider: null,
    }))
    .filter((row) => row.normalized_alias);

  return {
    aliases: [...storedAliases, ...duplicateAliases],
    ipos: (iposResponse.data ?? []) as CleanIPOReference[],
  };
}

export async function stageSourceRecord({
  match,
  provider,
  record,
  runId,
  status,
}: {
  match?: ReturnType<typeof matchIPONameClean>;
  provider: CleanProvider;
  record: CleanSourceRecord;
  runId: string | null;
  status?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("ipo_source_records_clean")
    .insert({
      match_confidence: match?.confidence ?? 0,
      match_type: match?.matchType ?? "none",
      matched_ipo_id: match?.ipoId ?? null,
      normalized_name: normalizeIPONameClean(record.rawName),
      payload: record.payload,
      provider,
      raw_name: record.rawName,
      reason: match?.reason ?? null,
      record_type: record.recordType,
      source_url: record.sourceUrl,
      status: status ?? "staged",
      sync_run_id: runId,
    })
    .select("id")
    .single();
  if (error) return null;
  return data?.id as string | undefined;
}

export async function rememberCleanAlias({
  alias,
  confidence,
  ipoId,
  provider,
}: {
  alias: string;
  confidence: number;
  ipoId: string;
  provider: CleanProvider;
}) {
  if (confidence < 90) return false;
  const normalizedAlias = normalizeIPONameClean(alias);
  if (!normalizedAlias) return false;
  const { error } = await supabaseAdmin.from("ipo_aliases_clean").upsert(
    {
      alias: sanitizeIPONameClean(alias),
      created_by: "confirmed_source_match",
      ipo_id: ipoId,
      normalized_alias: normalizedAlias,
      provider,
    },
    { onConflict: "normalized_alias,provider" },
  );
  // Older deployments may not have the alias table yet. Matching continues to
  // work without persistence until the reliability migration is applied.
  return !error;
}

export async function fetchConfiguredSource(provider: CleanProvider, sourceType: string, fallbackUrl: string) {
  const { data } = await supabaseAdmin
    .from("ipo_sources_clean")
    .select("base_url,is_enabled,supports_auto_fetch")
    .eq("provider", provider)
    .eq("source_type", sourceType)
    .maybeSingle();

  if (data && (data.is_enabled === false || data.supports_auto_fetch === false)) {
    return { blocked: false, durationMs: 0, error: `${provider} ${sourceType} source disabled.`, html: null, ok: false, status: null, text: null };
  }

  return fetchSource((data?.base_url as string | null) ?? fallbackUrl, { delayMs: 750, retries: 1, timeoutMs: 14000 });
}

export function disabledResult() {
  return skippedByKillSwitch();
}

export function shouldSkipForKillSwitch() {
  return isAutoSyncDisabled();
}

export async function tryCreateIPOFromList(provider: CleanProvider, record: CleanSourceRecord, matchConfidence: number, existingSlugs: Set<string>) {
  const cleanName = sanitizeIPONameClean(record.rawName);
  const slug = slugifyIPONameClean(cleanName);
  const decision = canCreateIPO({
    matchConfidence,
    provider,
    recordType: record.recordType,
    slugExists: existingSlugs.has(slug),
  });
  if (!decision.allowed) return { created: false, reason: decision.reason };

  const payload = record.payload as Record<string, unknown>;
  const { error } = await supabaseAdmin.from("ipos").insert({
    category: typeof payload.category === "string" ? payload.category : null,
    close_date: typeof payload.closeDate === "string" ? payload.closeDate : null,
    issue_size_cr: typeof payload.issueSizeCr === "number" ? payload.issueSizeCr : null,
    name: cleanName,
    open_date: typeof payload.openDate === "string" ? payload.openDate : null,
    price_band_high: typeof payload.priceBandHigh === "number" ? payload.priceBandHigh : null,
    price_band_low: typeof payload.priceBandLow === "number" ? payload.priceBandLow : null,
    slug,
    status: "upcoming",
  });
  if (error) return { created: false, reason: error.message };
  existingSlugs.add(slug);
  return { created: true, reason: "Created from approved IPO list source." };
}
