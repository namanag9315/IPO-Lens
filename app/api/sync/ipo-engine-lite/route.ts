import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ reason: "Old lite sync disabled. Use clean cron routes under /api/cron/ipo-engine/*.", status: "SKIPPED" });
}

export async function POST() {
  return GET();
}
