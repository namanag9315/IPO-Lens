import { fetchHTML } from '@/lib/http/fetchHTML'

function cleanCell(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function parseGMP(value: string) {
  const match = value.replace(/,/g, '').match(/-?\d+/)
  return match ? Number(match[0]) : null
}

function headerIndex(headers: string[], pattern: RegExp) {
  const index = headers.findIndex(header => pattern.test(header))
  return index >= 0 ? index : null
}

export async function scrapeInvestorGainGMP() {
  const url = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/'
  const { $, error, blocked } = await fetchHTML(url)

  if (blocked || error || !$) {
    console.log(`IPOWatch GMP fetch skipped. Blocked: ${blocked}, Error: ${error}`)
    return []
  }

  const rows: { rawName: string; gmpValue: number; estListing: number | null; sourceUrl: string }[] = []

  $('table').first().each((_, table) => {
    $(table)
      .find('tr')
      .slice(1) // skip headers
      .each((_, row) => {
        const cells = $(row)
          .find('td')
          .map((_, cell) => cleanCell($(cell).text()))
          .get()

        if (cells.length < 5) return

        const name = cells[0]?.replace(/\s+IPO$/i, '').trim()
        const gmpRaw = cells[1]?.replace(/[^0-9.-]/g, '')
        const estRaw = cells[4]?.split('(')[0]?.replace(/[^0-9.-]/g, '')

        const gmp = gmpRaw ? parseInt(gmpRaw, 10) : 0
        const estListing = estRaw ? parseInt(estRaw, 10) : null

        if (!name || isNaN(gmp)) return

        rows.push({
          rawName: name,
          gmpValue: gmp,
          estListing: estListing,
          sourceUrl: url
        })
      })
  })

  return rows
}

export async function scrapeIPOWatchSubscription() {
  const url = 'https://ipowatch.in/ipo-subscription-status-today/'
  const { $, error, blocked } = await fetchHTML(url, { delayMs: 1500 })

  if (blocked || error || !$) {
    console.log(`IPOWatch subscription fetch skipped. Blocked: ${blocked}, Error: ${error}`)
    return []
  }

  const results: { rawName: string; qib: number; nii: number; retail: number; total: number; sourceUrl: string }[] = []

  $('table tbody tr').each((_, row) => {
    const cols = $(row).find('td')
    if (cols.length >= 8) {
      const name = cleanCell(cols.eq(0).text()).replace(/\s+IPO$/i, '').trim()

      const qibMatch = cols.eq(4).text().replace(/[^0-9.-]/g, '')
      const niiMatch = cols.eq(5).text().replace(/[^0-9.-]/g, '')
      const retMatch = cols.eq(6).text().replace(/[^0-9.-]/g, '')
      const totMatch = cols.eq(7).text().replace(/[^0-9.-]/g, '')

      const qib = qibMatch ? parseFloat(qibMatch) : 0
      const nii = niiMatch ? parseFloat(niiMatch) : 0
      const retail = retMatch ? parseFloat(retMatch) : 0
      const total = totMatch ? parseFloat(totMatch) : 0

      if (name && !isNaN(total) && total > 0) {
        results.push({
          rawName: name,
          qib: isNaN(qib) ? 0 : qib,
          nii: isNaN(nii) ? 0 : nii,
          retail: isNaN(retail) ? 0 : retail,
          total: isNaN(total) ? 0 : total,
          sourceUrl: url
        })
      }
    }
  })

  return results
}
