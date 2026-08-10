import { NextResponse } from "next/server";
import { getAdminOrResponse } from "@/lib/admin/api";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminOrResponse(request, ["manage_users"]);
  if (admin instanceof Response) return admin;

  const [profile, panProfiles, notifications, allotmentResults] = await Promise.all([
    supabaseAdmin.from("user_profiles").select("id, email, name, phone, created_at, updated_at").eq("id", params.id).maybeSingle(),
    supabaseAdmin.from("user_pan_profiles").select("id, nickname, pan_last4, consent_version, created_at, deleted_at").eq("user_id", params.id),
    supabaseAdmin.from("notification_preferences").select("*").eq("user_id", params.id),
    supabaseAdmin.from("user_allotment_results").select("*").eq("user_id", params.id).order("checked_at", { ascending: false }).limit(100),
  ]);

  if (profile.error) return NextResponse.json({ error: "Unable to load user." }, { status: 500 });
  return NextResponse.json({
    allotmentResults: allotmentResults.data ?? [],
    notifications: notifications.data ?? [],
    panProfiles: panProfiles.data ?? [],
    profile: profile.data,
  });
}
