import { NextResponse } from "next/server";
import { getAdminOrResponse } from "@/lib/admin/api";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request);
  if (admin instanceof Response) return admin;

  const [events, deliveries] = await Promise.all([
    supabaseAdmin.from("notification_events").select("*").order("created_at", { ascending: false }).limit(150),
    supabaseAdmin.from("notification_delivery_logs").select("*").order("created_at", { ascending: false }).limit(150),
  ]);

  if (events.error || deliveries.error) return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  return NextResponse.json({ deliveries: deliveries.data ?? [], events: events.data ?? [] });
}
