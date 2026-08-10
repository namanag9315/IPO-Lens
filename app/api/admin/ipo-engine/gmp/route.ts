import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { runGMPSyncClean } from "@/lib/ipo-engine-clean/sync/runGMPSyncClean";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const result = await runGMPSyncClean();
  return NextResponse.json({ ...result, message: `GMP clean sync ${result.status}: ${result.saved} records saved.` });
}
