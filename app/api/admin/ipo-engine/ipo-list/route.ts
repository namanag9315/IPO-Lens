import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { runIPOListSyncClean } from "@/lib/ipo-engine-clean/sync/runIPOListSyncClean";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const result = await runIPOListSyncClean();
  return NextResponse.json({ ...result, message: `IPO list clean sync ${result.status}: ${result.saved} records saved.` });
}
