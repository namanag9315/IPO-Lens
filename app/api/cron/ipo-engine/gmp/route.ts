import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/auth/cronAuth";
import { runGMPSyncClean } from "@/lib/ipo-engine-clean/sync/runGMPSyncClean";

export async function GET(request: Request) {
  if (!isValidCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runGMPSyncClean();
  return NextResponse.json(result);
}
