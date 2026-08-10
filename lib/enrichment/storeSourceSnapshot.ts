import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { SourceSnapshotInput, SourceSnapshotRow } from "@/lib/enrichment/types";

const MAX_TEXT_LENGTH = 80_000;
const MAX_HTML_LENGTH = 180_000;

export function cleanSourceText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function compactHtml(value: string | null | undefined) {
  if (!value) return null;
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_HTML_LENGTH);
}

export async function storeSourceSnapshot(input: SourceSnapshotInput): Promise<SourceSnapshotRow | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const rawText = cleanSourceText(input.rawText);
  const rawHtml = compactHtml(input.rawHtml);

  if (!rawText && !rawHtml && !input.parsedJson) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("ipo_source_snapshots")
    .insert({
      confidence: input.confidence ?? "medium",
      ipo_id: input.ipoId,
      parsed_json: input.parsedJson ?? null,
      raw_html: rawHtml,
      raw_text: rawText || null,
      source_name: input.sourceName,
      source_type: input.sourceType ?? "ipo_detail",
      source_url: input.sourceUrl ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SourceSnapshotRow;
}
