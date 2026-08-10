import { NextResponse } from "next/server";
import { getAdminOrResponse } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminOrResponse(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const { data: oldValue } = await supabaseAdmin.from("ipo_subscription_snapshots").select("*").eq("id", params.id).maybeSingle();
  const { error } = await supabaseAdmin.from("ipo_subscription_snapshots").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Unable to delete subscription snapshot." }, { status: 500 });
  await logAdminAction({ action: "SUBSCRIPTION_SNAPSHOT_DELETED", admin, entityId: params.id, entityType: "ipo_subscription_snapshot", oldValue });
  return NextResponse.json({ message: "Subscription snapshot deleted." });
}
