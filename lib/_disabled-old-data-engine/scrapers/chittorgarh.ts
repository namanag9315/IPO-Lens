import { fetchHTML } from '../http/fetchHTML'
import { generateSlug } from '../utils/normalizeIPOName'

let lastRequestTime = 0

async function rateLimit() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < 1500) {
    await new Promise(r => setTimeout(r, 1500 - elapsed))
  }
  lastRequestTime = Date.now()
}

function parseNumber(str: string): number | null {
  if (!str) return null
  const cleaned = str.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const val = parseFloat(cleaned)
  return isNaN(val) ? null : val
}

export async function scrapeChittorgarhIPOList() {
  await rateLimit()
  const { $, error } = await fetchHTML('https://www.chittorgarh.com/report/ipo-allotment-status/78/')
  if (error || !$) return []

  const ipos: any[] = []
  $('table.table tbody tr').each((_, row) => {
    const cols = $(row).find('td')
    if (cols.length >= 5) {
      const link = cols.eq(0).find('a')
      const name = link.text().trim()
      const href = link.attr('href') || ''

      if (name) {
        ipos.push({
          name,
          slug: generateSlug(name),
          chittorgarh_url: href,
          board: href.includes('sme-ipo') || name.toLowerCase().includes('sme') ? 'sme' : 'mainboard'
        })
      }
    }
  })

  // Also fetch upcoming
  await rateLimit()
  const upcomingRes = await fetchHTML('https://www.chittorgarh.com/report/upcoming-ipo-2026/82/')
  if (upcomingRes.$ && !upcomingRes.error) {
    upcomingRes.$('table.table tbody tr').each((_, row) => {
      const cols = upcomingRes.$(row).find('td')
      if (cols.length >= 5) {
        const link = cols.eq(0).find('a')
        const name = link.text().trim()
        const href = link.attr('href') || ''
        if (name && !ipos.find(i => i.name === name)) {
          ipos.push({
            name,
            slug: generateSlug(name),
            chittorgarh_url: href,
            board: href.includes('sme-ipo') || name.toLowerCase().includes('sme') ? 'sme' : 'mainboard'
          })
        }
      }
    })
  }

  return ipos
}

