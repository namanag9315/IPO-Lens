import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface FactToSave {
  fact_key: string
  fact_value: any
  display_value?: string
  source_provider: string
  source_url?: string
  confidence?: 'high' | 'medium' | 'low'
  source_priority?: number
  admin_verified?: boolean
  imported_from_run_id?: string
}

export async function saveApprovedFactsLite(ipoId: string, facts: FactToSave[], force: boolean = false) {
  let savedCount = 0
  const errors: string[] = []

  // Fetch existing facts to check admin_verified and priorities
  const { data: existing } = await supabase.from('ipo_facts_lite').select('*').eq('ipo_id', ipoId)
  const existingMap = new Map((existing || []).map(f => [f.fact_key, f]))

  for (const fact of facts) {
    const old = existingMap.get(fact.fact_key)

    // Safety checks
    if (old) {
      if (old.admin_verified && !force && !fact.admin_verified) {
        errors.push(`Skipping ${fact.fact_key}: existing fact is admin_verified.`)
        continue
      }
      if (!force && old.source_priority > (fact.source_priority || 70)) {
        errors.push(`Skipping ${fact.fact_key}: existing fact has higher priority (${old.source_priority} > ${fact.source_priority}).`)
        continue
      }
      // Note: we consider "Being verified" / placeholder overwrites handled before it reaches this point (validation drops them),
      // but if an old one was a placeholder, it has low priority.
    }

    const { error: upsertErr } = await supabase.from('ipo_facts_lite').upsert({
      ipo_id: ipoId,
      fact_key: fact.fact_key,
      fact_value: fact.fact_value,
      display_value: fact.display_value || (typeof fact.fact_value === 'string' ? fact.fact_value : JSON.stringify(fact.fact_value)),
      source_provider: fact.source_provider,
      source_url: fact.source_url,
      confidence: fact.confidence || 'medium',
      source_priority: fact.source_priority || 70,
      admin_verified: fact.admin_verified || false,
      imported_from_run_id: fact.imported_from_run_id,
      is_latest: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'ipo_id,fact_key' })

    if (upsertErr) {
      errors.push(`Failed to save ${fact.fact_key}: ${upsertErr.message}`)
    } else {
      savedCount++
    }
  }

  return { savedCount, errors }
}
