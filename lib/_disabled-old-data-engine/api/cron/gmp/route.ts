import { NextResponse } from 'next/server'
import { runGMPSync } from '../../../../lib/sync/runGMPSync'

export const maxDuration = 300

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await runGMPSync()
  return NextResponse.json(result)
}
