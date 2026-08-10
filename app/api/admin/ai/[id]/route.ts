import { NextResponse } from "next/server";
import { getAdminOrResponse, readJsonBody } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminOrResponse(request, ["manage_ai"]);
  if (admin instanceof Response) return admin;

  const body = await readJsonBody<{ summary?: string }>(request, {});
  const { data: oldValue } = await supabaseAdmin.from("ai_analysis").select("*").eq("id", params.id).maybeSingle();
  const { data, error } = await supabaseAdmin.from("ai_analysis").update(body).eq("id", params.id).select("*").single();
  if (error) return NextResponse.json({ error: "Unable to update AI summary." }, { status: 500 });
  await logAdminAction({ action: "AI_SUMMARY_UPDATED", admin, entityId: params.id, entityType: "ai_analysis", newValue: data, oldValue });
  return NextResponse.json({ message: "AI summary updated.", summary: data });
}
