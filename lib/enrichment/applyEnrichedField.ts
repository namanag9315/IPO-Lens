import { leadManagerSlug } from "@/lib/lead-managers/normalizeLeadManagerName";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { EnrichableFieldName, EnrichmentConfidence, EnrichmentFieldStatus } from "@/lib/enrichment/enrichableFields";
import { scoreEnrichmentConfidence, statusForEnrichedField } from "@/lib/enrichment/scoreEnrichmentConfidence";
import type { AIExtractedField, EnrichedFieldRow } from "@/lib/enrichment/types";

interface ApplyInput extends AIExtractedField {
  ipoId: string;
  jobId?: string | null;
  forceApply?: boolean;
  reviewedBy?: string | null;
}

function textValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function fieldQuality(ipoId: string, fieldName: string) {
  const { data } = await supabaseAdmin
    .from("ipo_field_quality")
    .select("*")
    .eq("ipo_id", ipoId)
    .eq("field_name", fieldName)
    .maybeSingle();
  return data as { status?: string | null; confidence?: string | null } | null;
}

async function upsertQuality(input: {
  confidence: EnrichmentConfidence;
  fieldName: EnrichableFieldName;
  ipoId: string;
  notes?: string | null;
  sourceName: string;
  sourceUrl: string | null;
  status: "verified" | "ai_extracted" | "inferred" | "missing" | "needs_review";
}) {
  await supabaseAdmin.from("ipo_field_quality").upsert(
    {
      confidence: input.confidence,
      field_name: input.fieldName,
      ipo_id: input.ipoId,
      last_checked_at: new Date().toISOString(),
      notes: input.notes ?? null,
      source_name: input.sourceName,
      source_url: input.sourceUrl,
      status: input.status,
    },
    { onConflict: "ipo_id,field_name" },
  );
}

async function saveCandidate(input: ApplyInput, status: EnrichmentFieldStatus, confidence: EnrichmentConfidence) {
  const { data, error } = await supabaseAdmin
    .from("ipo_enriched_fields")
    .insert({
      confidence,
      display_value: input.display_value,
      evidence_text: input.evidence_text,
      field_name: input.field_name,
      field_value: input.field_value ?? null,
      ipo_id: input.ipoId,
      job_id: input.jobId ?? null,
      reviewed_at: input.reviewedBy ? new Date().toISOString() : null,
      reviewed_by: input.reviewedBy ?? null,
      source_name: input.source_name,
      source_snapshot_id: input.source_snapshot_id ?? null,
      source_url: input.source_url,
      status,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as EnrichedFieldRow;
}

async function updateCandidateApplied(candidateId: string, table: string, column: string) {
  await supabaseAdmin
    .from("ipo_enriched_fields")
    .update({
      applied_at: new Date().toISOString(),
      applied_to_column: column,
      applied_to_table: table,
      status: "auto_applied",
    })
    .eq("id", candidateId);
}

async function hasExistingProfileValue(ipoId: string, column: string) {
  const { data } = await supabaseAdmin.from("ipo_company_profiles").select(column).eq("ipo_id", ipoId).maybeSingle();
  return Boolean(data && textValue((data as unknown as Record<string, unknown>)[column]));
}

async function hasExistingIPOValue(ipoId: string, column: string) {
  const { data } = await supabaseAdmin.from("ipos").select(column).eq("id", ipoId).maybeSingle();
  return Boolean(data && textValue((data as unknown as Record<string, unknown>)[column]));
}

async function canApply(input: ApplyInput, initialStatus: EnrichmentFieldStatus, existingValue: boolean) {
  if (input.forceApply) return true;
  const quality = await fieldQuality(input.ipoId, input.field_name);
  if (quality?.status === "verified") return false;
  if (initialStatus !== "auto_applied") return false;
  if (existingValue && quality?.status !== "ai_extracted" && quality?.status !== "inferred" && quality?.confidence !== "low") return false;
  return true;
}

async function applyProfileField(input: ApplyInput, candidate: EnrichedFieldRow, column: string, confidence: EnrichmentConfidence) {
  const existing = await hasExistingProfileValue(input.ipoId, column);
  if (!(await canApply(input, candidate.status, existing))) return false;

  const { error } = await supabaseAdmin.from("ipo_company_profiles").upsert(
    {
      [column]: input.field_value,
      ipo_id: input.ipoId,
      source_documents: [
        {
          title: `${input.source_name} enrichment`,
          type: "AI-enriched source",
          url: input.source_url,
        },
      ],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "ipo_id" },
  );
  if (error) throw error;

  await updateCandidateApplied(candidate.id, "ipo_company_profiles", column);
  await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, sourceName: input.source_name, sourceUrl: input.source_url, status: "ai_extracted" });
  return true;
}

