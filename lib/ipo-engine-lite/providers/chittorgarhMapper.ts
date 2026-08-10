import { FactCandidate, MapperInput, MapperOutput } from './types'

export function chittorgarhMapper(input: MapperInput): MapperOutput {
  const { html, text, tables } = input
  const facts: FactCandidate[] = []
  const warnings: string[] = []

  if (!text) {
    return { facts, warnings: ['No text provided to Chittorgarh mapper'], debug: {} }
  }

  // 1. Company Description
  // Usually starts with "Incorporated in", "Founded in"
  const descMatch = text.match(/(?:Incorporated|Founded|Established) in \d{4},? [A-Za-z0-9\s,&.-]+(?:manufactures|provides|is a|engaged in|offers).+?(?=\n\n|\r\n\r\n|$)/is)
  if (descMatch && descMatch[0].length > 80) {
    facts.push({
      factKey: 'company_description',
      factValue: descMatch[0].trim(),
      displayValue: descMatch[0].trim(),
      confidence: 'high',
      sourceEvidence: 'Matched standard incorporation paragraph'
    })
  } else {
    warnings.push('Could not find company description paragraph.')
  }

  // 2. Objects of the Issue
  // Usually follows "The company intends to utilize the net proceeds" or "Objects of the Issue:"
  const objectsMatch = text.match(/Objects of the Issue:?\s*([\s\S]+?)(?=\n\n|\r\n\r\n|Company Financials|Peer Group)/i)
  if (objectsMatch && objectsMatch[1].trim().length > 30) {
    facts.push({
      factKey: 'objects_of_issue',
      factValue: objectsMatch[1].trim(),
      displayValue: objectsMatch[1].trim(),
      confidence: 'medium',
      sourceEvidence: 'Matched Objects of the Issue section'
    })
  }

  // 3. Scan Tables for Financials, Peers, Details
  for (const table of tables) {
    const heading = table.nearbyHeading.toLowerCase()
    const headers = table.headers.map(h => h.toLowerCase())

    // Financials
    if (heading.includes('financial') || headers.some(h => h.includes('assets') || h.includes('revenue') || h.includes('pat'))) {
      facts.push({
        factKey: 'financial_table',
        factValue: table.rows,
        displayValue: `Financial table with ${table.rows.length} rows`,
        confidence: 'high',
        sourceEvidence: `Table near: ${table.nearbyHeading}`
      })
    }

    // Peer Comparison
    else if (heading.includes('peer') || headers.some(h => h.includes('p/e') || h.includes('eps'))) {
      facts.push({
        factKey: 'peer_valuation_table',
        factValue: table.rows,
        displayValue: `Peer table with ${table.rows.length} rows`,
        confidence: 'high',
        sourceEvidence: `Table near: ${table.nearbyHeading}`
      })
    }

    // IPO Details (Extracts lot size, registrar, etc.)
    else if (heading.includes('details') || headers.some(h => h.includes('date') || h.includes('face value'))) {
      facts.push({
        factKey: 'ipo_details_table',
        factValue: table.rows,
        displayValue: `Details table with ${table.rows.length} rows`,
        confidence: 'medium',
        sourceEvidence: `Table near: ${table.nearbyHeading}`
      })

      // Attempt to extract specific fields from this key-value table
      for (const row of table.rows) {
        // Typically a 2-column table
        const values = Object.values(row)
        if (values.length >= 2) {
          const k = values[0].toLowerCase()
          const v = values[1]

          if (k.includes('registrar') && v.length > 3) {
            facts.push({ factKey: 'registrar_name', factValue: v, displayValue: v, confidence: 'high', sourceEvidence: 'IPO Details Table' })
          } else if (k.includes('lead manager') || k.includes('merchant banker')) {
            facts.push({ factKey: 'lead_manager_name', factValue: v, displayValue: v, confidence: 'high', sourceEvidence: 'IPO Details Table' })
          } else if (k.includes('market maker')) {
            facts.push({ factKey: 'market_maker_name', factValue: v, displayValue: v, confidence: 'high', sourceEvidence: 'IPO Details Table' })
          }
        }
      }
    }
  }

  return { facts, warnings, debug: { tablesProcessed: tables.length } }
}
