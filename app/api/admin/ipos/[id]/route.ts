import { NextResponse } from "next/server";
import { getAdminOrResponse, readJsonBody } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_FIELDS = [
  "name",
  "slug",
  "price_band_low",
  "price_band_high",
  "lot_size",
  "issue_size_cr",
  "category",
  "open_date",
  "close_date",
  "allotment_date",
  "listing_date",
  "registrar_name",
  "exchange",
  "status",
] as const;

function cleanPayload(body: Record<string, unknown>) {
  return Object.fromEntries(ALLOWED_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminOrResponse(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const body = await readJsonBody<Record<string, unknown>>(request, {});
  const payload = cleanPayload(body);
  const { data: oldValue } = await supabaseAdmin.from("ipos").select("*").eq("id", params.id).maybeSingle();
  const { data, error } = await supabaseAdmin.from("ipos").update(payload).eq("id", params.id).select("*").single();

  if (error) return NextResponse.json({ error: "Unable to update IPO." }, { status: 500 });
  await logAdminAction({ action: "IPO_UPDATED", admin, entityId: params.id, entityType: "ipo", newValue: data, oldValue });
  return NextResponse.json({ ipo: data, message: "IPO updated." });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminOrResponse(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const { data: oldValue } = await supabaseAdmin.from("ipos").select("*").eq("id", params.id).maybeSingle();
  const { error } = await supabaseAdmin.from("ipos").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Unable to delete IPO." }, { status: 500 });
  await logAdminAction({ action: "IPO_DELETED", admin, entityId: params.id, entityType: "ipo", oldValue });
  return NextResponse.json({ message: "IPO deleted." });
}
