import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/auth/cronAuth";
import { runFullSyncClean } from "@/lib/ipo-engine-clean/sync/runFullSyncClean";

export async function GET(request: Request) {
  if (!isValidCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runFullSyncClean();
  return NextResponse.json(result);
}
