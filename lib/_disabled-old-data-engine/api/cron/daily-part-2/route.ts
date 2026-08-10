import { NextResponse } from 'next/server'
import { runGMPSync } from '../../../../lib/sync/runGMPSync'
import { runSubscriptionSync } from '../../../../lib/sync/runSubscriptionSync'
import { runDocumentDiscovery } from '../../../../lib/sync/runDocumentDiscovery'
import { runPDFSync } from '../../../../lib/sync/runPDFSync'

export const maxDuration = 300

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const results: any = {}
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

  results.gmp = await runGMPSync()
  await delay(2000)
  results.subscription = await runSubscriptionSync('all')
  await delay(2000)
  results.documents = await runDocumentDiscovery()
  await delay(2000)
  results.pdf = await runPDFSync()

  return NextResponse.json(results)
}
