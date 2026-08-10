import { ExtractedTable } from '../extractTablesAndText'

export type FactConfidence = 'high' | 'medium' | 'low'

export interface FactCandidate {
  factKey: string
  factValue: any
  displayValue: string
  confidence: FactConfidence
  sourceEvidence: string
}

export interface MapperInput {
  ipoName: string
  sourceUrl?: string
  html?: string
  text?: string
  tables: ExtractedTable[]
}

export interface MapperOutput {
  facts: FactCandidate[]
  warnings: string[]
  debug: any
}

export const ALLOWED_FACT_KEYS = [
  'company_description',
  'sector',
  'products_services',
  'customers',
  'lead_manager_name',
  'registrar_name',
  'market_maker_name',
  'ipo_details_table',
  'financial_table',
  'peer_valuation_table',
  'strengths',
  'risks',
  'objects_of_issue',
  'subscription_table',
  'price_band',
  'issue_size',
  'lot_size',
  'listing_exchange',
  'open_date',
  'close_date',
  'listing_date',
  'drhp_url',
  'rhp_url',
  'prospectus_url'
]
