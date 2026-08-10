import { NextResponse } from "next/server";
import { getAdminOrResponse, readJsonBody } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin
    .from("ipo_gmp_snapshots")
    .select("*, ipo:ipos(name)")
    .order("captured_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "Unable to load GMP snapshots." }, { status: 500 });
  return NextResponse.json({ snapshots: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminOrResponse(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const body = await readJsonBody<Record<string, unknown>>(request, {});
  const issuePrice = typeof body.issue_price === "number" ? body.issue_price : null;
  const gmp = typeof body.gmp === "number" ? body.gmp : null;
  const payload = {
    captured_at: typeof body.captured_at === "string" ? body.captured_at : new Date().toISOString(),
    confidence: body.confidence ?? "medium",
    estimated_listing_price: typeof body.estimated_listing_price === "number" ? body.estimated_listing_price : issuePrice !== null && gmp !== null ? issuePrice + gmp : null,
    gmp,
    gmp_percent: typeof body.gmp_percent === "number" ? body.gmp_percent : issuePrice && gmp !== null ? Number(((gmp / issuePrice) * 100).toFixed(2)) : null,
    ipo_id: body.ipo_id,
    issue_price: issuePrice,
    source: body.source ?? "Manual Override",
    source_type: "manual_override",
    source_url: body.source_url ?? null,
  };

  if (!payload.ipo_id) return NextResponse.json({ error: "ipo_id is required." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("ipo_gmp_snapshots").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Unable to save GMP snapshot." }, { status: 500 });
  await logAdminAction({ action: "GMP_SNAPSHOT_ADDED", admin, entityId: data.id, entityType: "ipo_gmp_snapshot", newValue: data });
  return NextResponse.json({ message: "GMP snapshot saved.", snapshot: data });
}
