import { createClient } from '@supabase/supabase-js'
import { scrapeInvestorGainGMP, scrapeIPOWatchSubscription } from './scrapers'
import { runGMPSyncLite } from './runGMPSyncLite'
import { runSubscriptionSyncLite } from './runSubscriptionSyncLite'
import { discoverIPODocumentLinks } from './discoverIPODocumentLinks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function runScheduledSyncLite() {
  console.log('Starting scheduled sync orchestration (Lite engine)...')
  const startTime = Date.now()

  // ─── 1. GMP Sync ──────────────────────────────────────────
  console.log('Fetching GMP data from InvestorGain...')
  const gmpRecords = await scrapeInvestorGainGMP()
  console.log(`Fetched ${gmpRecords.length} GMP records. Syncing...`)
  const gmpResult = await runGMPSyncLite(gmpRecords, 'INVESTORGAIN')
  console.log(`GMP Sync completed: staged ${gmpResult.staged}, auto-matched & saved ${gmpResult.saved}`)

  // ─── 2. Subscription Sync ───────────────────────────────────
  console.log('Fetching subscription data from IPOWatch...')
  const subRecords = await scrapeIPOWatchSubscription()
  console.log(`Fetched ${subRecords.length} subscription records. Syncing...`)
  const subResult = await runSubscriptionSyncLite(subRecords, 'IPOWATCH')
  console.log(`Subscription Sync completed: staged ${subResult.staged}, auto-matched & saved ${subResult.saved}`)

  // ─── 3. Document Link Discovery ─────────────────────────────
  console.log('Running DRHP/RHP discovery...')
  let docsFound = 0
  let docsSaved = 0

  // Fetch all active IPOs
  const { data: ipos } = await supabase
    .from('ipos')
    .select('id, name, slug, category')
    .neq('duplicate_status', 'merged')

  if (ipos) {
    // Check if we already have drhp/rhp links in ipo_facts_lite
    const { data: existingFacts } = await supabase
      .from('ipo_facts_lite')
      .select('ipo_id, fact_key')
      .in('fact_key', ['drhp_url', 'rhp_url', 'prospectus_url'])

    const docStatusMap = new Map<string, Set<string>>()
    if (existingFacts) {
      existingFacts.forEach(f => {
        if (!docStatusMap.has(f.ipo_id)) docStatusMap.set(f.ipo_id, new Set())
        docStatusMap.get(f.ipo_id)!.add(f.fact_key)
      })
    }

    for (const ipo of ipos) {
      const existing = docStatusMap.get(ipo.id)
      const hasDRHP = existing?.has('drhp_url')
      const hasRHP = existing?.has('rhp_url')

      if (!hasDRHP || !hasRHP) {
        console.log(`Discovering links for "${ipo.name}"...`)
        const discovered = await discoverIPODocumentLinks(ipo.name, ipo.slug, ipo.category)

        const factsToSave = []
        if (discovered.drhpUrl && !hasDRHP) {
          factsToSave.push({ fact_key: 'drhp_url', value: discovered.drhpUrl })
        }
        if (discovered.rhpUrl && !hasRHP) {
          factsToSave.push({ fact_key: 'rhp_url', value: discovered.rhpUrl })
        }
        if (discovered.prospectusUrl && !existing?.has('prospectus_url')) {
          factsToSave.push({ fact_key: 'prospectus_url', value: discovered.prospectusUrl })
        }

        if (factsToSave.length > 0) {
          docsFound += factsToSave.length
          for (const fact of factsToSave) {
            const { error } = await supabase
              .from('ipo_facts_lite')
              .upsert({
                ipo_id: ipo.id,
                fact_key: fact.fact_key,
                fact_value: fact.value,
                display_value: fact.value,
                source_provider: 'auto_discovery',
                confidence: 'high',
                source_priority: 95,
                admin_verified: false,
                is_latest: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'ipo_id,fact_key' })

            if (!error) docsSaved++
          }
        }
      }
    }
  }
  console.log(`Document discovery completed: found ${docsFound} links, saved ${docsSaved} links`)

  // Log summary
  const durationMs = Date.now() - startTime
  const summary = {
    gmp: { staged: gmpResult.staged, saved: gmpResult.saved },
    subscription: { staged: subResult.staged, saved: subResult.saved },
    documents: { discovered: docsFound, saved: docsSaved },
    durationMs
  }

  await supabase.from('ipo_import_runs_lite').insert({
    provider: 'SYSTEM_SCHEDULER',
    input_mode: 'admin_manual',
    status: 'imported',
    fetch_status: 'success',
    facts_detected: gmpRecords.length + subRecords.length,
    facts_imported: gmpResult.saved + subResult.saved + docsSaved,
    debug_json: summary,
    created_by: 'cron_scheduler'
  })

  return summary
}
