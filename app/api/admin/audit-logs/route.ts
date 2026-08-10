import { NextResponse } from "next/server";
import { getAdminOrResponse } from "@/lib/admin/api";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request, ["view_audit_logs"]);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(250);
  if (error) return NextResponse.json({ error: "Unable to load audit logs." }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
