/**
 * GET /api/admin/ipos/[id]/source-urls
 * Returns all source URLs for a given IPO from ipo_source_urls_clean.
 *
 * POST /api/admin/ipos/[id]/source-urls
 * Saves a manual admin_override source URL for an IPO.
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { saveSourceUrl } from "@/lib/ipo-engine-clean/source-discovery/resolveSourceUrlForIPO";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from("ipo_source_urls_clean")
    .select("*")
    .eq("ipo_id", params.id)
    .order("provider")
    .order("source_type");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sourceUrls: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider, source_type, source_url, action } = body as {
    provider?: string;
    source_type?: string;
    source_url?: string;
    action?: "save_override" | "reject" | "verify_again";
  };

  if (action === "reject") {
    // Mark a specific URL as rejected
    const { error } = await supabaseAdmin
      .from("ipo_source_urls_clean")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("ipo_id", params.id)
      .eq("provider", provider)
      .eq("source_type", source_type)
      .eq("source_url", source_url);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  if (action === "verify_again") {
    // Re-trigger discovery for this URL — mark as candidate and re-check
    const { error } = await supabaseAdmin
      .from("ipo_source_urls_clean")
      .update({ status: "candidate", updated_at: new Date().toISOString() })
      .eq("ipo_id", params.id)
      .eq("provider", provider)
      .eq("source_type", source_type)
      .eq("source_url", source_url);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "queued_for_reverification" });
  }

  // Default: save_override — admin manually provides a URL
  if (!provider || !source_type || !source_url) {
    return NextResponse.json({ error: "provider, source_type, and source_url are required" }, { status: 400 });
  }

  const allowedProviders = ["CHITTORGARH", "IPOPLATFORM", "FINOLOGY_TICKER", "IPOWATCH", "INVESTORGAIN"];
  if (!allowedProviders.includes(String(provider))) {
    return NextResponse.json({ error: `Invalid provider. Allowed: ${allowedProviders.join(", ")}` }, { status: 400 });
  }

  const ok = await saveSourceUrl({
    ipoId: params.id,
    provider: String(provider),
    sourceType: String(source_type),
    sourceUrl: String(source_url),
    discoveryMethod: "admin_override",
    matchConfidence: 100,
    status: "verified",
  });

  if (!ok) {
    return NextResponse.json({ error: "Failed to save source URL" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: "saved_override" });
}
