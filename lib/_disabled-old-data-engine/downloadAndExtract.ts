import pdf from 'pdf-parse'

export async function downloadPDF(url: string): Promise<{ buffer: Buffer | null; sizeBytes: number; error: string | null }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    // Some basic headers for PDF downloading, similar to fetchHTML
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { buffer: null, sizeBytes: 0, error: `HTTP ${response.status}` }
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return { buffer, sizeBytes: buffer.length, error: null }
  } catch (err: any) {
    return { buffer: null, sizeBytes: 0, error: err.message || 'Unknown download error' }
  }
}

export async function extractPDFText(buffer: Buffer): Promise<{ text: string; pages: number; isTextBased: boolean }> {
  try {
    const data = await pdf(buffer)
    const text = data.text || ''
    const pages = data.numpages || 1

    // OCR Needs detection:
    // If text length is less than pages * 150, it is likely a scanned image-based PDF
    const isTextBased = text.length >= (pages * 150)

    return { text, pages, isTextBased }
  } catch (err) {
    return { text: '', pages: 0, isTextBased: false }
  }
}

export function extractSections(text: string) {
  const sections: Record<string, { rawText: string; charCount: number }> = {}

  const targetSections = [
    {
      key: 'objects_of_issue',
      keywords: ['objects of the issue', 'use of proceeds', 'utilisation of net proceeds', 'objects of this issue'],
      maxLength: 3000
    },
    {
      key: 'risk_factors',
      keywords: ['risk factors', 'risks and concerns'],
      maxLength: 5000
    },
    {
      key: 'promoters',
      keywords: ['our promoters', 'promoters and promoter group', 'details of our promoters'],
      maxLength: 2000
    },
    {
      key: 'business_overview',
      keywords: ['our business', 'overview of our business', 'business overview'],
      maxLength: 2000
    },
    {
      key: 'market_maker',
      keywords: ['market maker', 'market making'],
      maxLength: 500
    },
    {
      key: 'lead_manager',
      keywords: ['lead manager', 'book running lead manager', 'merchant banker'],
      maxLength: 500
    }
  ]

  const lowerText = text.toLowerCase()

  for (const target of targetSections) {
    let bestPos = -1

    // Find the first occurrence of any keyword
    for (const kw of target.keywords) {
      const pos = lowerText.indexOf(kw)
      if (pos !== -1) {
        if (bestPos === -1 || pos < bestPos) {
          bestPos = pos
        }
      }
    }

    if (bestPos !== -1) {
      // Extract from the keyword forwards
      let extracted = text.substring(bestPos, bestPos + target.maxLength)

      // Try to find the next major heading (heuristically checking for typical caps or large breaks)
      // A simplistic heuristic for next major heading: double newlines with caps
      const nextHeadingMatch = extracted.match(/\n\n[A-Z0-9\s-]{5,50}\n/)
      if (nextHeadingMatch && nextHeadingMatch.index) {
        // Only cut if the heading isn't immediately at the start (allow 50 chars breathing room)
        if (nextHeadingMatch.index > 50) {
          extracted = extracted.substring(0, nextHeadingMatch.index)
        }
      }

      const cleaned = extracted.replace(/\s+/g, ' ').trim()
      sections[target.key] = {
        rawText: cleaned,
        charCount: cleaned.length
      }
    }
  }

  return sections
}
