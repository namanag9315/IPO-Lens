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

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin
    .from("ipos")
    .select("*")
    .or("is_duplicate.is.null,is_duplicate.eq.false")
    .order("close_date", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "Unable to load IPOs." }, { status: 500 });
  return NextResponse.json({ ipos: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getAdminOrResponse(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const body = await readJsonBody<Record<string, unknown>>(request, {});
  const payload = cleanPayload(body);

  if (!payload.name || !payload.slug) {
    return NextResponse.json({ error: "IPO name and slug are required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("ipos").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: "Unable to create IPO." }, { status: 500 });
  await logAdminAction({ action: "IPO_CREATED", admin, entityId: data.id, entityType: "ipo", newValue: data });
  return NextResponse.json({ ipo: data, message: "IPO created." });
}
