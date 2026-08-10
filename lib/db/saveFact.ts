import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface FactInput {
  ipo_id: string
  fact_key: string
  raw_value: string
  parsed_value?: string
  numeric_value?: number
  source_provider: string
  source_url: string
  source_priority: number
  confidence?: 'high' | 'medium' | 'low'
  is_official?: boolean
  expires_at?: Date
}

export async function saveFact(
  fact: FactInput
): Promise<{ saved: boolean; reason: string }> {
  // Check if admin_verified fact exists in new table
  const { data: existing } = await supabase
    .from('ipo_facts')
    .select('id, source_priority, admin_verified')
    .eq('ipo_id', fact.ipo_id)
    .eq('fact_key', fact.fact_key)
    .eq('is_latest', true)
    .single()

  if (existing?.admin_verified) {
    return {
      saved: false,
      reason: 'admin_verified — skipped'
    }
  }

  // If existing has higher priority, skip
  if (existing &&
      existing.source_priority >= fact.source_priority) {
    return {
      saved: false,
      reason: `existing priority ${existing.source_priority} >= new ${fact.source_priority}`
    }
  }

  // Mark old fact as not latest
  if (existing) {
    await supabase
      .from('ipo_facts')
      .update({ is_latest: false })
      .eq('id', existing.id)
  }

  // Insert new fact
  const { error } = await supabase
    .from('ipo_facts')
    .insert({
      ...fact,
      is_latest: true,
      captured_at: new Date().toISOString()
    })

  if (error) {
    return { saved: false, reason: error.message }
  }

  // ==========================================
  // BRIDGE MIGRATION SUPPORT (Fix 1)
  // Also write to ipo_facts_v2 to ensure
  // public pages don't break during migration
  // ==========================================
  try {
    // Determine existing v2 fact to deprecate
    const { data: existingV2 } = await supabase
      .from('ipo_facts_v2')
      .select('id')
      .eq('ipo_id', fact.ipo_id)
      .eq('fact_key', fact.fact_key)
      .eq('is_latest', true)
      .single()

    if (existingV2) {
      await supabase
        .from('ipo_facts_v2')
        .update({ is_latest: false })
        .eq('id', existingV2.id)
    }

    // Insert to v2
    await supabase
      .from('ipo_facts_v2')
      .insert({
        ...fact,
        is_latest: true,
        captured_at: new Date().toISOString()
      })
  } catch (e) {
    // Ignore v2 write errors to prevent failing the core write
    console.error("Failed to write to ipo_facts_v2 bridge:", e);
  }

  return { saved: true, reason: 'inserted' }
}

export async function saveManyFacts(
  facts: FactInput[]
): Promise<{ saved: number; skipped: number; failed: number }> {
  let saved = 0, skipped = 0, failed = 0

  for (const fact of facts) {
    try {
      const result = await saveFact(fact)
      if (result.saved) saved++
      else skipped++
    } catch {
      failed++
    }
  }

  return { saved, skipped, failed }
}
