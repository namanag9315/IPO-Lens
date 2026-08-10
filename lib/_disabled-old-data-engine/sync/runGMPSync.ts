import { createClient } from '@supabase/supabase-js'
import { scrapeInvestorGainGMP } from '../scrapers/investorGainGMP'
import { scrapeIPOWatchGMP } from '../scrapers/ipowatchGMP'
import { matchIPOByName } from '../utils/normalizeIPOName'
import { saveFact } from '../db/saveFact'
import type { SyncResult } from './runIPOListSync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function runGMPSync(): Promise<SyncResult> {
  const start = Date.now()
  const result: SyncResult = {
    syncType: 'gmp',
    provider: 'INVESTORGAIN_IPOWATCH',
    status: 'success',
    found: 0, saved: 0, skipped: 0, failed: 0,
    durationMs: 0,
    errors: []
  }

  const { data: logEntry } = await supabase
    .from('ipo_sync_log')
    .insert({ sync_type: 'gmp', provider: 'INVESTORGAIN_IPOWATCH', status: 'running' })
    .select('id').single()

  try {
    const { data: ipos } = await supabase.from('ipos').select('id, name, slug').in('status', ['upcoming', 'open', 'closed', 'allotment'])
    if (!ipos) throw new Error('Failed to load active IPOs')

    const [igRes, iwRes] = await Promise.all([
      scrapeInvestorGainGMP(),
      scrapeIPOWatchGMP()
    ])

    if (igRes.error) result.errors.push(`InvestorGain Error: ${igRes.error}`)
    if (iwRes.error) result.errors.push(`IPOWatch Error: ${iwRes.error}`)

    const gmpMap = new Map<string, any>() // ipo_id -> { gmp_values: number[], est_listings: number[], pct: number }

    // Process InvestorGain
    for (const item of igRes.results || []) {
      const match = matchIPOByName(item.ipoName, ipos)
      if (match.match && (match.confidence === 'high' || match.confidence === 'medium')) {
        const id = match.match.id
        if (!gmpMap.has(id)) gmpMap.set(id, { gmp_values: [], est_listings: [], pcts: [] })
        gmpMap.get(id).gmp_values.push(item.gmp_value)
        if (item.est_listing !== null) gmpMap.get(id).est_listings.push(item.est_listing)
        if (item.gmp_pct !== null) gmpMap.get(id).pcts.push(item.gmp_pct)

        // Save History
        await supabase.from('ipo_gmp_history').insert({
          ipo_id: id,
          gmp_value: item.gmp_value,
          gmp_pct: item.gmp_pct,
          est_listing: item.est_listing,
          source_provider: 'INVESTORGAIN',
          source_url: igRes.url
        })
        result.found++
      }
    }

    // Process IPOWatch
    for (const item of iwRes.results || []) {
      const match = matchIPOByName(item.ipoName, ipos)
      if (match.match && (match.confidence === 'high' || match.confidence === 'medium')) {
        const id = match.match.id
        if (!gmpMap.has(id)) gmpMap.set(id, { gmp_values: [], est_listings: [], pcts: [] })
        gmpMap.get(id).gmp_values.push(item.gmp_value)
        if (item.est_listing !== null) gmpMap.get(id).est_listings.push(item.est_listing)
        if (item.gmp_pct !== null) gmpMap.get(id).pcts.push(item.gmp_pct)

        // Save History
        await supabase.from('ipo_gmp_history').insert({
          ipo_id: id,
          gmp_value: item.gmp_value,
          gmp_pct: item.gmp_pct,
          est_listing: item.est_listing,
          source_provider: 'IPOWATCH',
          source_url: iwRes.url
        })
        result.found++
      }
    }

    // Save averaged facts
    for (const [ipoId, data] of Array.from(gmpMap.entries())) {
      try {
        const avgGmp = Math.round(data.gmp_values.reduce((a:number,b:number)=>a+b,0) / data.gmp_values.length)
        const avgEst = data.est_listings.length ? Math.round(data.est_listings.reduce((a:number,b:number)=>a+b,0) / data.est_listings.length) : undefined
        const avgPct = data.pcts.length ? parseFloat((data.pcts.reduce((a:number,b:number)=>a+b,0) / data.pcts.length).toFixed(2)) : undefined

        await saveFact({ ipo_id: ipoId, fact_key: 'gmp_value', raw_value: avgGmp.toString(), numeric_value: avgGmp, source_provider: 'INVESTORGAIN_IPOWATCH', source_url: igRes.url || '', source_priority: 75 })
        if (avgEst !== undefined) await saveFact({ ipo_id: ipoId, fact_key: 'est_listing_price', raw_value: avgEst.toString(), numeric_value: avgEst, source_provider: 'INVESTORGAIN_IPOWATCH', source_url: igRes.url || '', source_priority: 75 })
        if (avgPct !== undefined) await saveFact({ ipo_id: ipoId, fact_key: 'gmp_pct', raw_value: avgPct.toString(), numeric_value: avgPct, source_provider: 'INVESTORGAIN_IPOWATCH', source_url: igRes.url || '', source_priority: 75 })

        result.saved++
      } catch(err) {
        result.failed++
      }
    }

  } catch (err: any) {
    result.status = 'failed'
    result.errors.push(`Fatal GMP sync error: ${err.message}`)
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
