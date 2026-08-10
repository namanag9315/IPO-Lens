import { NextResponse } from "next/server";
import { getAdminOrResponse, readJsonBody } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin
    .from("ipo_subscription_snapshots")
    .select("*, ipo:ipos(name)")
    .order("captured_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "Unable to load subscription snapshots." }, { status: 500 });
  return NextResponse.json({ snapshots: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminOrResponse(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const body = await readJsonBody<Record<string, unknown>>(request, {});
  const payload = {
    captured_at: typeof body.captured_at === "string" ? body.captured_at : new Date().toISOString(),
    confidence: body.confidence ?? "medium",
    employee_times: num(body.employee_times),
    ipo_id: body.ipo_id,
    nii_times: num(body.nii_times),
    qib_times: num(body.qib_times),
    retail_times: num(body.retail_times),
    shareholder_times: num(body.shareholder_times),
    source: body.source ?? "Manual Override",
    source_type: "manual_override",
    source_url: body.source_url ?? null,
    total_times: num(body.total_times),
  };

  if (!payload.ipo_id) return NextResponse.json({ error: "ipo_id is required." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("ipo_subscription_snapshots").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Unable to save subscription snapshot." }, { status: 500 });
  await logAdminAction({ action: "SUBSCRIPTION_SNAPSHOT_ADDED", admin, entityId: data.id, entityType: "ipo_subscription_snapshot", newValue: data });
  return NextResponse.json({ message: "Subscription snapshot saved.", snapshot: data });
}