async function applyIPOField(input: ApplyInput, candidate: EnrichedFieldRow, column: string, confidence: EnrichmentConfidence) {
  const existing = await hasExistingIPOValue(input.ipoId, column);
  if (!(await canApply(input, candidate.status, existing))) return false;

  const { error } = await supabaseAdmin.from("ipos").update({ [column]: input.field_value }).eq("id", input.ipoId);
  if (error) throw error;

  await updateCandidateApplied(candidate.id, "ipos", column);
  await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, sourceName: input.source_name, sourceUrl: input.source_url, status: "ai_extracted" });
  return true;
}

async function applyLeadManager(input: ApplyInput, candidate: EnrichedFieldRow, confidence: EnrichmentConfidence) {
  const name = textValue(input.field_value);
  if (!name || !(await canApply(input, candidate.status, false))) return false;
  const slug = leadManagerSlug(name);
  const { data, error } = await supabaseAdmin
    .from("lead_managers")
    .upsert(
      {
        discovery_confidence: confidence,
        import_status: input.source_url ? "queued" : "needs_review",
        lead_manager_profile_url: input.source_url,
        name,
        slug,
        source: input.source_name,
        source_url: input.source_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw error;

  await supabaseAdmin.from("ipo_lead_managers").upsert(
    {
      confidence,
      ipo_id: input.ipoId,
      is_primary: true,
      lead_manager_id: data.id,
      role: "lead_manager",
      source: input.source_name,
      source_url: input.source_url,
    },
    { onConflict: "ipo_id,lead_manager_id" },
  );

  await updateCandidateApplied(candidate.id, "lead_managers", "name");
  await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, sourceName: input.source_name, sourceUrl: input.source_url, status: "ai_extracted" });
  return true;
}

async function applyMarketMaker(input: ApplyInput, candidate: EnrichedFieldRow, confidence: EnrichmentConfidence) {
  const name = textValue(input.field_value);
  if (!name || !(await canApply(input, candidate.status, false))) return false;
  const slug = leadManagerSlug(name);
  const { data, error } = await supabaseAdmin
    .from("market_makers")
    .upsert(
      {
        name,
        slug,
        source: input.source_name,
        source_url: input.source_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw error;

  await supabaseAdmin.from("ipo_market_makers").upsert(
    {
      ipo_id: input.ipoId,
      market_maker_id: data.id,
      source: input.source_name,
      source_url: input.source_url,
    },
    { onConflict: "ipo_id,market_maker_id" },
  );

  await updateCandidateApplied(candidate.id, "market_makers", "name");
  await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, sourceName: input.source_name, sourceUrl: input.source_url, status: "ai_extracted" });
  return true;
}

async function applyPeerTable(input: ApplyInput, candidate: EnrichedFieldRow, confidence: EnrichmentConfidence) {
  if (!(await canApply(input, input.forceApply ? "auto_applied" : candidate.status, false))) return false;
  const rows = asArray(input.field_value)
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>) : null))
    .filter((row): row is Record<string, unknown> => Boolean(row));
  if (rows.length === 0) return false;

  const payload = rows
    .map((row) => ({
      ipo_id: input.ipoId,
      market_cap_cr: row.market_cap_cr ?? null,
      notes: input.display_value,
      pat_cr: row.pat_cr ?? null,
      pb_ratio: row.pb_ratio ?? null,
      pe_ratio: row.pe_ratio ?? row.pe ?? null,
      peer_name: textValue(row.peer_name ?? row.company ?? row.name),
      revenue_cr: row.revenue_cr ?? null,
      roce_pct: row.roce_pct ?? null,
      roe_pct: row.roe_pct ?? row.ronw_pct ?? null,
    }))
    .filter((row) => row.peer_name);

  if (payload.length === 0) return false;
  const { error } = await supabaseAdmin.from("ipo_peer_comparisons").upsert(payload, { onConflict: "ipo_id,peer_name" });
  if (error) throw error;

  await updateCandidateApplied(candidate.id, "ipo_peer_comparisons", "peer_name");
  await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, sourceName: input.source_name, sourceUrl: input.source_url, status: "ai_extracted" });
  return true;
}

