import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { isAllowedDetailUrl } from "@/lib/ipo-engine-clean/resolveDetailUrlClean";
import { supabaseAdmin } from "@/lib/supabase";
import type { CleanProvider } from "@/lib/ipo-engine-clean/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DETAIL_PROVIDERS = new Set<CleanProvider>(["CHITTORGARH", "IPOPLATFORM", "FINOLOGY_TICKER", "IPOWATCH", "INVESTORGAIN"]);

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { ipoId?: string; provider?: CleanProvider; sourceUrl?: string };
  const provider = body.provider && DETAIL_PROVIDERS.has(body.provider) ? body.provider : "CHITTORGARH";
  if (!body.ipoId || !isAllowedDetailUrl(provider, body.sourceUrl)) {
    return NextResponse.json({ error: `A valid ${provider} detail URL is required.` }, { status: 400 });
  }

  const { data: ipo, error: ipoError } = await supabaseAdmin.from("ipos").select("id,name").eq("id", body.ipoId).maybeSingle();
  if (ipoError || !ipo) {
    return NextResponse.json({ error: "IPO was not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("ipo_source_records_clean").insert({
    matched_ipo_id: ipo.id,
    match_confidence: 100,
    match_type: "admin_override",
    normalized_name: normalizeIPONameClean(ipo.name),
    payload: { addedBy: admin.email, purpose: `manual_${provider.toLowerCase()}_detail_url` },
    processed_at: new Date().toISOString(),
    provider,
    raw_name: ipo.name,
    reason: `Manual ${provider} detail URL override from admin IPO page.`,
    record_type: "detail",
    source_url: body.sourceUrl,
    status: "matched",
  });

  if (error) {
    return NextResponse.json({ error: `Unable to save ${provider} detail URL.` }, { status: 500 });
  }

  return NextResponse.json({ message: `${provider} detail URL saved. Run clean detail sync next.` });
}
