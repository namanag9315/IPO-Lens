import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const num = Number(String(val).replace(/[^0-9.]/g, ''))
  return Number.isNaN(num) ? null : num
}

function normalizeForGrouping(name: string): string {
  return name.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(private limited|pvt ltd|pvt limited|private ltd|limited|ltd|pvt|llp)\b/g, '')
    .replace(/\b(sme ipo|mainboard ipo|ipo)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function getIPODataLite(slug: string) {
  const { data: ipo, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('slug', slug)
    .neq('duplicate_status', 'merged')
    .single()

  if (error || !ipo) return null

  // Fetch facts from LITE table only
  const { data: factsData } = await supabase
    .from('ipo_facts_lite')
    .select('*')
    .eq('ipo_id', ipo.id)
    .eq('is_latest', true)

  const facts: Record<string, any> = {}
  if (factsData) {
    factsData.forEach(f => {
      facts[f.fact_key] = f.fact_value
    })
  }

  // Fetch GMP history (last 14 rows)
  const { data: gmpHistory } = await supabase
    .from('ipo_gmp_history')
    .select('*')
    .eq('ipo_id', ipo.id)
    .order('captured_at', { ascending: false })
    .limit(14)

  const latestGMP = gmpHistory && gmpHistory.length > 0 ? gmpHistory[0] : null
  const latestGmpValue = latestGMP ? latestGMP.gmp_value : null
  const latestGmpPercent = latestGMP ? latestGMP.gmp_pct : null

  // Fetch Subscription history (last 10 rows)
  const { data: subHistory } = await supabase
    .from('ipo_subscription_history')
    .select('*')
    .eq('ipo_id', ipo.id)
    .order('captured_at', { ascending: false })
    .limit(10)

  const latestSubscriptionRow = subHistory && subHistory.length > 0 ? subHistory[0] : null

  // ─── 1. Basic Fields ──────────────────────────────────────
  const priceBandLow = parseNumber(facts['price_band_low'] || ipo.price_band_low)
  const priceBandHigh = parseNumber(facts['price_band_high'] || ipo.price_band_high)
  const openDate = facts['open_date'] || ipo.open_date
  const closeDate = facts['close_date'] || ipo.close_date
  const allotmentDate = facts['allotment_date'] || ipo.allotment_date
  const listingDate = facts['listing_date'] || ipo.listing_date
  const issueSizeCr = parseNumber(facts['issue_size'] || ipo.issue_size_cr)
  const lotSize = parseNumber(facts['lot_size'] || ipo.lot_size)
  const exchange = facts['exchange'] || ipo.exchange
  const status = facts['status'] || ipo.status
  const registrarName = facts['registrar_name'] || ipo.registrar_name

  // ─── 2. Company Profile ───────────────────────────────────
  const companyProfile = {
    id: ipo.id,
    ipo_id: ipo.id,
    company_overview: facts['company_description'] || null,
    business_model: facts['business_model'] || null,
    sector: facts['sector'] || null,
    industry: facts['industry'] || null,
    headquarters: facts['headquarters'] || null,
    website: facts['website'] || null,
    promoters: facts['promoters'] || null,
    pre_issue_promoter_holding_pct: parseNumber(facts['pre_issue_promoter_holding_pct']),
    post_issue_promoter_holding_pct: parseNumber(facts['post_issue_promoter_holding_pct']),
    risk_factors: Array.isArray(facts['risks']) ? facts['risks'] : (typeof facts['risks'] === 'string' ? [facts['risks']] : []),
    updated_at: new Date().toISOString()
  }

  // ─── 3. Financials Parsing ────────────────────────────────
  const financialsYearly: any[] = []
  const financialTable = facts['financial_table']
  if (Array.isArray(financialTable) && financialTable.length > 0) {
    const keys = Object.keys(financialTable[0])
    const labelKey = keys[0]
    const periodKeys = keys.slice(1)

    const findRowValue = (keyword: string, periodKey: string) => {
      const row = financialTable.find(r => {
        const val = String(r[labelKey] || '').toLowerCase()
        return val.includes(keyword)
      })
      return row ? parseNumber(row[periodKey]) : null
    }

    for (const period of periodKeys) {
      const year = period.trim()
      const revenue = findRowValue('revenue', period) || findRowValue('sales', period)
      const pat = findRowValue('profit after tax', period) || findRowValue('pat', period) || findRowValue('profit/loss after tax', period)
      const assets = findRowValue('assets', period)
      const netWorth = findRowValue('net worth', period)
      const borrowings = findRowValue('borrowing', period) || findRowValue('debt', period)
      const roe = findRowValue('roe', period) || findRowValue('return on net worth', period)
      const roce = findRowValue('roce', period)

      if (revenue !== null || pat !== null || assets !== null) {
        financialsYearly.push({
          financial_year: year,
          revenue_cr: revenue,
          pat_cr: pat,
          pat_margin_pct: revenue && pat ? (pat / revenue) * 100 : null,
          roe_pct: roe,
          roce_pct: roce,
          net_worth_cr: netWorth,
          total_borrowings_cr: borrowings,
          created_at: new Date().toISOString()
        })
      }
    }
  }

  // ─── 4. Peer Comparison Parsing ──────────────────────────
  const peerComparisons: any[] = []
  let valuationPE: number | null = null
  let valuationEPS: number | null = null
  let valuationROE: number | null = null

  const peerTable = facts['peer_valuation_table']
  if (Array.isArray(peerTable) && peerTable.length > 0) {
    const keys = Object.keys(peerTable[0])
    const nameKey = keys.find(k => {
      const lower = k.toLowerCase()
      return lower.includes('company') || lower.includes('particulars') || lower.includes('name') || lower === 'col_0'
    }) || keys[0]

    const peKey = keys.find(k => k.toLowerCase().includes('p/e') || k.toLowerCase() === 'pe')
    const epsKey = keys.find(k => k.toLowerCase().includes('eps'))
    const roeKey = keys.find(k => k.toLowerCase().includes('roe') || k.toLowerCase().includes('ronw'))
    const cmpKey = keys.find(k => k.toLowerCase().includes('cmp') || k.toLowerCase().includes('price'))

    for (const row of peerTable) {
      const name = String(row[nameKey] || '').trim()
      if (!name) continue

      const pe = peKey ? parseNumber(row[peKey]) : null
      const eps = epsKey ? parseNumber(row[epsKey]) : null
      const roe = roeKey ? parseNumber(row[roeKey]) : null
      const cmp = cmpKey ? parseNumber(row[cmpKey]) : null

      const isTarget = normalizeForGrouping(name).includes(normalizeForGrouping(ipo.name)) ||
                       normalizeForGrouping(ipo.name).includes(normalizeForGrouping(name))

      if (isTarget) {
        valuationPE = pe
        valuationEPS = eps
        valuationROE = roe
      } else {
        peerComparisons.push({
          peer_name: name,
          pe_ratio: pe,
          cmp: cmp,
          roe_pct: roe,
          created_at: new Date().toISOString()
        })
      }
    }
  }

  // ─── 5. Objects of Issue ──────────────────────────────────
  const objectsOfIssue: any[] = []
  const objectsText = facts['objects_of_issue']
  if (typeof objectsText === 'string') {
    objectsOfIssue.push({
      object_name: objectsText,
      amount_cr: null,
      percentage: null,
      details: objectsText
    })
  }

  // ─── 6. Lead Managers & Market Makers ─────────────────────
  const leadManagers = []
  if (facts['lead_manager_name']) {
    const names = String(facts['lead_manager_name']).split(/,|and/g)
    for (const name of names) {
      const trimmed = name.trim()
      if (trimmed) {
        leadManagers.push({
          is_primary: leadManagers.length === 0,
          lead_manager: {
            name: trimmed,
            website: null,
            source: 'lite_facts'
          }
        })
      }
    }
  }

  const marketMakers = []
  if (facts['market_maker_name']) {
    marketMakers.push({
      market_maker: {
        name: facts['market_maker_name'],
        website: null
      }
    })
  }

  // ─── 7. Subscription Parsing ──────────────────────────────
  let qibX = 0, niiX = 0, retailX = 0, totalX = 0
  const subTable = facts['subscription_table']
  if (Array.isArray(subTable) && subTable.length > 0) {
    const keys = Object.keys(subTable[0])
    const catKey = keys.find(k => k.toLowerCase().includes('category') || k === 'col_0') || keys[0]
    const timesKey = keys.find(k => k.toLowerCase().includes('times') || k.toLowerCase().includes('subscription') || k.toLowerCase().includes('bid')) || keys[1]

    const findTimesValue = (keyword: string) => {
      const row = subTable.find(r => String(r[catKey] || '').toLowerCase().includes(keyword))
      return row ? parseNumber(row[timesKey]) : 0
    }

    qibX = findTimesValue('qib') || findTimesValue('qualified')
    niiX = findTimesValue('nii') || findTimesValue('non-institutional') || findTimesValue('non institutional')
    retailX = findTimesValue('retail') || findTimesValue('individual')
    totalX = findTimesValue('total')
  }

  const subscriptionHistory = subHistory ? subHistory.map(h => ({
    captured_at: h.captured_at,
    qib_x: h.qib_x,
    nii_x: h.nii_x,
    retail_x: h.retail_x,
    total_x: h.total_x
  })) : []

  const latestSubscription = latestSubscriptionRow ? {
    qib_x: latestSubscriptionRow.qib_x,
    nii_x: latestSubscriptionRow.nii_x,
    retail_x: latestSubscriptionRow.retail_x,
    total_x: latestSubscriptionRow.total_x,
    captured_at: latestSubscriptionRow.captured_at
  } : (totalX > 0 ? {
    qib_x: qibX,
    nii_x: niiX,
    retail_x: retailX,
    total_x: totalX,
    captured_at: new Date().toISOString()
  } : null)

  const latestPublicGMP = latestGmpValue !== null ? {
    source: 'lite_facts',
    confidence: 'high',
    source_url: '',
    gmp: latestGmpValue,
    gmp_percent: latestGmpPercent,
    issue_price: priceBandHigh
  } : null

  const latestPublicSubscription = latestSubscription ? {
    source: 'lite_facts',
    confidence: 'high',
    source_url: '',
    retail_times: latestSubscription.retail_x,
    total_times: latestSubscription.total_x,
    qib_times: latestSubscription.qib_x,
    nii_times: latestSubscription.nii_x
  } : null

  // ─── 8. Final Formatting ──────────────────────────────────
  return {
    ...ipo,
    price_band_low: priceBandLow,
    price_band_high: priceBandHigh,
    open_date: openDate,
    close_date: closeDate,
    allotment_date: allotmentDate,
    listing_date: listingDate,
    issue_size_cr: issueSizeCr,
    lot_size: lotSize,
    exchange,
    status,
    registrar_name: registrarName,
    drhp_url: facts['drhp_url'] || null,
    rhp_url: facts['rhp_url'] || null,
    prospectus_url: facts['prospectus_url'] || null,

    company_profile: companyProfile,
    financials_yearly: financialsYearly,
    peer_comparisons: peerComparisons,
    valuation_metrics: {
      pe_ratio: valuationPE,
      eps: valuationEPS,
      roe_pct: valuationROE,
      roce_pct: null,
      pat_margin_pct: null,
      industry_pe: null,
      peer_median_pe: peerComparisons.length > 0 ? (peerComparisons[0].pe_ratio || null) : null
    },

    latest_subscription: latestSubscription,
    subscription_data: subscriptionHistory,
    gmp_history: gmpHistory || [],

    latest_gmp: latestGmpValue,
    latest_gmp_percent: latestGmpPercent,
    latest_public_gmp_snapshot: latestPublicGMP,
    latest_public_subscription_snapshot: latestPublicSubscription,

    lead_managers: leadManagers,
    lead_manager_scores: [],
    lead_manager_history: [],
    market_makers: marketMakers,
    objects_of_issue: objectsOfIssue,

    // Safety
    hasMissingData: !facts['company_description'] || !facts['financial_table']
  }
}
