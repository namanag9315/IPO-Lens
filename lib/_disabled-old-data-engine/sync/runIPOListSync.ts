import { createClient } from '@supabase/supabase-js'
import { scrapeChittorgarhIPOList } from '../scrapers/chittorgarh'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type SyncResult = {
  syncType: string
  provider: string
  status: 'success' | 'partial' | 'failed' | 'partial_success' | 'low_yield'
  found: number
  saved: number
  skipped: number
  failed: number
  durationMs: number
  errors: string[]
  warnings?: string[]
  htmlLength?: number
  textLength?: number
  blockedDetected?: boolean
  fieldsExtracted?: number
  factsMapped?: number
  factsSaved?: number
  factKeysSaved?: string[]
}

export async function runIPOListSync(): Promise<SyncResult> {
  const start = Date.now()
  const result: SyncResult = {
    syncType: 'ipo_list',
    provider: 'CHITTORGARH',
    status: 'success',
    found: 0, saved: 0, skipped: 0, failed: 0,
    durationMs: 0,
    errors: []
  }

  // 1. Log start
  const { data: logEntry } = await supabase
    .from('ipo_sync_log')
    .insert({ sync_type: 'ipo_list', provider: 'CHITTORGARH', status: 'running' })
    .select('id').single()

  try {
    const ipos = await scrapeChittorgarhIPOList()
    result.found = ipos.length

    for (const ipo of ipos) {
      try {
        const { data: existing } = await supabase
          .from('ipos')
          .select('id, admin_verified')
          .eq('slug', ipo.slug)
          .single()

        let ipoId = existing?.id

        if (!existing) {
          // Insert new
          const { data: newIpo, error: insertErr } = await supabase
            .from('ipos')
            .insert({
              name: ipo.name,
              slug: ipo.slug,
              board: ipo.board,
              name_normalized: ipo.name.toLowerCase()
            })
            .select('id').single()

          if (insertErr) throw insertErr
          ipoId = newIpo?.id
          result.saved++
        } else if (!existing.admin_verified) {
          // Update existing
          const { error: updateErr } = await supabase
            .from('ipos')
            .update({
              name: ipo.name,
              board: ipo.board,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)

          if (updateErr) throw updateErr
          result.saved++
        } else {
          result.skipped++
        }

        // Save source link
        if (ipoId && ipo.chittorgarh_url) {
          await supabase.from('ipo_source_links').upsert({
            ipo_id: ipoId,
            source_type: 'chittorgarh_page',
            source_provider: 'CHITTORGARH',
            source_url: ipo.chittorgarh_url,
            source_priority: 95
          }, { onConflict: 'ipo_id,source_type,source_provider' })
        }

      } catch (err: any) {
        result.failed++
        result.errors.push(`Error on ${ipo.name}: ${err.message}`)
      }
    }

    if (result.failed > 0) result.status = 'partial'
    if (result.found === 0) result.status = 'failed'

  } catch (err: any) {
    result.status = 'failed'
    result.errors.push(`Fatal list sync error: ${err.message}`)
  }

  result.durationMs = Date.now() - start

  // Update log
  if (logEntry) {
    await supabase.from('ipo_sync_log').update({
      status: result.status,
      found: result.found,
      saved: result.saved,
      skipped: result.skipped,
      failed: result.failed,
      errors: result.errors,
      finished_at: new Date().toISOString(),
      duration_ms: result.durationMs
    }).eq('id', logEntry.id)
  }

  return result
}
