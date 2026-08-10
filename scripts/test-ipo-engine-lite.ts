import { normalizeIPONameLite } from '../lib/ipo-engine-lite/normalizeIPONameLite'
import { matchIPONameLite } from '../lib/ipo-engine-lite/matchIPONameLite'
import { canCreateIPO } from '../lib/ipo-engine-lite/canCreateIPO'
import { validateFactCandidates } from '../lib/ipo-engine-lite/validateFactCandidates'
import { extractTablesAndText } from '../lib/ipo-engine-lite/extractTablesAndText'

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`)
    passed++
  } else {
    console.error(`  ❌ ${msg}`)
    failed++
  }
}

function section(title: string) {
  console.log(`\n─── ${title} ───`)
}

// ═══════════════════════════════════════════════════
// 1. Normalization Tests
// ═══════════════════════════════════════════════════
section('normalizeIPONameLite')

assert(
  normalizeIPONameLite('Susan Electricals India Ltd') === 'susan electricals india',
  'Keeps "india", strips "ltd"'
)
assert(
  normalizeIPONameLite('Clay Craft (India) Private Limited') === 'clay craft india',
  'Strips brackets, "private limited"; keeps "india"'
)
assert(
  normalizeIPONameLite('Leapfrog Engineering Services SME IPO') === 'leapfrog engineering services',
  'Strips "sme ipo"; keeps "services"'
)
assert(
  normalizeIPONameLite('Utkal Speciality Industries LLP') === 'utkal speciality industries',
  'Strips "llp"; keeps "industries"'
)
assert(
  normalizeIPONameLite('Horizon Reclaim (India) Pvt Ltd') === 'horizon reclaim india',
  'Strips brackets, "pvt ltd"; keeps "india"'
)
assert(
  normalizeIPONameLite('') === '',
  'Empty input returns empty'
)
assert(
  normalizeIPONameLite('ABC & XYZ Ltd') === 'abc and xyz',
  'Replaces & with and'
)

// ═══════════════════════════════════════════════════
// 2. Matching Tests
// ═══════════════════════════════════════════════════
section('matchIPONameLite')

const db = [
  { id: '1', name: 'Susan Electricals India' },
  { id: '2', name: 'Clay Craft India' },
  { id: '3', name: 'Leapfrog Engineering Services' },
  { id: '4', name: 'Horizon Reclaim India' },
  { id: '5', name: 'Utkal Speciality Industries India' },
]
const aliases: { ipo_id: string; normalized_alias: string }[] = [
  { ipo_id: '1', normalized_alias: 'susan electricals' }
]

// Exact match
const exactMatch = matchIPONameLite('Susan Electricals India Ltd', db, [])
assert(exactMatch.confidence === 100 && exactMatch.matchType === 'exact', 'Exact match with suffix stripped')

// Alias match
const aliasMatch = matchIPONameLite('Susan Electricals', db, aliases)
assert(aliasMatch.confidence === 98 && aliasMatch.matchType === 'alias', 'Alias match for shortened name')

// Without alias, "Susan Electricals" vs "Susan Electricals India" should need review (< 85)
const fuzzyMatch = matchIPONameLite('Susan Electricals', db, [])
assert(
  fuzzyMatch.confidence >= 70 && fuzzyMatch.confidence < 85,
  `Susan Electricals vs India needs review (conf=${fuzzyMatch.confidence})`
)

// "Clay Craft" vs "Clay Craft India" without alias — should also need review
const clayMatch = matchIPONameLite('Clay Craft', db, [])
assert(
  clayMatch.confidence >= 60 && clayMatch.confidence < 85,
  `Clay Craft vs India needs review (conf=${clayMatch.confidence})`
)

// Totally different name — should be < 70
const noMatch = matchIPONameLite('Zomato Limited', db, [])
assert(
  noMatch.confidence < 70 || noMatch.ipoId === null,
  `Unrelated name gets no match (conf=${noMatch.confidence})`
)

// ═══════════════════════════════════════════════════
// 3. canCreateIPO Tests
// ═══════════════════════════════════════════════════
section('canCreateIPO')

assert(!canCreateIPO('CHITTORGARH', 'auto_detail'), 'Detail provider cannot create IPO')
assert(!canCreateIPO('INVESTORGAIN', 'auto_gmp'), 'GMP provider cannot create IPO')
assert(!canCreateIPO('IPOWATCH', 'auto_subscription'), 'Subscription provider cannot create IPO')
assert(canCreateIPO('BSE_SME', 'auto_list'), 'BSE SME list can create IPO')
assert(canCreateIPO('admin', 'manual'), 'Admin manual can create IPO')
assert(!canCreateIPO('IPO_PREMIUM', 'auto_detail'), 'IPO Premium detail cannot create IPO')

// ═══════════════════════════════════════════════════
// 4. Validation Tests
// ═══════════════════════════════════════════════════
section('validateFactCandidates')

const candidates = [
  {
    factKey: 'company_description',
    factValue: 'Incorporated in 2015, Susan Electricals India manufactures aluminium and copper-based electrical products including winding wires, conductors and power cables for industrial use.',
    displayValue: 'test',
    confidence: 'high' as const,
    sourceEvidence: 'test'
  },
  {
    factKey: 'company_description',
    factValue: 'NA',
    displayValue: 'test',
    confidence: 'medium' as const,
    sourceEvidence: 'test'
  },
  {
    factKey: 'company_description',
    factValue: 'Short desc.',
    displayValue: 'test',
    confidence: 'medium' as const,
    sourceEvidence: 'test'
  },
  {
    factKey: 'lead_manager_name',
    factValue: 'XYZ Capital Advisors LLP',
    displayValue: 'test',
    confidence: 'high' as const,
    sourceEvidence: 'test'
  },
  {
    factKey: 'lead_manager_name',
    factValue: 'Random Person',
    displayValue: 'test',
    confidence: 'high' as const,
    sourceEvidence: 'test'
  },
  {
    factKey: 'registrar_name',
    factValue: 'Link Intime India Private Limited',
    displayValue: 'test',
    confidence: 'high' as const,
    sourceEvidence: 'test'
  },
  {
    factKey: 'registrar_name',
    factValue: 'Unknown Entity',
    displayValue: 'test',
    confidence: 'high' as const,
    sourceEvidence: 'test'
  },
  {
    factKey: 'unknown_key_xyz',
    factValue: 'something',
    displayValue: 'test',
    confidence: 'high' as const,
    sourceEvidence: 'test'
  },
]

const validated = validateFactCandidates(candidates)

assert(validated[0].validationStatus === 'valid', 'Good long description is valid')
assert(validated[1].validationStatus === 'rejected', 'NA placeholder is rejected')
assert(validated[2].validationStatus === 'rejected', 'Short description (< 80 chars) is rejected')
assert(validated[3].validationStatus === 'valid', 'Lead manager with Capital Advisors is valid')
assert(validated[4].validationStatus === 'warning', 'Lead manager without known suffix gets warning')
assert(validated[5].validationStatus === 'valid', 'Registrar with Link Intime is valid')
assert(validated[6].validationStatus === 'warning', 'Registrar without known name gets warning')
assert(validated[7].validationStatus === 'rejected', 'Unknown fact key is rejected')

// ═══════════════════════════════════════════════════
// 5. Extraction Tests
// ═══════════════════════════════════════════════════
section('extractTablesAndText')

const testHtml = `<html><body>
<h2>IPO Details</h2>
<table>
  <tr><th>Field</th><th>Value</th></tr>
  <tr><td>Registrar</td><td>Link Intime</td></tr>
  <tr><td>Lead Manager</td><td>XYZ Capital</td></tr>
</table>
<script>bad script</script>
<p>Some text content here about the company.</p>
</body></html>`

const extracted = extractTablesAndText(testHtml, true)
assert(extracted.tables.length === 1, 'Extracts 1 table')
assert(extracted.tables[0].rows.length === 2, 'Table has 2 data rows')
assert(!extracted.cleanText.includes('bad script'), 'Scripts are removed from clean text')
assert(extracted.cleanText.includes('text content'), 'Body text is preserved')

const textOnly = extractTablesAndText('Plain text content', false)
assert(textOnly.tables.length === 0, 'Text mode returns no tables')
assert(textOnly.cleanText === 'Plain text content', 'Text mode preserves text')

// ═══════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════
console.log(`\n═══════════════════════════════════════`)
console.log(`  Tests: ${passed + failed} total, ${passed} passed, ${failed} failed`)
console.log(`═══════════════════════════════════════\n`)

if (failed > 0) process.exit(1)