async function applyObjects(input: ApplyInput, candidate: EnrichedFieldRow, confidence: EnrichmentConfidence) {
  if (!(await canApply(input, input.forceApply ? "auto_applied" : candidate.status, false))) return false;
  const rows = asArray(input.field_value)
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>) : { object_name: row }))
    .map((row) => ({
      amount_cr: row.amount_cr ?? row.amount ?? null,
      category: textValue(row.category) || null,
      details: textValue(row.details ?? row.description) || input.evidence_text,
      ipo_id: input.ipoId,
      object_name: textValue(row.object_name ?? row.object ?? row.title),
      percentage: row.percentage ?? null,
      score_impact: null,
      source: input.source_name,
      source_url: input.source_url,
    }))
    .filter((row) => row.object_name);
  if (rows.length === 0) return false;
  const { error } = await supabaseAdmin.from("ipo_objects_of_issue").insert(rows);
  if (error) throw error;

  await updateCandidateApplied(candidate.id, "ipo_objects_of_issue", "object_name");
  await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, sourceName: input.source_name, sourceUrl: input.source_url, status: "ai_extracted" });
  return true;
}

async function applyStrengthsOrRisks(input: ApplyInput, candidate: EnrichedFieldRow, confidence: EnrichmentConfidence) {
  if (!(await canApply(input, candidate.status, false))) return false;
  const items = asArray(input.field_value).map((item) => (typeof item === "string" ? { title: item } : (item as Record<string, unknown>)));
  if (input.field_name === "strengths") {
    const rows = items.map((item) => ({
      confidence,
      description: textValue(item.description ?? item.explanation) || input.evidence_text,
      ipo_id: input.ipoId,
      source: input.source_name,
      source_url: input.source_url,
      title: textValue(item.title ?? item.strength),
    })).filter((row) => row.title);
    if (!rows.length) return false;
    const { error } = await supabaseAdmin.from("ipo_strengths").insert(rows);
    if (error) throw error;
    await updateCandidateApplied(candidate.id, "ipo_strengths", "title");
  } else {
    const riskTexts = items.map((item) => textValue(item.title ?? item.risk ?? item)).filter(Boolean);
    if (!riskTexts.length) return false;
    await supabaseAdmin.from("ipo_company_profiles").upsert(
      { ipo_id: input.ipoId, risk_factors: riskTexts, updated_at: new Date().toISOString() },
      { onConflict: "ipo_id" },
    );
    await updateCandidateApplied(candidate.id, "ipo_company_profiles", "risk_factors");
  }
  await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, sourceName: input.source_name, sourceUrl: input.source_url, status: "ai_extracted" });
  return true;
}

async function applyFallback(input: ApplyInput, candidate: EnrichedFieldRow, confidence: EnrichmentConfidence) {
  if (!(await canApply(input, candidate.status, false))) return false;
  const { data: current } = await supabaseAdmin.from("ipos").select("enriched_data").eq("id", input.ipoId).maybeSingle();
  const enrichedData = ((current as { enriched_data?: Record<string, unknown> } | null)?.enriched_data ?? {}) as Record<string, unknown>;
  enrichedData[input.field_name] = {
    confidence,
    evidence_text: input.evidence_text,
    source_name: input.source_name,
    source_url: input.source_url,
    value: input.field_value,
  };
  const { error } = await supabaseAdmin.from("ipos").update({ enriched_data: enrichedData }).eq("id", input.ipoId);
  if (error) throw error;
  await updateCandidateApplied(candidate.id, "ipos", "enriched_data");
  await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, sourceName: input.source_name, sourceUrl: input.source_url, status: "ai_extracted" });
  return true;
}

