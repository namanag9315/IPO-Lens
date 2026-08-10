import { createClient } from '@supabase/supabase-js'
import { scrapeChittorgarhIPODetail } from '../scrapers/chittorgarh'
import { saveManyFacts } from '../db/saveFact'
import type { SyncResult } from './runIPOListSync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function runDetailSync(targetSlug?: string): Promise<SyncResult> {
  const start = Date.now()
  const result: SyncResult = {
    syncType: 'detail_sync',
    provider: 'CHITTORGARH',
    status: 'success',
    found: 0, saved: 0, skipped: 0, failed: 0,
    durationMs: 0,
    errors: []
  }

  const { data: logEntry } = await supabase
    .from('ipo_sync_log')
    .insert({ sync_type: 'detail_sync', provider: 'CHITTORGARH', status: 'running' })
    .select('id').single()

  try {
    let query = supabase.from('ipos').select('*')
    if (targetSlug) {
      query = query.eq('slug', targetSlug)
    }

    const { data: ipos } = await query
    if (!ipos) throw new Error('Failed to fetch IPOs from DB')

    // Filter staleness (Fix 2)
    const activeIpos = targetSlug ? ipos : ipos.filter(ipo => {
      if (ipo.admin_verified) return false

      const updatedDiffHours = (Date.now() - new Date(ipo.updated_at).getTime()) / (1000 * 60 * 60)
      if (updatedDiffHours < 5) return false // freshly updated

      if (ipo.status === 'listed' && ipo.listing_date) {
        const listedDaysAgo = (Date.now() - new Date(ipo.listing_date).getTime()) / (1000 * 60 * 60 * 24)
        if (listedDaysAgo > 30) return false // old listed IPO
      }

      return true
    })

    result.found = activeIpos.length

    for (const ipo of activeIpos) {
      try {
        const scraped = await scrapeChittorgarhIPODetail(ipo.slug)
        if (scraped.error) {
          result.failed++
          result.errors.push(`Error on ${ipo.slug}: ${scraped.error}`)
          continue
        }

        const factsToSave = []
        for (const [key, val] of Object.entries(scraped.facts)) {
          factsToSave.push({
            ipo_id: ipo.id,
            fact_key: key,
            raw_value: String(val),
            numeric_value: typeof val === 'number' ? val : undefined,
            source_provider: 'CHITTORGARH',
            source_url: scraped.url,
            source_priority: 95
          })
        }

        const saveRes = await saveManyFacts(factsToSave)
        result.saved += saveRes.saved
        result.skipped += saveRes.skipped
        result.failed += saveRes.failed

        if (scraped.low_yield) {
           result.errors.push(`Low yield on ${ipo.slug}: Possible selector drift.`)
        }

        // Update ipos table
        await supabase.from('ipos').update({
          price_band_low: scraped.facts.price_band ? parseFloat(String(scraped.facts.price_band).split(' ')[0].replace(/[^0-9.-]/g,'')) || ipo.price_band_low : ipo.price_band_low,
          price_band_high: scraped.facts.price_band ? parseFloat(String(scraped.facts.price_band).split('to').pop()?.replace(/[^0-9.-]/g,'') || '') || ipo.price_band_high : ipo.price_band_high,
          lot_size: scraped.facts.lot_size || ipo.lot_size,
          issue_size_cr: scraped.facts.issue_size_cr || ipo.issue_size_cr,
          face_value: scraped.facts.face_value || ipo.face_value,
          open_date: scraped.facts.open_date ? new Date(scraped.facts.open_date).toISOString() : ipo.open_date,
          close_date: scraped.facts.close_date ? new Date(scraped.facts.close_date).toISOString() : ipo.close_date,
          allotment_date: scraped.facts.allotment_date ? new Date(scraped.facts.allotment_date).toISOString() : ipo.allotment_date,
          refund_date: scraped.facts.refund_date ? new Date(scraped.facts.refund_date).toISOString() : ipo.refund_date,
          demat_credit_date: scraped.facts.demat_credit_date ? new Date(scraped.facts.demat_credit_date).toISOString() : ipo.demat_credit_date,
          listing_date: scraped.facts.listing_date ? new Date(scraped.facts.listing_date).toISOString() : ipo.listing_date,
          lead_manager: scraped.facts.lead_manager || ipo.lead_manager,
          registrar: scraped.facts.registrar || ipo.registrar,
          market_maker: scraped.facts.market_maker || ipo.market_maker,
          exchange: scraped.facts.exchange || ipo.exchange,
          updated_at: new Date().toISOString()
        }).eq('id', ipo.id)

      } catch (err: any) {
        result.failed++
        result.errors.push(`Error saving ${ipo.slug}: ${err.message}`)
      }
    }

    if (result.failed > 0) result.status = 'partial'
    if (result.saved === 0 && result.found > 0) result.status = 'partial'

  } catch (err: any) {
    result.status = 'failed'
    result.errors.push(`Fatal detail sync error: ${err.message}`)
  }

  result.durationMs = Date.now() - start
  result.factsSaved = result.saved

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
