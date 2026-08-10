import { fetchHTML } from '../http/fetchHTML'

export async function scrapeInvestorGainGMP() {
  const url = 'https://www.investorgain.com/report/live-ipo-gmp/331/'
  const { $, error, blocked } = await fetchHTML(url)

  if (blocked) return { error: 'Blocked by CAPTCHA', url, results: [] }
  if (error || !$) return { error, url, results: [] }

  const results: any[] = []

  // InvestorGain GMP table has specific columns
  $('table tbody tr').each((_, row) => {
    const cols = $(row).find('td')
    if (cols.length >= 5) {
      // Column index usually: 1 is Name, 2 is Price, 3 is GMP, 4 is Est Listing
      const name = cols.eq(0).text().trim() || cols.eq(1).text().trim()
      // The exact column might vary, but typically name is in td with <a> tag
      const link = $(row).find('td a').first()
      const ipoName = link.text().trim()

      const gmpText = $(row).find('td').filter((_, td) => $(td).text().includes('₹')).first().text()
      const pctMatch = $(row).text().match(/(\d+\.\d+)%/)
      const pct = pctMatch ? parseFloat(pctMatch[1]) : null

      // Let's do a more robust extraction based on InvestorGain's standard table structure:
      // IPO Name | Price | GMP(₹) | Est Listing | IPO Size | Lot | Open | Close | BoA | Listing | GMP Updated
      const rowText = $(row).text()

      let gmpVal = null
      let estListing = null

      // Try extracting ₹ value
      const rsVals = $(row).find('td').map((_, td) => $(td).text().trim()).get()

      // Usually Name is index 0/1. Let's find the GMP column by looking for ₹ or just parsing standard structure.
      // Often, cols:
      // 0: IPO Name
      // 1: Price
      // 2: GMP
      // 3: Est Listing
      const nameCol = $(row).find('td[data-label="IPO Name"] a').text().trim() || ipoName
      const gmpCol = $(row).find('td[data-label="GMP(₹)"]').text().trim() || cols.eq(2).text().trim()
      const estCol = $(row).find('td[data-label="Est Listing"]').text().trim() || cols.eq(3).text().trim()

      const gmpNumMatch = gmpCol.replace(/[^0-9.-]/g, '')
      if (gmpNumMatch && gmpNumMatch !== '-' && gmpNumMatch !== '') {
        gmpVal = parseInt(gmpNumMatch, 10)
      }

      const estNumMatch = estCol.replace(/[^0-9.-]/g, '')
      if (estNumMatch && estNumMatch !== '-' && estNumMatch !== '') {
        estListing = parseInt(estNumMatch, 10)
      }

      if (nameCol && gmpVal !== null) {
        results.push({
          ipoName: nameCol,
          gmp_value: gmpVal,
          gmp_pct: pct,
          est_listing: estListing
        })
      }
    }
  })

  return { results, url }
}
