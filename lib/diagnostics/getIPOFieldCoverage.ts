import { SupabaseClient } from '@supabase/supabase-js';

export interface IPOFieldCoverageResult {
  key: string;
  field: string;
  status: 'filled' | 'partial' | 'inferred' | 'missing';
  rootCause?: string;
  recommendedAction?: string;
}

export async function getIPOFieldCoverageDetailed(
  supabase: SupabaseClient,
  ipoId: string
): Promise<IPOFieldCoverageResult[]> {
  const coverage: Record<string, IPOFieldCoverageResult> = {
    companyProfile: { key: 'companyProfile', field: 'Company Profile', status: 'missing' },
    sector: { key: 'sector', field: 'Sector', status: 'missing' },
    subscriptionTable: { key: 'subscriptionTable', field: 'Subscription Table', status: 'missing' },
    applicationBreakup: { key: 'applicationBreakup', field: 'Application Breakup', status: 'missing' },
    lotDistribution: { key: 'lotDistribution', field: 'Lot Distribution', status: 'missing' },
    reservation: { key: 'reservation', field: 'Reservation', status: 'missing' },
    ipoDetails: { key: 'ipoDetails', field: 'IPO Details', status: 'missing' },
    kpis: { key: 'kpis', field: 'KPIs', status: 'missing' },
    financials: { key: 'financials', field: 'Financials', status: 'missing' },
    peers: { key: 'peers', field: 'Peers', status: 'missing' },
    strengthsRisks: { key: 'strengthsRisks', field: 'Strengths & Risks', status: 'missing' },
    leadManager: { key: 'leadManager', field: 'Lead Manager', status: 'missing' },
    registrar: { key: 'registrar', field: 'Registrar', status: 'missing' },
    marketMaker: { key: 'marketMaker', field: 'Market Maker', status: 'missing' },
    objectsOfIssue: { key: 'objectsOfIssue', field: 'Objects of Issue', status: 'missing' },
  };

  try {
    const { data: ipo } = await supabase.from('ipos').select('*').eq('id', ipoId).maybeSingle();
    const { data: sources } = await supabase.from('ipo_source_documents').select('*').eq('ipo_id', ipoId);

    const hasPremiumSource = sources?.some(s => s.provider === "IPO Premium" || s.source_name === "IPO Premium");

    function setMissingReason(key: string) {
      if (coverage[key].status !== 'missing') return;
      if (!hasPremiumSource) {
        coverage[key].rootCause = "no_supported_detail_source";
        coverage[key].recommendedAction = "Add IPO Premium detail URL and run Full IPO Detail Import.";
      } else {
        coverage[key].rootCause = "detail_import_not_run";
        coverage[key].recommendedAction = "Run Full IPO Detail Import using IPO Premium URL.";
      }
    }

    if (ipo) {
      if (ipo.registrar_name) coverage.registrar.status = 'filled';
      if (ipo.market_maker_name) coverage.marketMaker.status = 'filled';

      const detailsCount = [ipo.issue_size_cr, ipo.fresh_issue_amount, ipo.ofs_amount, ipo.face_value, ipo.issue_type, ipo.exchange, ipo.pre_issue_shares, ipo.post_issue_shares].filter(Boolean).length;
      if (detailsCount >= 6) coverage.ipoDetails.status = 'filled';
      else if (detailsCount > 0) coverage.ipoDetails.status = 'partial';
      if (ipo.sector) coverage.sector.status = 'filled';
      if (ipo.lead_manager_name) coverage.leadManager.status = 'filled';
    }

    const checks = [
      { table: 'ipo_company_profiles', fn: (d: any) => { if (d.description) coverage.companyProfile.status = 'filled'; if (d.sector_suggestion && coverage.sector.status === 'missing') coverage.sector.status = 'inferred'; } },
      { table: 'ipo_subscription_snapshots', count: true, set: () => coverage.subscriptionTable.status = 'filled' },
      { table: 'ipo_application_breakup', count: true, set: () => coverage.applicationBreakup.status = 'filled' },
      { table: 'ipo_lot_distribution', count: true, set: () => coverage.lotDistribution.status = 'filled' },
      { table: 'ipo_reservations', count: true, set: () => coverage.reservation.status = 'filled' },
      { table: 'ipo_kpis', count: true, set: () => coverage.kpis.status = 'filled' },
      { table: 'ipo_financials_yearly', count: true, set: () => coverage.financials.status = 'filled' },
      { table: 'ipo_peer_comparisons', count: true, set: () => coverage.peers.status = 'filled' },
      { table: 'ipo_strengths', count: true, set: () => coverage.strengthsRisks.status = 'filled' },
      { table: 'ipo_lead_managers', count: true, set: () => coverage.leadManager.status = 'filled' },
      { table: 'ipo_market_makers', count: true, set: () => coverage.marketMaker.status = 'filled' },
      { table: 'ipo_objects_of_issue', count: true, set: () => coverage.objectsOfIssue.status = 'filled' },
    ];

    for (const check of checks) {
      if (check.count) {
        const { count } = await supabase.from(check.table).select('*', { count: 'exact', head: true }).eq('ipo_id', ipoId);
        if (count && count > 0) check.set();
      } else {
        const { data } = await supabase.from(check.table).select('*').eq('ipo_id', ipoId).maybeSingle();
        if (data) check.fn(data);
      }
    }

    Object.keys(coverage).forEach(k => setMissingReason(k));

  } catch (error) {
    console.error('Error fetching detailed field coverage:', error);
  }

  return Object.values(coverage);
}

export async function getIPOFieldCoverage(
  supabase: SupabaseClient,
  ipoId: string
): Promise<Record<string, string>> {
  const detailed = await getIPOFieldCoverageDetailed(supabase, ipoId);
  const result: Record<string, string> = {};
  detailed.forEach(d => {
    result[d.key] = d.status;
  });
  return result;
}
