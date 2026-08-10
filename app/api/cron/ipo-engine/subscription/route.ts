import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/auth/cronAuth";
import { runSubscriptionSyncClean } from "@/lib/ipo-engine-clean/sync/runSubscriptionSyncClean";

export async function GET(request: Request) {
  if (!isValidCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSubscriptionSyncClean();
  return NextResponse.json(result);
}
