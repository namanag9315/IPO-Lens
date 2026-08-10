import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function test() {
  console.log('Triggering runScheduledSyncLite directly...')
  try {
    const { runScheduledSyncLite } = await import('../lib/ipo-engine-lite/sync/runScheduledSyncLite')
    const summary = await runScheduledSyncLite()
    console.log('\nSync Summary:', JSON.stringify(summary, null, 2))
  } catch (err: any) {
    console.error('Scheduled sync test failed:', err.message)
  }
}

test()
