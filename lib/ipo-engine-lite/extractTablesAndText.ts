import * as cheerio from 'cheerio'

export interface ExtractedTable {
  index: number
  nearbyHeading: string
  headers: string[]
  rows: Record<string, string>[]
  preview: string
}

export function extractTablesAndText(input: string, isHtml: boolean = true) {
  if (!isHtml) {
    // If it's already text, we can't extract structured tables easily without AI,
    // so we just return the clean text and empty tables.
    return {
      cleanText: input.replace(/\s+/g, ' ').trim(),
      tables: [],
      debug: { textLength: input.length, tableCount: 0, headingsFound: 0 }
    }
  }

  const $ = cheerio.load(input)

  // Remove junk
  $('script, style, nav, footer, header, aside, noscript, svg').remove()

  const tables: ExtractedTable[] = []
  let headingsFound = 0

  $('table').each((i, el) => {
    // Find nearby heading by walking previous siblings of the table or its parents
    let heading = ''
    let curr = $(el)

    // Look up to 3 levels up for a preceding heading
    for (let level = 0; level < 3; level++) {
      const prevHeads = curr.prevAll('h1, h2, h3, h4, h5, h6, strong')
      if (prevHeads.length > 0) {
        heading = $(prevHeads[0]).text().replace(/\s+/g, ' ').trim()
        headingsFound++
        break
      }
      curr = curr.parent()
    }

    const headers: string[] = []
    const rows: Record<string, string>[] = []

    // Try to find headers in th or first tr
    const ths = $(el).find('th')
    if (ths.length > 0) {
      ths.each((_, th) => {
        headers.push($(th).text().replace(/\s+/g, ' ').trim() || `col_${headers.length}`)
      })
    } else {
      const firstRowTds = $(el).find('tr').first().find('td')
      firstRowTds.each((_, td) => {
        headers.push($(td).text().replace(/\s+/g, ' ').trim() || `col_${headers.length}`)
      })
    }

    // Ensure unique headers
    const uniqueHeaders = headers.map((h, idx) => h ? h : `col_${idx}`)

    const trs = $(el).find('tr')
    const startIndex = ths.length > 0 ? 0 : 1 // Skip first row if we used it as headers

    trs.slice(startIndex).each((_, tr) => {
      const tds = $(tr).find('td')
      if (tds.length === 0) return

      const rowObj: Record<string, string> = {}
      tds.each((j, td) => {
        const key = uniqueHeaders[j] || `col_${j}`
        rowObj[key] = $(td).text().replace(/\s+/g, ' ').trim()
      })

      // Only push if row has content
      if (Object.values(rowObj).some(v => v.length > 0)) {
        rows.push(rowObj)
      }
    })

    if (rows.length > 0) {
      tables.push({
        index: i,
        nearbyHeading: heading,
        headers: uniqueHeaders,
        rows,
        preview: JSON.stringify(rows.slice(0, 2)) // Preview first 2 rows
      })
    }
  })

  // Get clean text for unstructured extraction
  const cleanText = $('body').text().replace(/\s+/g, ' ').trim()

  return {
    cleanText,
    tables,
    debug: {
      textLength: cleanText.length,
      tableCount: tables.length,
      headingsFound
    }
  }
}
