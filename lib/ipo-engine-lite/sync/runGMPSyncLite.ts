import { createClient } from '@supabase/supabase-js'
import { matchIPONameLite } from '../matchIPONameLite'
import { normalizeIPONameLite } from '../normalizeIPONameLite'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function runGMPSyncLite(records: any[], provider: string) {
  // records: { rawName, gmpValue, estListing, sourceUrl }

  const { data: ipos } = await supabase.from('ipos').select('id, name')
  const { data: aliases } = await supabase.from('ipo_aliases_lite').select('*')

  let saved = 0
  let staged = 0

  for (const rec of records) {
    const match = matchIPONameLite(rec.rawName, ipos || [], aliases || [])

    // Stage into source records
    const { data: stagedRecord, error: stageErr } = await supabase.from('ipo_source_records_lite').insert({
      provider,
      data_type: 'gmp',
      raw_name: rec.rawName,
      normalized_name: normalizeIPONameLite(rec.rawName),
      source_url: rec.sourceUrl,
      payload: rec,
      matched_ipo_id: match.ipoId,
      match_confidence: match.confidence,
      status: match.confidence >= 85 ? 'matched' : (match.confidence >= 70 ? 'needs_review' : 'ignored'),
      reason: match.reason
    }).select('id').single()

    if (stageErr) continue
    staged++

    // If high confidence, push to history
    if (match.confidence >= 85 && match.ipoId) {
       // Dedupe minute bucket
       const timestamp = new Date().toISOString()
       // A proper dedupe would check the last 5 minutes for the exact same GMP value.
       // For now, we just insert.
       const { error: histErr } = await supabase.from('ipo_gmp_history').insert({
         ipo_id: match.ipoId,
         gmp_value: rec.gmpValue,
         est_listing: rec.estListing,
         source_provider: provider,
         captured_at: timestamp
       })
       if (!histErr) saved++
    }
  }

  return { staged, saved }
}
