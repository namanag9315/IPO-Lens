import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const args = process.argv.slice(2)
const isDryRun = !args.includes('--apply')

// Known duplicate pairs from manual observation.
// These are confirmed duplicates where the shorter name is a variant of the longer one.
const KNOWN_DUPLICATE_PAIRS = [
  ['Susan Electricals', 'Susan Electricals India'],
  ['Clay Craft', 'Clay Craft India'],
  ['Leapfrog Engineering', 'Leapfrog Engineering Services'],
  ['Horizon Reclaim', 'Horizon Reclaim (India)'],
  ['Utkal Speciality Industries', 'Utkal Speciality Industries India'],
]

function normalizeForGrouping(name: string): string {
  return name.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')  // remove punctuation
    // Remove ONLY corporate/legal suffixes
    .replace(/\b(private limited|pvt ltd|pvt limited|private ltd|limited|ltd|pvt|llp)\b/g, '')
    // Remove ONLY IPO context words
    .replace(/\b(sme ipo|mainboard ipo|ipo)\b/g, '')
    // Do NOT remove: india, services, industries, engineering, electricals, etc.
    .replace(/\s+/g, ' ')
    .trim()
}

function chooseCanonical(group: any[]): { canonical: any; duplicates: any[] } {
  const sorted = [...group].sort((a, b) => {
    // 1. Prefer admin_verified
    if (a.admin_verified && !b.admin_verified) return -1
    if (!a.admin_verified && b.admin_verified) return 1
    // 2. Prefer the one with a public slug
    if (a.slug && !b.slug) return -1
    if (!a.slug && b.slug) return 1
    // 3. Prefer more complete data (has open_date, price_band_high, etc.)
    const aCompleteness = [a.open_date, a.close_date, a.price_band_high, a.lot_size, a.issue_size_cr].filter(Boolean).length
    const bCompleteness = [b.open_date, b.close_date, b.price_band_high, b.lot_size, b.issue_size_cr].filter(Boolean).length
    if (aCompleteness !== bCompleteness) return bCompleteness - aCompleteness
    // 4. Prefer longer (more official-looking) name
    return b.name.length - a.name.length
  })

  return { canonical: sorted[0], duplicates: sorted.slice(1) }
}

async function run() {
  console.log(`\n╔══════════════════════════════════════╗`)
  console.log(`║  IPO Engine Data Reset Script        ║`)
  console.log(`║  Mode: ${isDryRun ? 'DRY RUN (safe)' : '⚠️  APPLY MODE'}              ║`)
  console.log(`╚══════════════════════════════════════╝\n`)

  // ─── 1. Load all IPOs ──────────────────────────────────
  const { data: ipos, error } = await supabase.from('ipos').select('*')
  if (error || !ipos) {
    console.error('❌ Failed to load IPOs:', error?.message)
    return
  }
  console.log(`Loaded ${ipos.length} IPO records.\n`)

  // ─── 2. Find duplicates by known pairs ─────────────────
  const duplicatePairs: { canonical: any; duplicate: any; reason: string }[] = []

  for (const [shortName, longName] of KNOWN_DUPLICATE_PAIRS) {
    const shortNorm = normalizeForGrouping(shortName)
    const longNorm = normalizeForGrouping(longName)

    const candidates = ipos.filter(ipo => {
      const norm = normalizeForGrouping(ipo.name)
      return norm === shortNorm || norm === longNorm
    })

    if (candidates.length >= 2) {
      const { canonical, duplicates } = chooseCanonical(candidates)
      for (const dup of duplicates) {
        duplicatePairs.push({
          canonical,
          duplicate: dup,
          reason: `Known pair: "${shortName}" / "${longName}"`
        })
      }
    }
  }

  // ─── 3. Find duplicates by normalized name grouping ────
  const groups = new Map<string, any[]>()
  for (const ipo of ipos) {
    if (ipo.is_duplicate || ipo.duplicate_status === 'merged') continue
    const norm = normalizeForGrouping(ipo.name)
    if (!groups.has(norm)) groups.set(norm, [])
    groups.get(norm)!.push(ipo)
  }

  for (const [norm, group] of Array.from(groups.entries())) {
    if (group.length <= 1) continue
    // Check we haven't already handled this pair
    const alreadyHandledIds = new Set(duplicatePairs.flatMap(p => [p.canonical.id, p.duplicate.id]))
    const unhandled = group.filter(ipo => !alreadyHandledIds.has(ipo.id))
    if (unhandled.length <= 1) continue

    const { canonical, duplicates } = chooseCanonical(unhandled)
    for (const dup of duplicates) {
      duplicatePairs.push({
        canonical,
        duplicate: dup,
        reason: `Auto-detected: same normalized name "${norm}"`
      })
    }
  }

  // ─── 4. Report ─────────────────────────────────────────
  if (duplicatePairs.length === 0) {
    console.log('✅ No duplicate candidates found.')
  } else {
    console.log(`Found ${duplicatePairs.length} duplicate pair(s):\n`)
    for (const { canonical, duplicate, reason } of duplicatePairs) {
      console.log(`  📌 CANONICAL:  [${canonical.id.slice(0,8)}] "${canonical.name}"`)
      console.log(`     DUPLICATE:  [${duplicate.id.slice(0,8)}] "${duplicate.name}"`)
      console.log(`     Reason:     ${reason}`)
      console.log(`     Admin verified (dup): ${duplicate.admin_verified || false}`)
      console.log()
    }
  }

  if (isDryRun) {
    console.log(`─── DRY RUN COMPLETE ───`)
    console.log(`Run with --apply to execute the merge.`)
    console.log(`This will NOT delete any rows. It will:`)
    console.log(`  • Set is_duplicate = true on duplicate rows`)
    console.log(`  • Set canonical_ipo_id to point to the canonical row`)
    console.log(`  • Set duplicate_status = 'merged'`)
    console.log(`  • Skip any admin_verified duplicate rows`)
    return
  }

  // ─── 5. Apply merge ────────────────────────────────────
  console.log(`\n⚠️  APPLYING MERGE...\n`)
  let mergedCount = 0
  let skippedCount = 0

  for (const { canonical, duplicate, reason } of duplicatePairs) {
    if (duplicate.admin_verified) {
      console.log(`  ⏭️  Skipping "${duplicate.name}" — admin_verified`)
      skippedCount++
      continue
    }

    console.log(`  Merging "${duplicate.name}" → "${canonical.name}"...`)

    const { error: mergeErr } = await supabase.from('ipos').update({
      is_duplicate: true,
      canonical_ipo_id: canonical.id,
      duplicate_status: 'merged',
      merged_at: new Date().toISOString(),
      merge_notes: reason,
    }).eq('id', duplicate.id)

    if (mergeErr) {
      console.error(`    ❌ Failed: ${mergeErr.message}`)
    } else {
      mergedCount++
      console.log(`    ✅ Merged`)

      // Create alias for the duplicate name
      const { error: aliasErr } = await supabase.from('ipo_aliases_lite').upsert({
        ipo_id: canonical.id,
        alias: duplicate.name,
        normalized_alias: normalizeForGrouping(duplicate.name),
        provider: 'merge_script',
        created_by: 'reset_script',
      }, { onConflict: 'normalized_alias,provider' })

      if (aliasErr) {
        console.log(`    ⚠️  Alias creation skipped: ${aliasErr.message}`)
      }
    }
  }

  console.log(`\n═══ MERGE COMPLETE ═══`)
  console.log(`  Merged: ${mergedCount}`)
  console.log(`  Skipped (admin_verified): ${skippedCount}`)
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
