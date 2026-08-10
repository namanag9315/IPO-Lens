import { normalizeIPONameLite } from './normalizeIPONameLite'

export interface MatchResult {
  ipoId: string | null
  confidence: number
  matchType: "exact" | "alias" | "token" | "fuzzy" | "none"
  reason: string
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function tokenSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean))
  const setB = new Set(b.split(' ').filter(Boolean))
  if (setA.size === 0 && setB.size === 0) return 100
  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  for (const token of Array.from(setA)) {
    if (setB.has(token)) intersection++
  }

  const union = setA.size + setB.size - intersection
  return Math.round((intersection / union) * 100)
}

export function matchIPONameLite(
  rawName: string,
  existingIpos: { id: string; name: string }[],
  aliases: { ipo_id: string; normalized_alias: string }[]
): MatchResult {
  const normalizedRaw = normalizeIPONameLite(rawName)
  if (!normalizedRaw) {
    return { ipoId: null, confidence: 0, matchType: 'none', reason: 'Empty name' }
  }

  // 1. Exact Match
  const exactIpo = existingIpos.find(i => normalizeIPONameLite(i.name) === normalizedRaw)
  if (exactIpo) {
    return { ipoId: exactIpo.id, confidence: 100, matchType: 'exact', reason: 'Exact normalized match' }
  }

  // 2. Alias Match
  const exactAlias = aliases.find(a => a.normalized_alias === normalizedRaw)
  if (exactAlias) {
    return { ipoId: exactAlias.ipo_id, confidence: 98, matchType: 'alias', reason: 'Exact normalized alias match' }
  }

  // 3. Token / Fuzzy Match tracking
  let bestMatch: any = null
  let bestConfidence = 0
  let bestMatchType: MatchResult['matchType'] = 'none'

  for (const ipo of existingIpos) {
    const normIpo = normalizeIPONameLite(ipo.name)

    // Check tokens
    const tokenScore = tokenSimilarity(normalizedRaw, normIpo)

    // Check fuzzy
    const maxLen = Math.max(normalizedRaw.length, normIpo.length)
    const dist = levenshteinDistance(normalizedRaw, normIpo)
    const fuzzyScore = maxLen === 0 ? 100 : Math.round(((maxLen - dist) / maxLen) * 100)

    let currentScore = Math.max(tokenScore, fuzzyScore)
    let currentType: MatchResult['matchType'] = tokenScore >= fuzzyScore ? 'token' : 'fuzzy'

    // Penalize if one string has major words missing (like "India")
    // For example, "Susan Electricals" (2 tokens) vs "Susan Electricals India" (3 tokens) -> Jaccard is 2/3 = 66%.
    // It correctly drops below 85 to force manual review.

    if (currentScore > bestConfidence) {
      bestConfidence = currentScore
      bestMatch = ipo
      bestMatchType = currentType
    }
  }

  if (bestMatch) {
    if (bestConfidence >= 95) {
      return { ipoId: bestMatch.id, confidence: bestConfidence, matchType: bestMatchType, reason: 'High confidence match' }
    } else if (bestConfidence >= 85) {
      return { ipoId: bestMatch.id, confidence: bestConfidence, matchType: bestMatchType, reason: 'Good confidence match, requires unique check' }
    } else if (bestConfidence >= 70) {
      return { ipoId: bestMatch.id, confidence: bestConfidence, matchType: bestMatchType, reason: 'Needs review' }
    }
  }

  return { ipoId: null, confidence: bestConfidence, matchType: 'none', reason: 'No match found above threshold' }
}
