import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { fetchHTML } from '../lib/http/fetchHTML'

async function debugDiscovery() {
  const url = 'https://ipowatch.in/ipo-subscription-status-today/'
  console.log(`Fetching IPOWatch GMP page: ${url}`)
  const res = await fetchHTML(url)
  if (res.$ && !res.error) {
    console.log(`Successfully fetched. Tables found: ${res.$('table').length}`)
    res.$('table').each((tableIdx, table) => {
      const headers = res.$(table)
        .find('tr')
        .first()
        .find('th,td')
        .map((_, cell) => res.$(cell).text().trim())
        .get()
      console.log(`Table #${tableIdx} headers:`, headers)
      console.log(`Table #${tableIdx} row count: ${res.$(table).find('tr').length}`)

      // Print first 10 rows
      res.$(table).find('tr').slice(1, 11).each((rowIdx, row) => {
        const cells = res.$(row).find('td').map((_, cell) => res.$(cell).text().trim()).get()
        console.log(`  Row #${rowIdx}:`, cells)
      })
    })
  } else {
    console.log(`Error fetching page: ${res.error}`)
  }
}

debugDiscovery()
