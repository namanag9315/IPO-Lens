import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to view notifications.", notifications: [] }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  }

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount: (data ?? []).filter((item) => !item.is_read).length,
  });
}
