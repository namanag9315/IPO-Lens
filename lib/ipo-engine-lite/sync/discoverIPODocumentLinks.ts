import { fetchHTML } from '@/lib/http/fetchHTML'
import { normalizeIPONameLite } from '@/lib/ipo-engine-lite/normalizeIPONameLite'

export async function discoverIPODocumentLinks(name: string, slug: string, category?: string) {
  let drhpUrl: string | null = null
  let rhpUrl: string | null = null
  let prospectusUrl: string | null = null

  try {
    const isSME = category?.toLowerCase() === 'sme' || slug.includes('sme')
    const listUrl = isSME
      ? 'https://www.chittorgarh.com/report/sme-ipo-list-in-india-bse-sme-nse-emerge/84/'
      : 'https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/'

    const listRes = await fetchHTML(listUrl)
    let detailUrl: string | null = null

    if (listRes.$ && !listRes.error) {
      const targetNorm = normalizeIPONameLite(name)
      listRes.$("a[href*='/ipo/']").each((_, anchor) => {
        if (detailUrl) return // Match already found

        const href = listRes.$(anchor).attr('href') || ''
        const text = listRes.$(anchor).text().trim()
        const normText = normalizeIPONameLite(text)

        // Check if names match (exact or substring)
        if (normText && targetNorm && (normText === targetNorm || normText.includes(targetNorm) || targetNorm.includes(normText))) {
          detailUrl = href.startsWith('http') ? href : `https://www.chittorgarh.com${href.startsWith('/') ? '' : '/'}${href}`
        }
      })
    }

    // 2. If not found in primary list, try the dashboard as fallback
    if (!detailUrl) {
      const dashRes = await fetchHTML('https://www.chittorgarh.com/ipo/ipo_dashboard.asp')
      if (dashRes.$ && !dashRes.error) {
        const targetNorm = normalizeIPONameLite(name)
        dashRes.$("a[href*='/ipo/']").each((_, anchor) => {
          if (detailUrl) return

          const href = dashRes.$(anchor).attr('href') || ''
          const text = dashRes.$(anchor).text().trim()
          const normText = normalizeIPONameLite(text)

          if (normText && targetNorm && (normText === targetNorm || normText.includes(targetNorm) || targetNorm.includes(normText))) {
            detailUrl = href.startsWith('http') ? href : `https://www.chittorgarh.com${href.startsWith('/') ? '' : '/'}${href}`
          }
        })
      }
    }

    // 3. Fallback to direct URL guess if lists didn't yield anything
    if (!detailUrl) {
      detailUrl = `https://www.chittorgarh.com/ipo/${slug}/`
    }

    // 4. Fetch the detail page and scrape links
    console.log(`Fetching Chittorgarh detail page: ${detailUrl}`)
    const detailRes = await fetchHTML(detailUrl)
    if (detailRes.$ && !detailRes.error) {
      const $ = detailRes.$
      $('a').each((_, a) => {
        const href = $(a).attr('href') || ''
        const text = $(a).text().trim()
        const lowerText = text.toLowerCase()
        const lowerHref = href.toLowerCase()

        const isPDF = lowerHref.endsWith('.pdf') || lowerHref.includes('.pdf') || lowerHref.includes('/pdf/') || lowerHref.includes('_pdf/')
        const isGenericReport = lowerHref.includes('/report/ipo_prospectus') || lowerHref.includes('/report/sme_ipo_prospectus')
        const isDocumentText = lowerText.includes('rhp') || lowerText.includes('drhp') || lowerText.includes('prospectus')
        const isDocumentHref = lowerHref.includes('rhp') || lowerHref.includes('drhp') || lowerHref.includes('prospectus')

        if (isPDF && !isGenericReport && (isDocumentText || isDocumentHref)) {
          const absoluteUrl = href.startsWith('http') ? href : `https://www.chittorgarh.com${href.startsWith('/') ? '' : '/'}${href}`

          if (lowerText.includes('drhp') || lowerHref.includes('drhp')) {
            if (!drhpUrl) drhpUrl = absoluteUrl
          } else if (lowerText.includes('rhp') || lowerHref.includes('rhp')) {
            if (!rhpUrl) rhpUrl = absoluteUrl
          } else if (lowerText.includes('prospectus') || lowerHref.includes('prospectus')) {
            if (!prospectusUrl) prospectusUrl = absoluteUrl
          }
        }
      })
    }
  } catch (err) {
    console.error('Error discovering document links:', err)
  }

  return { drhpUrl, rhpUrl, prospectusUrl }
}
