import { FactCandidate, MapperInput, MapperOutput } from './types'

export function ipoWatchMapper(input: MapperInput): MapperOutput {
  const { html, text, tables } = input
  const facts: FactCandidate[] = []
  const warnings: string[] = []

  // IPOWatch usually has a subscription table
  for (const table of tables) {
    const heading = table.nearbyHeading.toLowerCase()
    const headers = table.headers.map(h => h.toLowerCase())

    if (heading.includes('subscription') || headers.some(h => h.includes('qib') || h.includes('retail'))) {
      facts.push({
        factKey: 'subscription_table',
        factValue: table.rows,
        displayValue: `Subscription table with ${table.rows.length} rows`,
        confidence: 'high',
        sourceEvidence: `Table near: ${table.nearbyHeading}`
      })
    }

    // Sometimes Financials
    else if (heading.includes('financial') || headers.some(h => h.includes('assets') || h.includes('revenue') || h.includes('pat'))) {
      facts.push({
        factKey: 'financial_table',
        factValue: table.rows,
        displayValue: `Financial table with ${table.rows.length} rows`,
        confidence: 'medium',
        sourceEvidence: `Table near: ${table.nearbyHeading}`
      })
    }
  }

  if (facts.length === 0) warnings.push('No relevant tables found in IPOWatch.')

  return { facts, warnings, debug: { tablesProcessed: tables.length } }
}
