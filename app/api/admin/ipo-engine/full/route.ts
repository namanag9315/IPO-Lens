import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { runFullSyncClean } from "@/lib/ipo-engine-clean/sync/runFullSyncClean";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const result = await runFullSyncClean();
  return NextResponse.json({
    ...result,
    message:
      result.status === "skipped"
        ? "Full sync skipped."
        : `Full clean sync completed: ${result.saved} records saved, ${result.skipped} skipped.`,
  });
}
