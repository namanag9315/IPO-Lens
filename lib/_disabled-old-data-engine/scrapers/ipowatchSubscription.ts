import { fetchHTML } from '../http/fetchHTML'

export async function scrapeIPOWatchSubscription() {
  const url = 'https://ipowatch.in/ipo-subscription-status-live/'
  const { $, error, blocked } = await fetchHTML(url, { delayMs: 2500 })

  if (blocked) return { error: 'Blocked by CAPTCHA', url, results: [] }
  if (error || !$) return { error, url, results: [] }

  const results: any[] = []

  $('table tbody tr').each((_, row) => {
    const cols = $(row).find('td')
    if (cols.length >= 5) {
      const name = cols.eq(0).text().trim()

      const qibMatch = cols.eq(1).text().replace(/[^0-9.-]/g, '')
      const niiMatch = cols.eq(2).text().replace(/[^0-9.-]/g, '')
      const retMatch = cols.eq(3).text().replace(/[^0-9.-]/g, '')
      const totMatch = cols.eq(4).text().replace(/[^0-9.-]/g, '')

      const qib = qibMatch ? parseFloat(qibMatch) : 0
      const nii = niiMatch ? parseFloat(niiMatch) : 0
      const retail = retMatch ? parseFloat(retMatch) : 0
      const total = totMatch ? parseFloat(totMatch) : 0

      if (name && total > 0) {
        results.push({
          ipoName: name,
          qib_x: isNaN(qib) ? 0 : qib,
          nii_x: isNaN(nii) ? 0 : nii,
          retail_x: isNaN(retail) ? 0 : retail,
          total_x: isNaN(total) ? 0 : total
        })
      }
    }
  })

  return { results, url }
}
