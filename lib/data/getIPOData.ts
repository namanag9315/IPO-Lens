import { supabaseAdmin as supabase } from '@/lib/supabase'

export interface IPOListFilters {
  board?: 'mainboard' | 'sme'
  status?: string[]
}

export async function getIPOList(filters?: IPOListFilters) {
  let query = supabase
    .from('ipos')
    .select(`
      *,
      ipo_gmp_history(gmp_value, gmp_pct, captured_at),
      ipo_subscription_history(total_x, captured_at),
      ipo_facts(fact_key, parsed_value, raw_value, is_latest)
    `)
    .or('is_duplicate.is.null,is_duplicate.eq.false')

  if (filters?.board) {
    query = query.eq('board', filters.board)
  }
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  const { data, error } = await query.order('close_date', { ascending: true })

  if (error) throw new Error(error.message)

  // Post-process to extract latest GMP/Sub and facts
  return data.map((ipo: any) => {
    // Sort histories descending by captured_at
    const gmpHistory = ipo.ipo_gmp_history?.sort((a:any, b:any) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()) || []
    const subHistory = ipo.ipo_subscription_history?.sort((a:any, b:any) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()) || []

    const latestGMP = gmpHistory.length > 0 ? gmpHistory[0] : null
    const latestSub = subHistory.length > 0 ? subHistory[0] : null

    const facts: Record<string, string> = {}
    if (ipo.ipo_facts) {
      ipo.ipo_facts.filter((f: any) => f.is_latest).forEach((f: any) => {
        facts[f.fact_key] = f.parsed_value || f.raw_value
      })
    }

    return {
      ...ipo,
      ipo_gmp_history: undefined,
      ipo_subscription_history: undefined,
      ipo_facts: undefined,
      latestGMP,
      latestSubscription: latestSub,
      facts
    }
  })
}

export async function getIPOBySlug(slug: string) {
  const { data: ipo, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('slug', slug)
    .or('is_duplicate.is.null,is_duplicate.eq.false')
    .single()

  if (error || !ipo) return null

  // Fetch facts
  const { data: factsData } = await supabase
    .from('ipo_facts')
    .select('*')
    .eq('ipo_id', ipo.id)
    .eq('is_latest', true)

  const facts: Record<string, string> = {}
  if (factsData) {
    factsData.forEach((f: any) => {
      facts[f.fact_key] = f.parsed_value || f.raw_value
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

  // Fetch Subscription history (last 10 rows)
  const { data: subHistory } = await supabase
    .from('ipo_subscription_history')
    .select('*')
    .eq('ipo_id', ipo.id)
    .order('captured_at', { ascending: false })
    .limit(10)

  const latestSubscription = subHistory && subHistory.length > 0 ? subHistory[0] : null

  // Derived
  const minInvestment = (ipo.lot_size && ipo.price_band_high) ? (ipo.lot_size * ipo.price_band_high) : null
  const allotmentChancePct = (latestSubscription && latestSubscription.retail_x > 0) ? Math.min(100, 100 / latestSubscription.retail_x) : null

  return {
    ...ipo,
    facts,
    latestGMP: latestGMP ? {
      value: latestGMP.gmp_value,
      pct: latestGMP.gmp_pct,
      estListing: latestGMP.est_listing,
      source: latestGMP.source_provider
    } : null,
    gmpTrend: gmpHistory || [],
    latestSubscription: latestSubscription ? {
      qib: latestSubscription.qib_x,
      nii: latestSubscription.nii_x,
      retail: latestSubscription.retail_x,
      total: latestSubscription.total_x
    } : null,
    subscriptionTrend: subHistory || [],
    minInvestment,
    allotmentChancePct
  }
}
