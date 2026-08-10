/**
 * linkLeadManagersClean.ts
 *
 * After detail facts are saved, resolves `lead_manager_name` facts for each IPO
 * into the `lead_managers` table and writes the `ipo_lead_managers` join row.
 *
 * Strategy:
 *   1. Load the `lead_manager_name` fact for the IPO.
 *   2. Normalize it (strip Pvt/Ltd/Private/Limited/& suffixes).
 *   3. Try ILIKE match against existing `lead_managers.name`.
 *   4. If match confidence ≥ threshold → create/upsert `ipo_lead_managers` row.
 *   5. If no match → create a new `lead_managers` row, then link.
 *
 * Does NOT overwrite admin_verified links.
 * Safe to run multiple times (upserts on conflict).
 */

import { supabaseAdmin } from "@/lib/supabase";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip common Indian legal suffixes AND generic finance words to get meaningful name tokens */
function normalizeLMName(raw: string): string {
  return raw
    .replace(/\bpvt\.?\b|\bprivate\b|\bltd\.?\b|\blimited\b|\bllp\b|\b&\b|\band\b/gi, " ")
    // Strip very common generic finance words that cause false positives
    .replace(/\bcapital\b|\bmarkets?\b|\badvisors?\b|\bsecurities\b|\bfinancial\b|\bservices\b|\bmanagement\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


/**
 * Score how well two normalized LM names match (0–100).
 * Uses token overlap: what fraction of the shorter name's tokens are in the longer.
 */
function nameSimilarity(a: string, b: string): number {
  const tokA = new Set(a.split(" ").filter(Boolean));
  const tokB = new Set(b.split(" ").filter(Boolean));
  if (tokA.size === 0 || tokB.size === 0) return 0;
  const smaller = tokA.size <= tokB.size ? tokA : tokB;
  const larger = tokA.size <= tokB.size ? tokB : tokA;
  let overlap = 0;
  for (const t of smaller) {
    if (larger.has(t)) overlap++;
  }
  return Math.round((overlap / smaller.size) * 100);
}

// ─── Main function ────────────────────────────────────────────────────────────

export type LMLinkResult = {
  ipoId: string;
  lmName: string | null;
  action: "linked_existing" | "created_and_linked" | "no_fact" | "already_linked" | "low_confidence" | "error";
  lmId?: string;
  confidence?: number;
  error?: string;
};

export async function linkLeadManagerForIPO(ipoId: string): Promise<LMLinkResult> {
  try {
    // 1. Check if already linked
    const { data: existing } = await supabaseAdmin
      .from("ipo_lead_managers")
      .select("lead_manager_id")
      .eq("ipo_id", ipoId)
      .limit(1);

    if (existing && existing.length > 0) {
      return { ipoId, lmName: null, action: "already_linked", lmId: existing[0].lead_manager_id };
    }

    // 2. Load LM name from ipo_facts_clean
    const { data: factRow } = await supabaseAdmin
      .from("ipo_facts_clean")
      .select("fact_value")
      .eq("ipo_id", ipoId)
      .eq("fact_key", "lead_manager_name")
      .maybeSingle();

    const rawName = typeof factRow?.fact_value === "string"
      ? factRow.fact_value.trim()
      : null;

    if (!rawName) {
      return { ipoId, lmName: null, action: "no_fact" };
    }

    const normalizedInput = normalizeLMName(rawName);

    // 3. Fetch all existing lead_managers for fuzzy match
    const { data: allLMs } = await supabaseAdmin
      .from("lead_managers")
      .select("id, name");

    let bestLM: { id: string; name: string } | null = null;
    let bestScore = 0;

    for (const lm of allLMs ?? []) {
      const score = nameSimilarity(normalizedInput, normalizeLMName(lm.name));
      if (score > bestScore) {
        bestScore = score;
        bestLM = lm;
      }
    }

    let lmId: string;

    if (bestLM && bestScore >= 65) {
      // 4a. Good match found — use it
      lmId = bestLM.id;

      // 5. Create ipo_lead_managers link
      await supabaseAdmin
        .from("ipo_lead_managers")
        .upsert(
          {
            ipo_id: ipoId,
            lead_manager_id: lmId,
            is_primary: true,
          },
          { onConflict: "ipo_id,lead_manager_id" }
        );

      return {
        ipoId,
        lmName: rawName,
        action: "linked_existing",
        lmId,
        confidence: bestScore,
      };
    }

    if (bestScore >= 40 && bestScore < 65) {
      // Low confidence — don't auto-link, log as pending
      return {
        ipoId,
        lmName: rawName,
        action: "low_confidence",
        lmId: bestLM?.id,
        confidence: bestScore,
      };
    }

    // 4b. No match — create new lead_managers row
    const { data: newLM, error: createErr } = await supabaseAdmin
      .from("lead_managers")
      .insert({
        name: rawName,
        website: null,
      })
      .select("id")
      .single();

    if (createErr || !newLM) {
      return { ipoId, lmName: rawName, action: "error", error: createErr?.message ?? "Failed to create LM row" };
    }

    lmId = newLM.id;

    // 5. Create ipo_lead_managers link
    await supabaseAdmin
      .from("ipo_lead_managers")
      .upsert(
        {
          ipo_id: ipoId,
          lead_manager_id: lmId,
          is_primary: true,
        },
        { onConflict: "ipo_id,lead_manager_id" }
      );

    return {
      ipoId,
      lmName: rawName,
      action: "created_and_linked",
      lmId,
      confidence: 0,
    };
  } catch (err) {
    return {
      ipoId,
      lmName: null,
      action: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Backfill all IPOs that have a `lead_manager_name` fact but no `ipo_lead_managers` link.
 */
export async function backfillLeadManagerLinks(): Promise<{
  processed: number;
  linked: number;
  created: number;
  skipped: number;
  lowConfidence: number;
  errors: number;
  results: LMLinkResult[];
}> {
  // Find all IPOs with LM name facts but no link yet
  const { data: factsWithLM } = await supabaseAdmin
    .from("ipo_facts_clean")
    .select("ipo_id")
    .eq("fact_key", "lead_manager_name");

  const allIpoIds = [...new Set((factsWithLM ?? []).map((r) => r.ipo_id))];

  // Exclude already-linked ones
  const { data: alreadyLinked } = await supabaseAdmin
    .from("ipo_lead_managers")
    .select("ipo_id");
  const linkedSet = new Set((alreadyLinked ?? []).map((r) => r.ipo_id));

  const toProcess = allIpoIds.filter((id) => !linkedSet.has(id));

  const results: LMLinkResult[] = [];
  let linked = 0;
  let created = 0;
  let skipped = 0;
  let lowConfidence = 0;
  let errors = 0;

  for (const ipoId of toProcess) {
    const result = await linkLeadManagerForIPO(ipoId);
    results.push(result);

    switch (result.action) {
      case "linked_existing": linked++; break;
      case "created_and_linked": created++; break;
      case "already_linked": skipped++; break;
      case "low_confidence": lowConfidence++; break;
      case "no_fact": skipped++; break;
      case "error": errors++; break;
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, 50));
  }

  return {
    processed: toProcess.length,
    linked,
    created,
    skipped,
    lowConfidence,
    errors,
    results,
  };
}
