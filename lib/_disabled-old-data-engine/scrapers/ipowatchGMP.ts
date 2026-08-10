import { fetchHTML } from '../http/fetchHTML'

export async function scrapeIPOWatchGMP() {
  const url = 'https://ipowatch.in/ipo-grey-market-premium-latest-live-ipo-gmp/'
  // IPOWatch is more aggressive with blocks, so higher delay internally if retrying,
  // but fetchHTML handles retries. We pass longer delay.
  const { $, error, blocked } = await fetchHTML(url, { delayMs: 2500 })

  if (blocked) return { error: 'Blocked by CAPTCHA', url, results: [] }
  if (error || !$) return { error, url, results: [] }

  const results: any[] = []

  $('table tbody tr').each((_, row) => {
    const cols = $(row).find('td')
    if (cols.length >= 4) {
      const name = cols.eq(0).text().trim()
      const priceStr = cols.eq(1).text().trim()
      const gmpStr = cols.eq(2).text().trim()
      const estStr = cols.eq(3).text().trim()

      let gmpVal = null
      const gmpMatch = gmpStr.replace(/[^0-9.-]/g, '')
      if (gmpMatch && gmpMatch !== '-' && gmpMatch !== '') {
        gmpVal = parseInt(gmpMatch, 10)
      }

      let estListing = null
      const estMatch = estStr.replace(/[^0-9.-]/g, '')
      if (estMatch && estMatch !== '-' && estMatch !== '') {
        estListing = parseInt(estMatch, 10)
      }

      let pct = null
      const priceMatch = priceStr.replace(/[^0-9.-]/g, '')
      if (priceMatch && priceMatch !== '-' && priceMatch !== '' && gmpVal !== null) {
        const price = parseFloat(priceMatch)
        if (price > 0) {
          pct = parseFloat(((gmpVal / price) * 100).toFixed(2))
        }
      }

      if (name && gmpVal !== null) {
        results.push({
          ipoName: name,
          gmp_value: gmpVal,
          gmp_pct: pct,
          est_listing: estListing
        })
      }
    }
  })

  return { results, url }
}
