import { createClient } from '@supabase/supabase-js'
import { fetchHTML } from '../http/fetchHTML'
import type { SyncResult } from './runIPOListSync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function discoverFromBseSme(name: string): Promise<string | null> {
  // BSE SME IPODocuments page is heavily ASP.NET driven. We do a simple fetch
  // and regex search or DOM parse for links containing 'DRHP' or 'RHP' near the name.
  const url = 'https://www.bseindia.com/markets/publicIssues/IPODocuments.aspx'
  const { $, error } = await fetchHTML(url)
  if (error || !$) return null

  let foundLink = null
  // Simplified matching
  $('a').each((_, a) => {
    const text = $(a).text().trim().toLowerCase()
    const href = $(a).attr('href')
    if (href && href.toLowerCase().endsWith('.pdf')) {
      // Very naive check: does the row or link contain the IPO name and 'RHP' or 'DRHP'?
      const rowText = $(a).closest('tr').text().trim().toLowerCase()
      // Use fuzzy matching logic for names in real world, but simple includes for now
      const nName = name.toLowerCase().replace(/limited|ltd|pvt|private/g, '').trim()
      if (rowText.includes(nName) && (rowText.includes('rhp') || rowText.includes('drhp'))) {
        foundLink = href.startsWith('http') ? href : `https://www.bseindia.com${href.startsWith('/') ? '' : '/'}${href}`
      }
    }
  })
  return foundLink
}

async function discoverFromChittorgarh(slug: string): Promise<string | null> {
  const url = `https://www.chittorgarh.com/ipo/${slug}/`
  const { $, error } = await fetchHTML(url)
  if (error || !$) return null

  let foundLink = null
  $('a').each((_, a) => {
    const text = $(a).text().trim().toLowerCase()
    const href = $(a).attr('href')
    if (href && (text.includes('download drhp') || text.includes('download rhp') || text.includes('prospectus'))) {
      if (href.toLowerCase().endsWith('.pdf')) {
        foundLink = href
      }
    }
  })
  return foundLink
}

export async function runDocumentDiscovery(): Promise<SyncResult> {
  const start = Date.now()
  const result: SyncResult = {
    syncType: 'document_discovery',
    provider: 'MULTIPLE',
    status: 'success',
    found: 0, saved: 0, skipped: 0, failed: 0,
    durationMs: 0,
    errors: []
  }

  const { data: logEntry } = await supabase
    .from('ipo_sync_log')
    .insert({ sync_type: 'document_discovery', provider: 'MULTIPLE', status: 'running' })
    .select('id').single()

  try {
    // Find IPOs without DRHP/RHP links yet
    const { data: ipos } = await supabase.from('ipos').select('id, name, slug, board').in('status', ['upcoming', 'open', 'closed'])
    if (!ipos) throw new Error('Failed to load IPOs')

    // Find existing links
    const { data: existingLinks } = await supabase.from('ipo_source_links').select('ipo_id, source_type').in('source_type', ['drhp', 'rhp', 'prospectus'])
    const hasDocs = new Set(existingLinks?.map(l => l.ipo_id))

    for (const ipo of ipos) {
      if (hasDocs.has(ipo.id)) {
        result.skipped++
        continue
      }

      let pdfUrl = null
      let provider = ''
      let priority = 70

      try {
        // Try BSE SME if SME
        if (ipo.board === 'sme' && !pdfUrl) {
          const url = await discoverFromBseSme(ipo.name)
          if (url) {
            pdfUrl = url
            provider = 'BSE_SME'
            priority = 95
          }
        }

        // Try Chittorgarh
        if (!pdfUrl) {
          const url = await discoverFromChittorgarh(ipo.slug)
          if (url) {
            pdfUrl = url
            provider = 'CHITTORGARH'
            priority = 90
          }
        }

        if (pdfUrl) {
          result.found++

          const typeMatch = pdfUrl.toLowerCase().includes('rhp') ? 'rhp' : 'drhp'

          await supabase.from('ipo_source_links').insert({
            ipo_id: ipo.id,
            source_type: typeMatch,
            source_provider: provider,
            source_url: pdfUrl,
            source_priority: priority,
            is_official: provider === 'BSE_SME'
          })

          // Queue PDF job immediately
          await supabase.from('ipo_pdf_jobs').insert({
            ipo_id: ipo.id,
            pdf_url: pdfUrl,
            pdf_type: typeMatch,
            status: 'pending'
          })

          result.saved++
        }
      } catch(err: any) {
         result.failed++
         result.errors.push(`Discovery error for ${ipo.slug}: ${err.message}`)
      }
    }

  } catch (err: any) {
    result.status = 'failed'
    result.errors.push(`Fatal Document Discovery error: ${err.message}`)
  }

  result.durationMs = Date.now() - start

  if (logEntry) {
    await supabase.from('ipo_sync_log').update({
      status: result.status,
      found: result.found,
      saved: result.saved,
      skipped: result.skipped,
      failed: result.failed,
      errors: result.errors,
      finished_at: new Date().toISOString(),
      duration_ms: result.durationMs
    }).eq('id', logEntry.id)
  }

  return result
}
