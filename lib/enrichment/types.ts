import type { EnrichableFieldName, EnrichmentConfidence, EnrichmentFieldStatus, EnrichmentJobStatus, EnrichmentTrigger } from "@/lib/enrichment/enrichableFields";

export interface SourceSnapshotInput {
  ipoId: string;
  sourceName: string;
  sourceUrl?: string | null;
  sourceType?: string | null;
  rawText?: string | null;
  rawHtml?: string | null;
  parsedJson?: unknown;
  confidence?: EnrichmentConfidence;
}

export interface SourceSnapshotRow {
  id: string;
  ipo_id: string;
  source_name: string;
  source_url: string | null;
  source_type: string | null;
  raw_text: string | null;
  raw_html: string | null;
  parsed_json: unknown;
  captured_at: string;
  confidence: EnrichmentConfidence | null;
  created_at: string;
}

export interface EnrichmentJobRow {
  id: string;
  ipo_id: string;
  status: EnrichmentJobStatus;
  missing_fields: string[];
  source_snapshot_ids: string[];
  attempts: number;
  error_message: string | null;
  triggered_by: EnrichmentTrigger | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface AIExtractedField {
  field_name: EnrichableFieldName;
  field_value: unknown;
  display_value: string;
  confidence: EnrichmentConfidence;
  source_name: string;
  source_url: string | null;
  evidence_text: string;
  source_snapshot_id?: string | null;
}

export interface AINotFoundField {
  field_name: EnrichableFieldName;
  reason: string;
}

export interface AIEnrichmentResult {
  fields: AIExtractedField[];
  not_found: AINotFoundField[];
  warnings: string[];
}

export interface EnrichedFieldRow {
  id: string;
  ipo_id: string;
  job_id: string | null;
  field_name: EnrichableFieldName;
  field_value: unknown;
  display_value: string | null;
  source_name: string | null;
  source_url: string | null;
  source_snapshot_id: string | null;
  evidence_text: string | null;
  confidence: EnrichmentConfidence;
  status: EnrichmentFieldStatus;
  applied_to_table: string | null;
  applied_to_column: string | null;
  applied_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface EnrichmentRunResult {
  jobId: string;
  ipoId: string;
  status: EnrichmentJobStatus;
  fieldsExtracted: number;
  fieldsAutoApplied: number;
  fieldsNeedsReview: number;
  fieldsNotFound: number;
  errors: string[];
}
