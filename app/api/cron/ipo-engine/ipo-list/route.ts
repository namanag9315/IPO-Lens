import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/auth/cronAuth";
import { runIPOListSyncClean } from "@/lib/ipo-engine-clean/sync/runIPOListSyncClean";

export async function GET(request: Request) {
  if (!isValidCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runIPOListSyncClean();
  return NextResponse.json(result);
}
