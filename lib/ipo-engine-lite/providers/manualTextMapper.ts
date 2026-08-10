import { FactCandidate, MapperInput, MapperOutput } from './types'

export function manualTextMapper(input: MapperInput): MapperOutput {
  const { html, text, tables } = input
  const facts: FactCandidate[] = []
  const warnings: string[] = []

  // Since it's manual text/html from admin (e.g. IPO Premium), we just extract tables and guess based on headers
  for (const table of tables) {
    const heading = table.nearbyHeading.toLowerCase()
    const headers = table.headers.map(h => h.toLowerCase())

    if (heading.includes('financial') || headers.some(h => h.includes('revenue'))) {
      facts.push({ factKey: 'financial_table', factValue: table.rows, displayValue: `Financials (${table.rows.length} rows)`, confidence: 'medium', sourceEvidence: 'Manual HTML' })
    } else if (heading.includes('peer') || headers.some(h => h.includes('p/e'))) {
      facts.push({ factKey: 'peer_valuation_table', factValue: table.rows, displayValue: `Peers (${table.rows.length} rows)`, confidence: 'medium', sourceEvidence: 'Manual HTML' })
    } else if (heading.includes('subscription')) {
      facts.push({ factKey: 'subscription_table', factValue: table.rows, displayValue: `Subscription (${table.rows.length} rows)`, confidence: 'medium', sourceEvidence: 'Manual HTML' })
    } else {
      // Dump generic details table candidate
      facts.push({ factKey: 'ipo_details_table', factValue: table.rows, displayValue: `Generic Table (${table.rows.length} rows)`, confidence: 'low', sourceEvidence: 'Manual HTML' })
    }
  }

  // Basic paragraph matching for desc
  if (text) {
    const descMatch = text.match(/(?:Incorporated|Founded|Established) in \d{4},? [A-Za-z0-9\s,&.-]+(?:manufactures|provides|is a|engaged in|offers).+?(?=\n\n|\r\n\r\n|$)/is)
    if (descMatch) {
       facts.push({ factKey: 'company_description', factValue: descMatch[0].trim(), displayValue: 'Extracted company description', confidence: 'medium', sourceEvidence: 'Manual text parsing' })
    }
  }

  return { facts, warnings, debug: {} }
}
