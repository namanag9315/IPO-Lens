import type { DiscoveryConfidence } from "@/lib/ipo-data/providers/baseProvider";
import { queueLeadManagerImport } from "@/lib/lead-managers/leadManagerImportQueue";
import { resolveLeadManagerProfileUrl } from "@/lib/lead-managers/leadManagerResolver";
import { leadManagerSlug } from "@/lib/lead-managers/normalizeLeadManagerName";
import { supabaseAdmin } from "@/lib/supabase";

export interface UpsertLeadManagerAndLinkInput {
  confidence: DiscoveryConfidence;
  ipoId: string;
  name: string;
  role?: string | null;
  source: string;
  sourceUrl: string;
  url?: string | null;
}

export interface UpsertLeadManagerAndLinkResult {
  importQueued: boolean;
  leadManagerId: string | null;
  needsReview: boolean;
}

async function insertDiscoveryLog(input: UpsertLeadManagerAndLinkInput & { errorMessage?: string | null; status: string; url?: string | null }) {
  try {
    await supabaseAdmin.from("lead_manager_discovery_logs").insert({
      confidence: input.confidence,
      error_message: input.errorMessage ?? null,
      ipo_id: input.ipoId,
      lead_manager_name: input.name,
      lead_manager_url: input.url ?? null,
      source: input.source,
      source_url: input.sourceUrl,
      status: input.status,
    });
  } catch {
    // Discovery logs should not break public data sync.
  }
}

function safeUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function upsertLeadManagerAndLinkIPO(input: UpsertLeadManagerAndLinkInput): Promise<UpsertLeadManagerAndLinkResult> {
  const name = input.name.trim();
  const slug = leadManagerSlug(name);

  if (!name || !slug) {
    await insertDiscoveryLog({ ...input, errorMessage: "Lead manager name was empty after normalization.", status: "FAILED" });
    return { importQueued: false, leadManagerId: null, needsReview: true };
  }

  const discoveredUrl = safeUrl(input.url);
  const resolved = discoveredUrl ? null : await resolveLeadManagerProfileUrl(name);
  const profileUrl = discoveredUrl ?? resolved?.url ?? null;
  const confidence = discoveredUrl ? input.confidence : resolved ? resolved.confidence : input.confidence;
  const needsReview = confidence === "low" || !profileUrl;

  const { data: existing } = await supabaseAdmin.from("lead_managers").select("*").eq("slug", slug).maybeSingle();
  const now = new Date().toISOString();
  const existingImportStatus = typeof existing?.import_status === "string" ? existing.import_status : null;
  const payload = {
    discovery_confidence: confidence,
    import_status: needsReview ? "needs_review" : existingImportStatus ?? "not_started",
    lead_manager_profile_url: profileUrl,
    name,
    slug,
    source: input.source,
    source_url: input.sourceUrl,
    type: "merchant_banker",
    updated_at: now,
  };

  const leadManagerId = existing?.id
    ? (await supabaseAdmin.from("lead_managers").update(payload).eq("id", existing.id).select("id").single()).data?.id
    : (await supabaseAdmin.from("lead_managers").insert(payload).select("id").single()).data?.id;

  if (!leadManagerId) {
    await insertDiscoveryLog({ ...input, errorMessage: "Lead manager upsert did not return an id.", status: "FAILED", url: profileUrl });
    return { importQueued: false, leadManagerId: null, needsReview: true };
  }

  await supabaseAdmin
    .from("ipo_lead_managers")
    .upsert(
      {
        confidence,
        ipo_id: input.ipoId,
        is_primary: true,
        lead_manager_id: leadManagerId,
        role: input.role || "lead_manager",
        source: input.source,
        source_url: input.sourceUrl,
      },
      { onConflict: "ipo_id,lead_manager_id" },
    );

  let importQueued = false;
  if (profileUrl && !needsReview) {
    const queued = await queueLeadManagerImport({
      ipoId: input.ipoId,
      leadManagerId,
      source: input.source,
      sourceUrl: profileUrl,
    });
    importQueued = queued.queued;
  }

  await insertDiscoveryLog({
    ...input,
    confidence,
    status: needsReview ? "LOW_CONFIDENCE" : "FOUND",
    url: profileUrl,
  });

  return {
    importQueued,
    leadManagerId,
    needsReview,
  };
}
