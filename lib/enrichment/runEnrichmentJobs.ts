import { createEnrichmentJob, getSourceSnapshotsForIPO } from "@/lib/enrichment/createEnrichmentJob";
import { detectMissingIPOFields } from "@/lib/enrichment/detectMissingIPOFields";
import { extractMissingFieldsWithGroq } from "@/lib/enrichment/groqExtractMissingFields";
import { applyEnrichedField } from "@/lib/enrichment/applyEnrichedField";
import type { EnrichmentTrigger } from "@/lib/enrichment/enrichableFields";
import type { EnrichmentJobRow, EnrichmentRunResult } from "@/lib/enrichment/types";
import { getComputedIPOBySlug } from "@/lib/ipoData";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === "string" ? error : "Enrichment failed.";
}

async function loadQueuedJobs(limit: number) {
  const { data, error } = await supabaseAdmin
    .from("ipo_enrichment_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as EnrichmentJobRow[];
}

async function loadIPOForJob(job: EnrichmentJobRow) {
  const { data, error } = await supabaseAdmin.from("ipos").select("slug, name").eq("id", job.ipo_id).maybeSingle();
  if (error) throw error;
  if (!data?.slug) throw new Error("IPO not found for enrichment job.");
  const computed = await getComputedIPOBySlug(data.slug);
  if (!computed) throw new Error("Unable to load computed IPO data for enrichment.");
  return computed;
}

async function markJob(jobId: string, payload: Record<string, unknown>) {
  await supabaseAdmin.from("ipo_enrichment_jobs").update(payload).eq("id", jobId);
}

export async function runSingleEnrichmentJob(job: EnrichmentJobRow): Promise<EnrichmentRunResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let fieldsExtracted = 0;
  let fieldsAutoApplied = 0;
  let fieldsNeedsReview = 0;
  let fieldsNotFound = 0;

  await markJob(job.id, { attempts: (job.attempts ?? 0) + 1, started_at: startedAt, status: "running" });

  try {
    const ipo = await loadIPOForJob(job);
    const snapshots = await getSourceSnapshotsForIPO(job.ipo_id, job.source_snapshot_ids);
    if (snapshots.length === 0) {
      await markJob(job.id, {
        error_message: "No source text available for enrichment.",
        finished_at: new Date().toISOString(),
        status: "skipped",
      });
      return { errors: ["No source text available for enrichment."], fieldsAutoApplied: 0, fieldsExtracted: 0, fieldsNeedsReview: 0, fieldsNotFound: 0, ipoId: job.ipo_id, jobId: job.id, status: "skipped" };
    }

    const missingFields = job.missing_fields?.length ? job.missing_fields : detectMissingIPOFields(ipo);
    const aiResult = await extractMissingFieldsWithGroq({
      ipoName: ipo.name,
      missingFields,
      sourceSnapshots: snapshots,
    });

    fieldsExtracted = aiResult.fields.length;
    fieldsNotFound = aiResult.not_found.length;

    for (const field of aiResult.fields) {
      try {
        const result = await applyEnrichedField({
          ...field,
          ipoId: job.ipo_id,
          jobId: job.id,
        });
        if (result.applied) fieldsAutoApplied += 1;
        else fieldsNeedsReview += 1;
      } catch (error) {
        errors.push(`${field.field_name}: ${errorMessage(error)}`);
        fieldsNeedsReview += 1;
      }
    }

    const status = errors.length > 0 ? "partial" : "completed";
    await markJob(job.id, {
      error_message: errors.length ? errors.join("; ").slice(0, 1500) : null,
      finished_at: new Date().toISOString(),
      status,
    });

    return {
      errors,
      fieldsAutoApplied,
      fieldsExtracted,
      fieldsNeedsReview,
      fieldsNotFound,
      ipoId: job.ipo_id,
      jobId: job.id,
      status,
    };
  } catch (error) {
    const message = errorMessage(error);
    await markJob(job.id, {
      error_message: message,
      finished_at: new Date().toISOString(),
      status: "failed",
    });
    return { errors: [message], fieldsAutoApplied, fieldsExtracted, fieldsNeedsReview, fieldsNotFound, ipoId: job.ipo_id, jobId: job.id, status: "failed" };
  }
}

export async function runEnrichmentJobs({
  limit = 5,
}: {
  limit?: number;
  triggeredBy?: EnrichmentTrigger;
} = {}) {
  if (!isSupabaseConfigured()) {
    return { results: [], skippedReason: "Supabase is not configured." };
  }

  if (!process.env.GROQ_API_KEY) {
    return { results: [], skippedReason: "GROQ_API_KEY is not configured." };
  }

  const jobs = await loadQueuedJobs(limit);
  const results: EnrichmentRunResult[] = [];

  for (const job of jobs) {
    results.push(await runSingleEnrichmentJob(job));
  }

  return { results, skippedReason: jobs.length === 0 ? "No queued enrichment jobs." : null };
}

export async function createAndRunEnrichmentForIPO({
  force = false,
  ipoId,
  triggeredBy,
}: {
  ipoId: string;
  force?: boolean;
  triggeredBy: EnrichmentTrigger;
}) {
  const { data, error } = await supabaseAdmin.from("ipos").select("slug").eq("id", ipoId).maybeSingle();
  if (error) throw error;
  if (!data?.slug) throw new Error("IPO not found.");
  const ipo = await getComputedIPOBySlug(data.slug);
  if (!ipo) throw new Error("Unable to load IPO data.");

  const missingFields = detectMissingIPOFields(ipo);
  const snapshots = await getSourceSnapshotsForIPO(ipoId);
  const created = await createEnrichmentJob({
    force,
    ipoId,
    missingFields,
    sourceSnapshotIds: snapshots.map((snapshot) => snapshot.id),
    triggeredBy,
  });

  if (!created.job || created.job.status === "skipped") {
    return { job: created.job, result: null, skippedReason: created.skippedReason };
  }

  const result = await runSingleEnrichmentJob(created.job);
  return { job: created.job, result, skippedReason: null };
}
