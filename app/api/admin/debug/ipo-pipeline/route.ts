import { NextResponse } from 'next/server'
import { debugIPODataPipeline } from '../../../../../lib/diagnostics/debugIPODataPipeline'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const ipoId = searchParams.get('ipoId')

  if (!slug && !ipoId) {
    return NextResponse.json({ error: 'Missing slug or ipoId parameter' }, { status: 400 })
  }

  try {
    const diagnostic = await debugIPODataPipeline({ slug: slug || undefined, ipoId: ipoId || undefined })
    return NextResponse.json(diagnostic)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
