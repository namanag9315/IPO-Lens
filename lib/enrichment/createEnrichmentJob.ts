import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { EnrichableFieldName, EnrichmentTrigger } from "@/lib/enrichment/enrichableFields";
import type { EnrichmentJobRow, SourceSnapshotRow } from "@/lib/enrichment/types";

export interface CreateEnrichmentJobInput {
  ipoId: string;
  missingFields: EnrichableFieldName[];
  sourceSnapshotIds?: string[];
  triggeredBy: EnrichmentTrigger;
  force?: boolean;
}

function sixHoursAgoIso() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
}

export async function getSourceSnapshotsForIPO(ipoId: string, ids?: string[]) {
  if (!isSupabaseConfigured()) return [];

  let query = supabaseAdmin
    .from("ipo_source_snapshots")
    .select("*")
    .eq("ipo_id", ipoId)
    .order("captured_at", { ascending: false })
    .limit(8);

  if (ids?.length) {
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SourceSnapshotRow[];
}

export async function createEnrichmentJob(input: CreateEnrichmentJobInput): Promise<{
  job: EnrichmentJobRow | null;
  created: boolean;
  skippedReason: string | null;
}> {
  if (!isSupabaseConfigured() || input.missingFields.length === 0) {
    return { created: false, job: null, skippedReason: input.missingFields.length === 0 ? "No missing fields detected." : "Supabase is not configured." };
  }

  if (!input.force) {
    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from("ipo_enrichment_jobs")
      .select("*")
      .eq("ipo_id", input.ipoId)
      .in("status", ["queued", "running"])
      .gte("created_at", sixHoursAgoIso())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return { created: false, job: duplicate as EnrichmentJobRow, skippedReason: "Recent queued or running enrichment job already exists." };
    }
  }

  const snapshots = await getSourceSnapshotsForIPO(input.ipoId, input.sourceSnapshotIds);
  const snapshotIds = snapshots.map((snapshot) => snapshot.id);
  const skippedReason = snapshotIds.length === 0 ? "No source text available for enrichment." : null;

  const { data, error } = await supabaseAdmin
    .from("ipo_enrichment_jobs")
    .insert({
      error_message: skippedReason,
      ipo_id: input.ipoId,
      missing_fields: input.missingFields,
      source_snapshot_ids: snapshotIds,
      status: skippedReason ? "skipped" : "queued",
      triggered_by: input.triggeredBy,
      finished_at: skippedReason ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    created: !skippedReason,
    job: data as EnrichmentJobRow,
    skippedReason,
  };
}
