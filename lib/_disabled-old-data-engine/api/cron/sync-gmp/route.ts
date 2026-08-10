import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/auth/cronAuth";
import { runGmpSync } from "@/lib/ipo-data/sync/runGmpSync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isValidCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runGmpSync({ triggeredBy: "vercel_cron" });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "GMP cron sync failed." }, { status: 500 });
  }
}
