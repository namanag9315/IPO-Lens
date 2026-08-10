import { validateFacts } from "@/lib/ipo-engine-clean/validateFacts";
import { supabaseAdmin } from "@/lib/supabase";
import type { FactCandidate } from "@/lib/ipo-engine-clean/types";

function confidenceRank(value: string | null | undefined) {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

function isPlaceholder(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return /^(|"|being verified|na|n\/a|pending|not available|-|null)$/i.test(text.trim());
}

export async function saveFactsClean({
  facts,
  force = false,
  ipoId,
  sourcePriority,
  sourceProvider,
  sourceUrl,
}: {
  facts: FactCandidate[];
  force?: boolean;
  ipoId: string;
  sourcePriority: number;
  sourceProvider: string;
  sourceUrl?: string | null;
}) {
  const validation = validateFacts(facts);
  const { data: existingRows } = await supabaseAdmin.from("ipo_facts_clean").select("*").eq("ipo_id", ipoId);
  const existing = new Map(((existingRows ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.fact_key), row]));
  const skipped: string[] = validation.rejected.map((item) => `${item.fact.factKey}: ${item.reason}`);
  let saved = 0;
  const savedFactKeys: string[] = [];

  for (const fact of validation.accepted) {
    const old = existing.get(fact.factKey);
    if (old && !force) {
      if (old.admin_verified === true) {
        skipped.push(`${fact.factKey}: existing fact is admin verified.`);
        continue;
      }

      const oldPriority = typeof old.source_priority === "number" ? old.source_priority : 70;
      const oldConfidence = confidenceRank(typeof old.confidence === "string" ? old.confidence : null);
      const newConfidence = confidenceRank(fact.confidence ?? "medium");
      const existingValue = old.fact_value;

      if (!isPlaceholder(existingValue) && oldPriority < sourcePriority && oldConfidence >= newConfidence) {
        skipped.push(`${fact.factKey}: existing fact has better source priority/confidence.`);
        continue;
      }
    }

    const { error } = await supabaseAdmin.from("ipo_facts_clean").upsert(
      {
        admin_verified: false,
        confidence: fact.confidence ?? "medium",
        display_value: fact.displayValue ?? (typeof fact.factValue === "string" ? fact.factValue : JSON.stringify(fact.factValue)),
        fact_key: fact.factKey,
        fact_value: fact.factValue,
        ipo_id: ipoId,
        is_official: fact.isOfficial ?? false,
        source_priority: sourcePriority,
        source_provider: sourceProvider,
        source_url: sourceUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ipo_id,fact_key" },
    );

    if (error) skipped.push(`${fact.factKey}: ${error.message}`);
    else {
      saved += 1;
      savedFactKeys.push(fact.factKey);
    }
  }

  return { rejected: validation.rejected.length, saved, savedFactKeys: Array.from(new Set(savedFactKeys)), skipped };
}
