import { createClient } from '@supabase/supabase-js'
import { downloadPDF, extractPDFText, extractSections } from '../pdf/downloadAndExtract'
import { saveFact } from '../db/saveFact'
import type { SyncResult } from './runIPOListSync'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function runPDFSync(): Promise<SyncResult> {
  const start = Date.now()
  const result: SyncResult = {
    syncType: 'document_import',
    provider: 'PDF_ENGINE',
    status: 'success',
    found: 0, saved: 0, skipped: 0, failed: 0,
    durationMs: 0,
    errors: []
  }

  const { data: logEntry } = await supabase
    .from('ipo_sync_log')
    .insert({ sync_type: 'document_import', provider: 'PDF_ENGINE', status: 'running' })
    .select('id').single()

  try {
    const { data: jobs } = await supabase
      .from('ipo_pdf_jobs')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .lte('next_attempt_at', new Date().toISOString())
      .limit(5)

    if (!jobs || jobs.length === 0) {
       result.skipped = 0
       // nothing to do
    } else {
      result.found = jobs.length

      for (const job of jobs) {
        let currentAttempts = job.attempts + 1

        try {
          await supabase.from('ipo_pdf_jobs').update({ status: 'downloading', started_at: new Date().toISOString() }).eq('id', job.id)

          const { buffer, sizeBytes, error: dlErr } = await downloadPDF(job.pdf_url)
          if (dlErr || !buffer) throw new Error(`Download failed: ${dlErr}`)

          await supabase.from('ipo_pdf_jobs').update({ status: 'extracting' }).eq('id', job.id)

          const { text, pages, isTextBased } = await extractPDFText(buffer)

          if (!isTextBased) {
             // OCR Needs detection (Fix 3)
             await supabase.from('ipo_pdf_jobs').update({
               status: 'needs_ocr',
               text_length: text.length,
               pages_extracted: pages,
               error_message: `Likely scanned PDF, OCR required.`,
               finished_at: new Date().toISOString()
             }).eq('id', job.id)
             result.skipped++
             continue
          }

          await supabase.from('ipo_pdf_jobs').update({
             status: 'mapping',
             text_length: text.length,
             pages_extracted: pages
          }).eq('id', job.id)

          const sections = extractSections(text)
          let factsSaved = 0

          const priorities: Record<string, number> = {
            business_overview: 80,
            objects_of_issue: 85,
            risk_factors: 85,
            promoters: 85,
            market_maker: 85,
            lead_manager: 85
          }

          for (const [key, section] of Object.entries(sections)) {
            if (section.charCount > 100) {
              const res = await saveFact({
                ipo_id: job.ipo_id,
                fact_key: key,
                raw_value: section.rawText,
                source_provider: job.pdf_type === 'rhp' ? 'PDF_RHP' : 'PDF_DRHP',
                source_url: job.pdf_url,
                source_priority: priorities[key] || 80,
                is_official: true
              })
              if (res.saved) factsSaved++
            }
          }

          await supabase.from('ipo_pdf_jobs').update({
            status: 'success',
            facts_saved: factsSaved,
            finished_at: new Date().toISOString()
          }).eq('id', job.id)

          result.saved += factsSaved

        } catch (err: any) {
          result.failed++
          result.errors.push(`PDF Job ${job.id} failed: ${err.message}`)

          const nextTime = new Date(Date.now() + Math.pow(2, currentAttempts) * 60 * 60 * 1000)
          const newStatus = currentAttempts >= job.max_attempts ? 'failed' : 'pending'

          await supabase.from('ipo_pdf_jobs').update({
             status: newStatus,
             attempts: currentAttempts,
             error_message: err.message,
             next_attempt_at: nextTime.toISOString(),
             finished_at: newStatus === 'failed' ? new Date().toISOString() : null
          }).eq('id', job.id)
        }
      }
    }

  } catch (err: any) {
    result.status = 'failed'
    result.errors.push(`Fatal PDF sync error: ${err.message}`)
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
