import { NextResponse } from "next/server";
import { getAdminOrResponse } from "@/lib/admin/api";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request, ["manage_users"]);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin.from("user_profiles").select("id, email, name, phone, created_at, updated_at").order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}
