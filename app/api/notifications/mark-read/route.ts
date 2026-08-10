import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function readJson(request: Request) {
  try {
    return (await request.json()) as { ids?: string[] };
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to update notifications." }, { status: 401 });
  }

  const ids = (await readJson(request)).ids?.filter((id) => typeof id === "string") ?? [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Notification ids are required." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("user_notifications").update({ is_read: true }).eq("user_id", user.id).in("id", ids);

  if (error) {
    return NextResponse.json({ error: "Unable to mark notifications as read." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
