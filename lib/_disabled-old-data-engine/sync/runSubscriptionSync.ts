import { createClient } from '@supabase/supabase-js'
import { scrapeIPOWatchSubscription } from '../scrapers/ipowatchSubscription'
import { matchIPOByName } from '../utils/normalizeIPOName'
import { saveFact } from '../db/saveFact'
import type { SyncResult } from './runIPOListSync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function runSubscriptionSync(mode: 'active' | 'all'): Promise<SyncResult> {
  const start = Date.now()
  const result: SyncResult = {
    syncType: 'subscription',
    provider: 'IPOWATCH',
    status: 'success',
    found: 0, saved: 0, skipped: 0, failed: 0,
    durationMs: 0,
    errors: []
  }

  const { data: logEntry } = await supabase
    .from('ipo_sync_log')
    .insert({ sync_type: 'subscription', provider: 'IPOWATCH', status: 'running' })
    .select('id').single()

  try {
    let query = supabase.from('ipos').select('id, name, slug, open_date, close_date, status')
    if (mode === 'active') {
      const today = new Date().toISOString().split('T')[0]
      // Get IPOs where today is roughly near the open/close date window, or status is open
      query = query.in('status', ['open', 'upcoming'])
    } else {
      query = query.in('status', ['upcoming', 'open', 'closed', 'allotment'])
    }

    const { data: ipos } = await query
    if (!ipos) throw new Error('Failed to load IPOs')

    const iwRes = await scrapeIPOWatchSubscription()
    if (iwRes.error) {
      result.errors.push(`IPOWatch Sub Error: ${iwRes.error}`)
    }

    // Process IPOWatch
    for (const item of iwRes.results || []) {
      const match = matchIPOByName(item.ipoName, ipos)
      if (match.match && (match.confidence === 'high' || match.confidence === 'medium')) {
        const id = match.match.id
        result.found++

        try {
          // Save History
          await supabase.from('ipo_subscription_history').insert({
            ipo_id: id,
            qib_x: item.qib_x,
            nii_x: item.nii_x,
            retail_x: item.retail_x,
            total_x: item.total_x,
            source_provider: 'IPOWATCH',
            source_url: iwRes.url
          })

          // Save Facts
          await saveFact({ ipo_id: id, fact_key: 'qib_subscription', raw_value: item.qib_x.toString(), numeric_value: item.qib_x, source_provider: 'IPOWATCH', source_url: iwRes.url || '', source_priority: 75 })
          await saveFact({ ipo_id: id, fact_key: 'nii_subscription', raw_value: item.nii_x.toString(), numeric_value: item.nii_x, source_provider: 'IPOWATCH', source_url: iwRes.url || '', source_priority: 75 })
          await saveFact({ ipo_id: id, fact_key: 'retail_subscription', raw_value: item.retail_x.toString(), numeric_value: item.retail_x, source_provider: 'IPOWATCH', source_url: iwRes.url || '', source_priority: 75 })
          await saveFact({ ipo_id: id, fact_key: 'total_subscription', raw_value: item.total_x.toString(), numeric_value: item.total_x, source_provider: 'IPOWATCH', source_url: iwRes.url || '', source_priority: 75 })

          result.saved++
        } catch(err: any) {
          result.failed++
          result.errors.push(`Save error for ${item.ipoName}: ${err.message}`)
        }
      }
    }

  } catch (err: any) {
    result.status = 'failed'
    result.errors.push(`Fatal Subscription sync error: ${err.message}`)
  }

  result.durationMs = Date.now() - start

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
