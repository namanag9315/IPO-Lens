import { supabaseAdmin as supabase } from '@/lib/supabase'
import { getIPOBySlug } from '../data/getIPOData'

const REQUIRED_FACT_KEYS = [
  'company_description',
  'sector',
  'lead_manager_name',
  'registrar_name',
  'market_maker_name',
  'subscription_table',
  'peer_valuation_table',
  'financial_table',
  'strengths',
  'risks'
]

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export async function debugIPODataPipeline({ ipoId, slug }: { ipoId?: string, slug?: string }) {
  let query = supabase.from('ipos').select('*')
  if (ipoId) query = query.eq('id', ipoId)
  else if (slug) query = query.eq('slug', slug)
  else throw new Error("Must provide ipoId or slug")

  const { data: ipo } = await query.single()

  if (!ipo) {
    return {
      diagnosis: { brokenStage: "no_ipo", reason: "IPO not found in database.", recommendedFix: "Run runIPOListSync" }
    }
  }

  // 1. Fetch Source Links
  const { data: sourceLinks } = await supabase.from('ipo_source_links').select('*').eq('ipo_id', ipo.id)

  if (!sourceLinks || sourceLinks.length === 0) {
    return {
      ipo, sourceLinks: [], latestSyncLogs: [], latestImportRuns: [], facts: null, readerOutput: null,
      diagnosis: { brokenStage: "no_source", reason: "No source links found.", recommendedFix: "Run detail sync or document discovery." }
    }
  }

  // 2. Fetch Sync Logs & PDF Jobs
  const { data: latestSyncLogs } = await supabase.from('ipo_sync_log').select('*').order('started_at', { ascending: false }).limit(5)
  const { data: latestImportRuns } = await supabase.from('ipo_pdf_jobs').select('*').eq('ipo_id', ipo.id).order('created_at', { ascending: false }).limit(5)

  // 3. Fact Table Consistency Check
  const { data: factsV1 } = await supabase.from('ipo_facts').select('*').eq('ipo_id', ipo.id).eq('is_latest', true)
  let factsV2: any[] = []
  try {
    const { data } = await supabase.from('ipo_facts_v2').select('*').eq('ipo_id', ipo.id).eq('is_latest', true)
    factsV2 = data || []
  } catch (e) {
    // Ignore if v2 doesn't exist
  }

  const countV1 = factsV1?.length || 0
  const countV2 = factsV2?.length || 0

  let tableUsed = countV1 >= countV2 ? 'ipo_facts' : 'ipo_facts_v2'
  let primaryFacts = tableUsed === 'ipo_facts' ? factsV1 : factsV2

  if (!primaryFacts || primaryFacts.length === 0) {
    // Try the other one just in case
    if (countV1 > 0) { tableUsed = 'ipo_facts'; primaryFacts = factsV1 }
    else if (countV2 > 0) { tableUsed = 'ipo_facts_v2'; primaryFacts = factsV2 }
    else {
      return {
        ipo, sourceLinks, latestSyncLogs, latestImportRuns, facts: null, readerOutput: null,
        diagnosis: { brokenStage: "facts_not_saved", reason: "No facts found in either table.", recommendedFix: "Check scraper or importer logs." }
      }
    }
  }

  const keys = primaryFacts!.map(f => f.fact_key)
  const missingRequiredKeys = REQUIRED_FACT_KEYS.filter(k => !keys.includes(k))

  // 4. Fact Key Mismatch Check
  if (missingRequiredKeys.length > 0) {
    for (const missing of missingRequiredKeys) {
      const similar = keys.filter(k => levenshteinDistance(missing, k) <= 4)
      if (similar.length > 0) {
        return {
          ipo, sourceLinks, latestSyncLogs, latestImportRuns,
          facts: { tableUsed, count: primaryFacts!.length, keys, missingRequiredKeys, rows: primaryFacts },
          readerOutput: null,
          diagnosis: {
            brokenStage: "fact_key_mismatch",
            reason: "Found similarly named keys for missing required facts.",
            recommendedFix: "Normalize fact keys in scraper output.",
            expectedKey: missing,
            foundSimilarKeys: similar
          }
        }
      }
    }
  }

  // 5. Public Reader Check
  const readerOutput = await getIPOBySlug(ipo.slug)

  if (!readerOutput) {
     return {
       ipo, sourceLinks, latestSyncLogs, latestImportRuns,
       facts: { tableUsed, count: primaryFacts!.length, keys, missingRequiredKeys, rows: primaryFacts },
       readerOutput: null,
       diagnosis: { brokenStage: "page_render_issue", reason: "Reader returned null.", recommendedFix: "Check getIPOBySlug logic." }
     }
  }

  // Check structure. getIPOBySlug currently returns flat facts, but the spec says the UI might expect nested.
  // The spec requested checking for: companyProfile.description, sector, leadManager.name, etc.
  const hasCompanyDescription = !!(readerOutput as any).companyProfile?.description || !!readerOutput.facts['company_description']
  const hasSector = !!readerOutput.facts['sector'] || !!(readerOutput as any).sector
  const hasLeadManager = !!(readerOutput as any).leadManager?.name || !!readerOutput.facts['lead_manager_name'] || !!readerOutput.lead_manager
  const hasRegistrar = !!(readerOutput as any).registrar?.name || !!readerOutput.facts['registrar_name'] || !!readerOutput.registrar
  const hasMarketMaker = !!(readerOutput as any).marketMaker?.name || !!readerOutput.facts['market_maker_name'] || !!readerOutput.market_maker
  const hasSubscription = !!(readerOutput as any).subscription?.rows || !!readerOutput.latestSubscription || !!readerOutput.facts['subscription_table']
  const hasPeerValuation = !!(readerOutput as any).peerComparison?.rows || !!readerOutput.facts['peer_valuation_table'] || !!readerOutput.facts['peer_comparison']
  const hasFinancials = !!(readerOutput as any).financials?.rows || !!readerOutput.facts['financial_table'] || Object.keys(readerOutput.facts).some(k => k.startsWith('revenue_fy'))
  const hasStrengths = !!(readerOutput as any).strengths || !!readerOutput.facts['strengths']
  const hasRisks = !!(readerOutput as any).risks || !!readerOutput.facts['risks'] || !!readerOutput.facts['risk_factors']

  const checks = { hasCompanyDescription, hasSector, hasLeadManager, hasRegistrar, hasMarketMaker, hasSubscription, hasPeerValuation, hasFinancials, hasStrengths, hasRisks }

  // Consistency check: facts in DB but not mapped in reader?
  // (We check if `primaryFacts` has company_description, but `checks.hasCompanyDescription` is false)
  const dbHasCompanyDesc = keys.includes('company_description')
  if (dbHasCompanyDesc && !checks.hasCompanyDescription) {
    // This implies a table mismatch!
    // Our getIPOData reads from ipo_facts. If dbHasCompanyDesc is from ipo_facts_v2 but not ipo_facts, it's wrong_fact_table.
    const getIpoDataFactsCount = Object.keys(readerOutput.facts).length
    if (getIpoDataFactsCount === 0 && primaryFacts!.length > 0) {
      return {
         ipo, sourceLinks, latestSyncLogs, latestImportRuns,
         facts: { tableUsed, count: primaryFacts!.length, keys, missingRequiredKeys, rows: primaryFacts },
         readerOutput: { ...checks, raw: readerOutput },
         diagnosis: {
           brokenStage: "wrong_fact_table",
           reason: `Facts exist in ${tableUsed} but public reader is not reading them (it likely reads the other).`,
           recommendedFix: "Pick one canonical fact table."
         }
      }
    }

    return {
       ipo, sourceLinks, latestSyncLogs, latestImportRuns,
       facts: { tableUsed, count: primaryFacts!.length, keys, missingRequiredKeys, rows: primaryFacts },
       readerOutput: { ...checks, raw: readerOutput },
       diagnosis: {
         brokenStage: "reader_not_reading_facts",
         reason: "Fact exists in DB but is not mapped in the reader's output structure.",
         recommendedFix: "Update getIPOData to correctly nest/map the fact."
       }
    }
  }

  let diagnosis = { brokenStage: "unknown", reason: "Everything seems fine up to readerOutput, check frontend component.", recommendedFix: "Inspect page.tsx" }
  if (missingRequiredKeys.length > 0) {
    diagnosis = { brokenStage: "extract_failed", reason: `Missing critical facts: ${missingRequiredKeys.join(', ')}`, recommendedFix: "Update scrapers to find these fields." }
  }

  return {
    ipo, sourceLinks, latestSyncLogs, latestImportRuns,
    facts: { tableUsed, count: primaryFacts!.length, keys, missingRequiredKeys, rows: primaryFacts },
    readerOutput: { ...checks, raw: readerOutput },
    diagnosis
  }
}
