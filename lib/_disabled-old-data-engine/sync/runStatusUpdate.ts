import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function runStatusUpdate() {
  const today = new Date().toISOString().split('T')[0]

  // A simplistic status updater
  // upcoming -> open when open_date <= today
  // open -> closed when close_date < today
  // We do not touch listed or cancelled.

  await supabase.from('ipos').update({ status: 'open' }).eq('status', 'upcoming').lte('open_date', today)
  await supabase.from('ipos').update({ status: 'closed' }).eq('status', 'open').lt('close_date', today)

  return { status: 'success' }
}
