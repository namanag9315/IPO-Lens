import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { backfillLeadManagerLinks, linkLeadManagerForIPO } from "@/lib/ipo-engine-clean/sync/linkLeadManagersClean";

/**
 * POST /api/admin/ipo-engine/link-lead-managers
 *
 * Body (optional):
 *   { ipoId: string }  → link just this IPO
 *   {}                 → backfill all unlinked IPOs
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const ipoId = typeof body?.ipoId === "string" ? body.ipoId.trim() : null;

  if (ipoId) {
    const result = await linkLeadManagerForIPO(ipoId);
    return NextResponse.json({ ok: true, result });
  }

  const summary = await backfillLeadManagerLinks();
  return NextResponse.json({ ok: true, summary });
}
