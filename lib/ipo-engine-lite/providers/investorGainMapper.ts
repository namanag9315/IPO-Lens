import { FactCandidate, MapperInput, MapperOutput } from './types'

export function investorGainMapper(input: MapperInput): MapperOutput {
  const { tables } = input
  const facts: FactCandidate[] = []
  const warnings: string[] = []

  for (const table of tables) {
    const heading = table.nearbyHeading.toLowerCase()

    // Sometimes InvestorGain has a subscription or generic table
    if (heading.includes('subscription')) {
      facts.push({
        factKey: 'subscription_table',
        factValue: table.rows,
        displayValue: `Subscription table with ${table.rows.length} rows`,
        confidence: 'medium',
        sourceEvidence: `Table near: ${table.nearbyHeading}`
      })
    }
  }

  if (facts.length === 0) warnings.push('No relevant detail tables found in InvestorGain.')

  return { facts, warnings, debug: {} }
}
