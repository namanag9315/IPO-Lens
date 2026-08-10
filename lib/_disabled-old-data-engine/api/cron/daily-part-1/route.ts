import { NextResponse } from 'next/server'
import { runStatusUpdate } from '../../../../lib/sync/runStatusUpdate'
import { runIPOListSync } from '../../../../lib/sync/runIPOListSync'
import { runDetailSync } from '../../../../lib/sync/runDetailSync'

export const maxDuration = 300

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const results: any = {}
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

  results.statusUpdate = await runStatusUpdate()
  results.ipoList = await runIPOListSync()
  await delay(3000)
  results.detail = await runDetailSync()

  return NextResponse.json(results)
}
