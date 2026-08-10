import { NextResponse } from "next/server";
import { getAdminOrResponse } from "@/lib/admin/api";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin
    .from("ipo_allotment_check_logs")
    .select("id, ipo_id, registrar, check_type, provider, status, checked_at, ipo:ipos(name)")
    .order("checked_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: "Unable to load allotment logs." }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
