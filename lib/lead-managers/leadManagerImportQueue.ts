import { saveLeadManagerImport } from "@/lib/lead-managers/leadManagerService";
import { ipoPremiumLeadManagerProvider } from "@/lib/lead-managers/providers/ipoPremiumLeadManagerProvider";
import { supabaseAdmin } from "@/lib/supabase";

const IMPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function isRecent(value: string | null | undefined) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time < IMPORT_COOLDOWN_MS;
}

async function getLeadManagerImportState(leadManagerId: string) {
  const { data } = await supabaseAdmin
    .from("lead_managers")
    .select("last_imported_at, import_status")
    .eq("id", leadManagerId)
    .maybeSingle();

  return {
    importStatus: typeof data?.import_status === "string" ? data.import_status : null,
    lastImportedAt: typeof data?.last_imported_at === "string" ? data.last_imported_at : null,
  };
}

export async function queueLeadManagerImport(input: {
  force?: boolean;
  ipoId?: string | null;
  leadManagerId: string;
  source: string;
  sourceUrl: string;
}) {
  const state = await getLeadManagerImportState(input.leadManagerId);

  if (!input.force && isRecent(state.lastImportedAt)) {
    return { queued: false, reason: "Lead manager was imported within the last 24 hours." };
  }

  const { data: existingJob } = await supabaseAdmin
    .from("lead_manager_import_jobs")
    .select("id")
    .eq("lead_manager_id", input.leadManagerId)
    .in("status", ["queued", "running"])
    .maybeSingle();

  if (existingJob?.id && !input.force) {
    return { jobId: existingJob.id as string, queued: false, reason: "Import job is already queued." };
  }

  const { data, error } = await supabaseAdmin
    .from("lead_manager_import_jobs")
    .insert({
      ipo_id: input.ipoId ?? null,
      lead_manager_id: input.leadManagerId,
      source: input.source,
      source_url: input.sourceUrl,
      status: "queued",
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabaseAdmin.from("lead_managers").update({ import_status: "queued", updated_at: new Date().toISOString() }).eq("id", input.leadManagerId);

  return { jobId: data.id as string, queued: true, reason: null };
}

export async function runLeadManagerImportJobs(input: { limit?: number } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);
  const { data: jobs, error } = await supabaseAdmin
    .from("lead_manager_import_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const job of jobs ?? []) {
    const jobId = job.id as string;
    const leadManagerId = job.lead_manager_id as string;
    const sourceUrl = job.source_url as string | null;

    if (!sourceUrl) {
      failed += 1;
      await supabaseAdmin
        .from("lead_manager_import_jobs")
        .update({
          attempts: Number(job.attempts ?? 0) + 1,
          error_message: "Job does not have a source URL.",
          finished_at: new Date().toISOString(),
          status: "failed",
        })
        .eq("id", jobId);
      await supabaseAdmin.from("lead_managers").update({ import_status: "needs_review", updated_at: new Date().toISOString() }).eq("id", leadManagerId);
      continue;
    }

    await supabaseAdmin
      .from("lead_manager_import_jobs")
      .update({ attempts: Number(job.attempts ?? 0) + 1, started_at: new Date().toISOString(), status: "running" })
      .eq("id", jobId);

    try {
      const parsed = await ipoPremiumLeadManagerProvider.fetch({ sourceUrl });

      if (!parsed.profile) {
        throw new Error(parsed.errors.join(" | ") || "Lead manager profile could not be imported.");
      }

      const saved = await saveLeadManagerImport({
        history: parsed.history,
        profile: {
          ...parsed.profile,
          sourceUrl,
        },
      });

      await supabaseAdmin
        .from("lead_manager_import_jobs")
        .update({
          error_message: parsed.errors.join(" | ") || null,
          finished_at: new Date().toISOString(),
          status: parsed.status === "FAILED" ? "failed" : "imported",
        })
        .eq("id", jobId);
      await supabaseAdmin
        .from("lead_managers")
        .update({
          import_status: parsed.status === "FAILED" ? "failed" : "imported",
          last_imported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", saved.leadManagerId);

      imported += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lead manager import failed.";
      errors.push(message);
      failed += 1;
      await supabaseAdmin
        .from("lead_manager_import_jobs")
        .update({
          error_message: message,
          finished_at: new Date().toISOString(),
          status: "failed",
        })
        .eq("id", jobId);
      await supabaseAdmin.from("lead_managers").update({ import_status: "failed", updated_at: new Date().toISOString() }).eq("id", leadManagerId);
    }
  }

  return {
    errors,
    failed,
    imported,
    jobsFound: jobs?.length ?? 0,
  };
}