export async function scrapeChittorgarhIPODetail(slug: string) {
  await rateLimit()
  const url = `https://www.chittorgarh.com/ipo/${slug}/`
  const { $, error, blocked } = await fetchHTML(url)

  if (blocked) return { error: 'Blocked by CAPTCHA', url }
  if (error || !$) return { error, url }

  const facts: Record<string, string | number> = {}

  // 1. OVERVIEW TABLE
  $('table tr').each((_, row) => {
    const label = $(row).find('th').text().trim().toLowerCase()
    const value = $(row).find('td').text().trim()
    if (!label || !value) return

    if (label.includes('price band')) {
      facts['price_band'] = value
    } else if (label.includes('lot size')) {
      facts['lot_size'] = parseNumber(value) || value
    } else if (label.includes('issue size')) {
      facts['issue_size_cr'] = parseNumber(value) || value
    } else if (label.includes('ipo open date')) {
      facts['open_date'] = value
    } else if (label.includes('ipo close date')) {
      facts['close_date'] = value
    } else if (label.includes('basis of allotment')) {
      facts['allotment_date'] = value
    } else if (label.includes('initiation of refunds')) {
      facts['refund_date'] = value
    } else if (label.includes('credit of shares')) {
      facts['demat_credit_date'] = value
    } else if (label.includes('ipo listing date')) {
      facts['listing_date'] = value
    } else if (label.includes('face value')) {
      facts['face_value'] = parseNumber(value) || value
    } else if (label.includes('lead manager')) {
      facts['lead_manager'] = value
    } else if (label.includes('registrar')) {
      facts['registrar'] = value
    } else if (label.includes('market maker')) {
      facts['market_maker'] = value
    } else if (label === 'exchange') {
      facts['exchange'] = value
    } else if (label === 'eps' || label === 'pre issue eps' || label === 'post issue eps') {
      if (!facts['eps']) facts['eps'] = value
    } else if (label === 'p/e' || label === 'p/e (x)') {
      if (!facts['ipo_pe']) facts['ipo_pe'] = value
    }
  })

  // 2. FINANCIALS TABLE
  $('table').each((_, table) => {
    const headers = $(table).find('th').map((_, el) => $(el).text().trim().toLowerCase()).get()
    if (headers.includes('revenue') && headers.includes('pat')) {
      $(table).find('tr').each((_, row) => {
        const cols = $(row).find('td').map((_, el) => $(el).text().trim()).get()
        if (cols.length >= headers.length) {
          const period = cols[0]
          if (!period) return
          // extract year (e.g., 31 Mar 2024 -> 24)
          const yearMatch = period.match(/20(\d{2})/)
          const year = yearMatch ? yearMatch[1] : period.substring(0, 4)

          headers.forEach((h, i) => {
            if (h.includes('revenue')) facts[`revenue_fy${year}`] = parseNumber(cols[i]) || cols[i]
            if (h.includes('pat')) facts[`pat_fy${year}`] = parseNumber(cols[i]) || cols[i]
            if (h.includes('ebitda')) facts[`ebitda_fy${year}`] = parseNumber(cols[i]) || cols[i]
            if (h.includes('roe')) facts[`roe_fy${year}`] = parseNumber(cols[i]) || cols[i]
            if (h.includes('roce')) facts[`roce_fy${year}`] = parseNumber(cols[i]) || cols[i]
          })
        }
      })
    }
  })

  // 3. PEER COMPARISON TABLE
  $('table').each((_, table) => {
    const headers = $(table).find('th').map((_, el) => $(el).text().trim().toLowerCase()).get()
    if (headers.includes('company') && headers.includes('p/e') && headers.includes('eps')) {
      const peers: any[] = []
      let peSum = 0
      let peCount = 0
      $(table).find('tr').each((_, row) => {
        const cols = $(row).find('td').map((_, el) => $(el).text().trim()).get()
        if (cols.length >= headers.length) {
          const company = cols[headers.indexOf('company')]
          if (company && !company.toLowerCase().includes('average')) {
            const peStr = cols[headers.indexOf('p/e')]
            const peVal = parseNumber(peStr)
            peers.push({
              company,
              pe: peVal,
              eps: parseNumber(cols[headers.indexOf('eps')])
            })
            if (peVal) {
              peSum += peVal
              peCount++
            }
          }
        }
      })
      if (peers.length > 0) {
        facts['peer_comparison'] = JSON.stringify(peers)
        if (peCount > 0) {
          facts['peer_pe_avg'] = (peSum / peCount).toFixed(2)
        }
      }
    }
  })

  // 4. COMPANY DESCRIPTION
  let desc = ''
  $('h2, h3').each((_, el) => {
    if ($(el).text().toLowerCase().includes('about')) {
      let next = $(el).next()
      while (next.length && !next.is('h2, h3, table')) {
        desc += next.text().trim() + '\n'
        next = next.next()
      }
    }
  })
  if (desc) facts['company_description'] = desc.trim()

  // 5. OBJECTS OF ISSUE
  let objects = ''
  $('h2, h3, strong').each((_, el) => {
    if ($(el).text().toLowerCase().includes('objects of the issue') || $(el).text().toLowerCase().includes('use of proceeds')) {
      let next = $(el).next()
      while (next.length && !next.is('h2, h3, table')) {
        objects += next.text().trim() + '\n'
        next = next.next()
      }
    }
  })
  if (objects) facts['objects_of_issue'] = objects.trim()

  const extractedCount = Object.keys(facts).length

  return {
    facts,
    url,
    low_yield: extractedCount < 5
  }
}
