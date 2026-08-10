import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    reason: "Debug fact seeding is disabled during the clean IPO engine reset.",
    status: "SKIPPED",
  });
}
