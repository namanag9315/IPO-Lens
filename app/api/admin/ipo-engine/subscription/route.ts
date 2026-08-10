import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { runSubscriptionSyncClean } from "@/lib/ipo-engine-clean/sync/runSubscriptionSyncClean";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const result = await runSubscriptionSyncClean();
  return NextResponse.json({ ...result, message: `Subscription clean sync ${result.status}: ${result.saved} records saved.` });
}
