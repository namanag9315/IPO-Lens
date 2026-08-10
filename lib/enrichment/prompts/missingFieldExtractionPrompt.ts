import type { SourceSnapshotRow } from "@/lib/enrichment/types";

function trimSource(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 18_000);
}

export function missingFieldExtractionPrompt({
  ipoName,
  missingFields,
  sourceSnapshots,
}: {
  ipoName: string;
  missingFields: string[];
  sourceSnapshots: SourceSnapshotRow[];
}) {
  const snapshots = sourceSnapshots.map((snapshot, index) => ({
    id: snapshot.id,
    index: index + 1,
    source_name: snapshot.source_name,
    source_url: snapshot.source_url,
    source_type: snapshot.source_type,
    confidence: snapshot.confidence,
    raw_text: trimSource(snapshot.raw_text),
    parsed_json: snapshot.parsed_json ?? null,
  }));

  return `You are an IPO data extraction assistant for IPO Lens.

You must extract missing IPO fields from the provided source text only.

Rules:
* Do not use outside knowledge.
* Do not use memory.
* Do not guess current data.
* Do not provide investment advice.
* If the field is not clearly present, return null.
* Every extracted field must include evidence_text copied or closely paraphrased from the source.
* Return JSON only.
* No markdown.

IPO name:
${ipoName}

Missing fields:
${JSON.stringify(missingFields)}

Source snapshots:
${JSON.stringify(snapshots)}

Return this JSON schema:
{
  "fields": [
    {
      "field_name": "string",
      "field_value": {},
      "display_value": "string",
      "confidence": "high|medium|low",
      "source_name": "string",
      "source_url": "string|null",
      "evidence_text": "string"
    }
  ],
  "not_found": [
    {
      "field_name": "string",
      "reason": "string"
    }
  ],
  "warnings": ["string"]
}

Field-specific rules:
* sector can be inferred from product/business description, but confidence should be medium unless source explicitly states sector.
* lead_manager_name must be extracted only from a clear lead manager/merchant banker/BRLM section.
* registrar_name must be extracted only from a clear registrar section.
* market_maker_name must be extracted only from a clear market maker section or IPO details table.
* peer_valuation_table must include company names and numeric P/E values.
* objects_of_issue must include actual use-of-proceeds text or table.
* strengths and risk_factors must come from source text, not generic assumptions.
* Do not return current GMP, live subscription, listing price, allotment result, target price, recommendation, or guaranteed listing estimate.`;
}
