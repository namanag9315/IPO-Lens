import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const preferenceKeys = [
  "ipo_opening_alerts",
  "ipo_closing_alerts",
  "allotment_alerts",
  "listing_alerts",
  "gmp_alerts",
  "subscription_alerts",
  "weekly_digest",
  "email_enabled",
  "watchlist_only",
] as const;

async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to view notification preferences." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to load preferences." }, { status: 500 });
  }

  return NextResponse.json({ preferences: data });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to update notification preferences." }, { status: 401 });
  }

  const body = await readJson(request);
  const updates = Object.fromEntries(preferenceKeys.filter((key) => typeof body[key] === "boolean").map((key) => [key, body[key]]));

  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert({ ...updates, updated_at: new Date().toISOString(), user_id: user.id }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Unable to update preferences." }, { status: 500 });
  }

  return NextResponse.json({ preferences: data });
}
