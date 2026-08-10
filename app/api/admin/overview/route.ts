import { NextResponse } from "next/server";
import { getAdminOrResponse } from "@/lib/admin/api";
import { safeCount } from "@/lib/admin/safeQuery";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request);
  if (admin instanceof Response) return admin;

  const [ipos, users, gmpSnapshots, subscriptionSnapshots, syncLogs] = await Promise.all([
    safeCount(supabaseAdmin.from("ipos").select("id", { count: "exact", head: true }).or("is_duplicate.is.null,is_duplicate.eq.false")),
    safeCount(supabaseAdmin.from("user_profiles").select("id", { count: "exact", head: true })),
    safeCount(supabaseAdmin.from("ipo_gmp_snapshots").select("id", { count: "exact", head: true })),
    safeCount(supabaseAdmin.from("ipo_subscription_snapshots").select("id", { count: "exact", head: true })),
    safeCount(supabaseAdmin.from("ipo_data_sync_logs").select("id", { count: "exact", head: true })),
  ]);

  return NextResponse.json({ gmpSnapshots, ipos, subscriptionSnapshots, syncLogs, users });
}