export async function applyEnrichedField(input: ApplyInput): Promise<{ applied: boolean; candidate: EnrichedFieldRow }> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const confidence = scoreEnrichmentConfidence({ confidence: input.confidence, evidenceText: input.evidence_text, fieldName: input.field_name });
  const desiredStatus = input.forceApply
    ? "auto_applied"
    : statusForEnrichedField({ confidence, evidenceText: input.evidence_text, fieldName: input.field_name });
  const candidate = await saveCandidate(input, desiredStatus, confidence);
  let applied = false;

  if (desiredStatus !== "auto_applied" && !input.forceApply) {
    await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, notes: "AI candidate requires admin review.", sourceName: input.source_name, sourceUrl: input.source_url, status: "needs_review" });
    return { applied: false, candidate };
  }

  switch (input.field_name) {
    case "company_description":
      applied = await applyProfileField(input, candidate, "company_overview", confidence);
      break;
    case "sector":
    case "industry":
    case "business_model":
    case "products_services":
    case "customers":
    case "manufacturing_facilities":
    case "revenue_model":
    case "promoter_summary":
    case "registrar_website":
    case "registrar_email":
    case "registrar_phone":
    case "registrar_address":
      applied = await applyProfileField(input, candidate, input.field_name, confidence);
      break;
    case "registrar_name":
      applied = await applyIPOField(input, candidate, "registrar_name", confidence);
      break;
    case "listing_exchange":
      applied = await applyIPOField(input, candidate, "exchange", confidence);
      break;
    case "fresh_issue_amount":
    case "ofs_amount":
    case "face_value":
    case "issue_type":
    case "pre_issue_shares":
    case "post_issue_shares":
      applied = await applyIPOField(input, candidate, input.field_name, confidence);
      break;
    case "lead_manager_name":
      applied = await applyLeadManager(input, candidate, confidence);
      break;
    case "market_maker_name":
      applied = await applyMarketMaker(input, candidate, confidence);
      break;
    case "peer_valuation_table":
    case "peer_financial_table":
      applied = await applyPeerTable(input, candidate, confidence);
      break;
    case "objects_of_issue":
      applied = await applyObjects(input, candidate, confidence);
      break;
    case "strengths":
    case "risk_factors":
      applied = await applyStrengthsOrRisks(input, candidate, confidence);
      break;
    default:
      applied = await applyFallback(input, candidate, confidence);
      break;
  }

  if (!applied) {
    await upsertQuality({ confidence, fieldName: input.field_name, ipoId: input.ipoId, notes: "AI candidate saved for review; existing data was protected or destination needs review.", sourceName: input.source_name, sourceUrl: input.source_url, status: "needs_review" });
  }

  return { applied, candidate };
}

export async function approveEnrichedField(fieldId: string, reviewedBy: string | null) {
  const { data, error } = await supabaseAdmin.from("ipo_enriched_fields").select("*").eq("id", fieldId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Enriched field was not found.");
  const row = data as EnrichedFieldRow;

  return applyEnrichedField({
    confidence: row.confidence,
    display_value: row.display_value ?? "",
    evidence_text: row.evidence_text ?? "",
    field_name: row.field_name,
    field_value: row.field_value,
    forceApply: true,
    ipoId: row.ipo_id,
    jobId: row.job_id,
    reviewedBy,
    source_name: row.source_name ?? "AI enrichment",
    source_snapshot_id: row.source_snapshot_id,
    source_url: row.source_url,
  });
}

export async function rejectEnrichedField(fieldId: string, reviewedBy: string | null) {
  const { data, error } = await supabaseAdmin
    .from("ipo_enriched_fields")
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      status: "rejected",
    })
    .eq("id", fieldId)
    .select("*")
    .single();

  if (error) throw error;
  return data as EnrichedFieldRow;
}
