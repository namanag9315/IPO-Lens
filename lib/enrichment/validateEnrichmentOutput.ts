import { isEnrichableField, type EnrichableFieldName, type EnrichmentConfidence } from "@/lib/enrichment/enrichableFields";
import type { AIEnrichmentResult, SourceSnapshotRow } from "@/lib/enrichment/types";

const NUMERIC_FIELDS = new Set([
  "market_maker_reserved_shares",
  "market_maker_reserved_amount",
  "fresh_issue_amount",
  "ofs_amount",
  "face_value",
  "pre_issue_shares",
  "post_issue_shares",
  "eps_basic",
  "eps_diluted",
  "pre_ipo_pe",
  "post_ipo_pe",
  "peer_median_pe",
]);

const ARRAY_FIELDS = new Set(["peer_companies", "peer_valuation_table", "peer_financial_table", "objects_of_issue", "objects_categories", "objects_amounts", "strengths", "risk_factors"]);
const ADVICE_PATTERN = /\b(apply now|should apply|buy|sell|avoid this ipo|guaranteed|sure[-\s]?shot|target price|will list|must invest)\b/i;
const BLOCKED_FIELD_PATTERN = /\b(gmp|subscription|allotment_result|listing_price|target_price|recommendation)\b/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function confidence(value: unknown): EnrichmentConfidence | null {
  return value === "high" || value === "medium" || value === "low" ? value : null;
}

export function parseNumericField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/₹|rs\.?|inr|cr|crore|,|%/gi, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceSnapshotIdFor(row: Record<string, unknown>, snapshots: SourceSnapshotRow[]) {
  const sourceUrl = asString(row.source_url);
  const sourceName = asString(row.source_name);
  return (
    snapshots.find((snapshot) => snapshot.source_url && sourceUrl && snapshot.source_url === sourceUrl)?.id ??
    snapshots.find((snapshot) => snapshot.source_name === sourceName)?.id ??
    snapshots[0]?.id ??
    null
  );
}

function validateFieldValue(fieldName: EnrichableFieldName, fieldValue: unknown) {
  if (fieldValue === null || fieldValue === undefined || fieldValue === "") return null;
  if (NUMERIC_FIELDS.has(fieldName)) {
    return parseNumericField(fieldValue);
  }
  if (ARRAY_FIELDS.has(fieldName)) {
    if (Array.isArray(fieldValue)) return fieldValue;
    if (typeof fieldValue === "string") return [fieldValue];
    return null;
  }
  return fieldValue;
}

export function validateEnrichmentOutput(raw: unknown, requestedFields: string[], sourceSnapshots: SourceSnapshotRow[]): AIEnrichmentResult {
  const root = asRecord(raw);
  if (!root) {
    throw new Error("AI enrichment output was not a JSON object.");
  }

  const requested = new Set(requestedFields);
  const fields: AIEnrichmentResult["fields"] = [];
  const notFound: AIEnrichmentResult["not_found"] = [];
  const warnings = Array.isArray(root.warnings) ? root.warnings.map(String).slice(0, 20) : [];

  for (const item of Array.isArray(root.fields) ? root.fields : []) {
    const row = asRecord(item);
    if (!row) continue;

    const fieldName = asString(row.field_name);
    if (!isEnrichableField(fieldName) || BLOCKED_FIELD_PATTERN.test(fieldName) || (requested.size > 0 && !requested.has(fieldName))) {
      continue;
    }

    const fieldValue = validateFieldValue(fieldName, row.field_value);
    const evidenceText = asString(row.evidence_text);
    const sourceName = asString(row.source_name);
    const fieldConfidence = confidence(row.confidence);
    const displayValue = asString(row.display_value) || (typeof fieldValue === "string" ? fieldValue : JSON.stringify(fieldValue));

    if (fieldValue === null || !evidenceText || !sourceName || !fieldConfidence) {
      continue;
    }

    if (ADVICE_PATTERN.test(evidenceText) || ADVICE_PATTERN.test(displayValue)) {
      continue;
    }

    fields.push({
      confidence: fieldConfidence,
      display_value: displayValue.slice(0, 500),
      evidence_text: evidenceText.slice(0, 1000),
      field_name: fieldName,
      field_value: fieldValue,
      source_name: sourceName,
      source_snapshot_id: sourceSnapshotIdFor(row, sourceSnapshots),
      source_url: asString(row.source_url) || null,
    });
  }

  for (const item of Array.isArray(root.not_found) ? root.not_found : []) {
    const row = asRecord(item);
    if (!row) continue;
    const fieldName = asString(row.field_name);
    if (!isEnrichableField(fieldName)) continue;
    notFound.push({
      field_name: fieldName,
      reason: asString(row.reason) || "Not found in source text.",
    });
  }

  return { fields, not_found: notFound, warnings };
}
