import { NextResponse } from "next/server";
import { updateListingPerformanceForListedIPOs } from "@/lib/services/listingPerformance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || !authorization) return false;
  return authorization === cronSecret || authorization === `Bearer ${cronSecret}`;
}

async function updateListingPerformance(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await updateListingPerformanceForListedIPOs();
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update listing performance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return updateListingPerformance(request);
}

export async function POST(request: Request) {
  return updateListingPerformance(request);
}
