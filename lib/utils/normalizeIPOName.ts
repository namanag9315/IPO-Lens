export function normalizeIPOName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd|pvt|private|ipo|sme|nse|bse|emerge|india)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd|pvt|private)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '') + '-ipo'
}

export function matchIPOByName(
  rawName: string,
  ipoList: { id: string; name: string; slug: string }[]
): { match: typeof ipoList[0] | null; confidence: string } {
  const normalized = normalizeIPOName(rawName)

  // Exact normalized match
  const exact = ipoList.find(
    ipo => normalizeIPOName(ipo.name) === normalized
  )
  if (exact) return { match: exact, confidence: 'high' }

  // Contains match (one contains the other)
  const contains = ipoList.find(ipo => {
    const n = normalizeIPOName(ipo.name)
    return n.includes(normalized) ||
           normalized.includes(n)
  })
  if (contains) return {
    match: contains, confidence: 'medium'
  }

  // Levenshtein distance match
  let bestMatch = null
  let bestDistance = Infinity

  for (const ipo of ipoList) {
    const d = levenshtein(
      normalized,
      normalizeIPOName(ipo.name)
    )
    if (d < bestDistance) {
      bestDistance = d
      bestMatch = ipo
    }
  }

  if (bestDistance <= 3) return {
    match: bestMatch, confidence: 'low'
  }

  return { match: null, confidence: 'none' }
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from(
    { length: m + 1 },
    (_, i) => Array.from(
      { length: n + 1 },
      (_, j) => i === 0 ? j : j === 0 ? i : 0
    )
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1],
                       dp[i-1][j-1])
  return dp[m][n]
}
