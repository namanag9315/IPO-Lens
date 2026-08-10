export function normalizeIPONameLite(rawName: string): string {
  if (!rawName) return ''

  let name = rawName.toLowerCase()

  // Replace ampersand
  name = name.replace(/&/g, ' and ')

  // Remove punctuation (except alphanumeric and spaces)
  name = name.replace(/[^a-z0-9\s]/g, ' ')

  // Remove context words
  name = name.replace(/\b(sme ipo|mainboard ipo|ipo)\b/g, ' ')

  // Remove corporate suffixes carefully
  // Ensure we match whole words and handle combinations like "private limited"
  const suffixes = [
    'private limited',
    'pvt ltd',
    'pvt limited',
    'private ltd',
    'limited',
    'ltd',
    'pvt',
    'llp'
  ]

  // We loop to catch multiple suffixes if any, though regex with bounds usually works.
  // Sort by length descending to match longest first
  suffixes.sort((a, b) => b.length - a.length)

  for (const suffix of suffixes) {
    const regex = new RegExp(`\\b${suffix}\\b`, 'g')
    name = name.replace(regex, ' ')
  }

  // Note: We DO NOT remove words like 'india', 'services', 'industries', etc.

  // Collapse spaces and trim
  name = name.replace(/\s+/g, ' ').trim()

  return name
}
